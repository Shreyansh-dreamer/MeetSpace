const socketIO = require("socket.io");
const mediasoup = require("mediasoup");
const cors = require("cors");
const { Server } = require("socket.io");

const workers = [];
const rooms = new Map();
const routers = new Map();
const hosts = new Map();
const previousHosts = new Map();
const audioLevelObservers = new Map();
const raisedHands = new Map();

const mediaCodecs = [
    { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
    { kind: "video", mimeType: "video/VP8", clockRate: 90000 }
];

async function setupVideoCall(server) {
    // Attach socket.io to the *same* HTTP server
    const io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://localhost:5174"],
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    function emitPeersList(roomName) {
        const peerList = rooms.get(roomName);
        if (!peerList) return;
        const peers = Array.from(peerList.entries()).map(([socketId, peer]) => ({
            socketId,
            profile: peer.profile || {}
        }));
        const hostId = hosts.get(roomName);
        io.to(roomName).emit("peers-list", { peers, hostId });
    }

    // —— mediasoup workers —————————————
    for (let i = 0; i < 2; i++) {
        const worker = await mediasoup.createWorker({
            logLevel: "warn",
            rtcMinPort: 20000 + i * 100,
            rtcMaxPort: 20999 + i * 100,
        });
        workers.push(worker);
        console.log(`Worker ${i} PID ${worker.pid}`);
    }

    io.on("connection", (socket) => {
        let currentRoom = null;

        socket.on("joinRoom", async (data, callback) => {
            const roomName = typeof data === 'string' ? data : data.roomId;
            currentRoom = roomName;
            socket.join(roomName);
            if (!rooms.has(roomName)) {
                const workerIndex = rooms.size % workers.length;
                const router = await workers[workerIndex].createRouter({ mediaCodecs });
                routers.set(roomName, router);
                rooms.set(roomName, new Map());
                hosts.set(roomName, socket.id);
                previousHosts.set(roomName, new Set([socket.id]));
                console.log(`Room ${roomName} using worker ${workerIndex}`);

                //audio detection
                const audioLevelObserver = await router.createAudioLevelObserver({
                    maxEntries: 1,    // track only the loudest speaker (or set to >1 for multi-speaker UI)
                    threshold: -80,   // dBvoip, detection threshold (lower = more sensitive)
                    interval: 500     // ms, how often to emit volume events
                });
                audioLevelObservers.set(roomName, audioLevelObserver);
                // Listen for volume change events
                audioLevelObserver.on("volumes", (volumes) => {
                    // `volumes` is [{ producer, volume }]
                    if (volumes.length > 0) {
                        const { producer, volume } = volumes[0];
                        // Emit to all sockets in the room
                        io.to(roomName).emit("active-speaker", { socketId: producer.socketId, producerId: producer.id, volume });
                    }
                });
                audioLevelObserver.on("silence", () => {
                    // Optionally emit 'no one is speaking'
                    io.to(roomName).emit("active-speaker", { socketId: null });
                });
            }
            previousHosts.get(roomName)?.add(socket.id);
            rooms.get(roomName).set(socket.id, {
                transports: [],
                producers: [],
                consumers: [],
                profile: data.profile || {},
            });
            const router = routers.get(roomName);
            const isHost = hosts.get(roomName) === socket.id;
            emitPeersList(roomName);
            callback(router.rtpCapabilities);
        });

        socket.on("askToJoin", ({ roomId, profile }) => {
            const hostId = hosts.get(roomId);
            console.log("Requesting to join", roomId, "| Host:", hostId, "| Current socket:", socket.id);
            if (!hostId) {
                console.log("No host found for this room.");
                return;
            }
            if (hostId === socket.id) {
                console.log("Requester is the host themselves.");
                return;
            }
            io.to(hostId).emit("askForPermission", { requesterId: socket.id, profile });
            console.log("Emitted askForPermission to", hostId);
        });

        // Host replies
        socket.on("permissionGranted", ({ userId, roomId }) => {
            io.to(userId).emit("permissionGiven", { meetingId: roomId });
        });
        socket.on("permissionDenied", ({ userId }) => {
            io.to(userId).emit("permissionNotGiven");
        })

        socket.on("createWebRtcTransport", async (callback) => {
            try {
                if (!currentRoom || !rooms.has(currentRoom)) return callback({ error: "Room not found" });
                const router = routers.get(currentRoom);
                const peer = rooms.get(currentRoom).get(socket.id);
                const transport = await router.createWebRtcTransport({
                    listenIps: [
                        {
                            ip: "0.0.0.0",              //// Bind to all interfaces (okay for dev)
                            announcedIp: "192.168.73.136" // change during deployment
                        }
                    ],
                    enableUdp: true,
                    enableTcp: true,
                    preferUdp: true
                });
                transport.on('icestatechange', (iceState) => {
                    console.log(`Transport (${transport.id}) ICE state changed to ${iceState}`);
                });
                transport.on('dtlsstatechange', (dtlsState) => {
                    console.log(`Transport (${transport.id}) DTLS state changed to ${dtlsState}`);
                });
                transport.on('connectionstatechange', state => {
                    console.log(`Transport (${transport.id}) connection state: ${state}`);
                });
                peer.transports.push(transport);
                callback({
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters
                });
            } catch (err) {
                console.error("createWebRtcTransport error:", err);
                callback({ error: err.message });
            }
        });

        socket.on("connectTransport", async ({ transportId, dtlsParameters }, callback) => {
            try {
                const room = rooms.get(currentRoom);
                if (!room) return callback({ error: "Room not found" });
                const peer = room.get(socket.id);
                if (!peer) return callback({ error: "Peer not found" });
                const transport = peer.transports.find(t => t.id === transportId);
                if (!transport) return callback({ error: "Transport not found" });
                await transport.connect({ dtlsParameters });
                callback();
            } catch (err) {
                console.error("connectTransport error:", err);
                callback({ error: err.message });
            }
        });

        // FIX: Updated produce handler to properly extract isScreenShare from appData
        socket.on("produce", async ({ transportId, kind, rtpParameters, paused, isScreenShare, appData }, callback) => {
            try {
                const room = rooms.get(currentRoom);
                if (!room) return callback({ error: "Room not found" });
                const peer = room.get(socket.id);
                if (!peer) return callback({ error: "Peer not found" });
                const transport = peer.transports.find(t => t.id === transportId);
                if (!transport) return callback({ error: "Transport not found" });

                // Create producer
                const producer = await transport.produce({ kind, rtpParameters, paused: false, appData });

                if (kind === "audio") {
                    const audioLevelObserver = audioLevelObservers.get(currentRoom);
                    if (audioLevelObserver) {
                        await audioLevelObserver.addProducer({ producerId: producer.id });
                    }
                }

                // FIX: Get isScreenShare from multiple possible sources with proper priority
                const finalIsScreenShare = Boolean(
                    appData?.isScreenShare || // First check appData (most reliable)
                    isScreenShare ||          // Then check direct parameter
                    false
                );

                // Store screen share info with the producer
                producer.isScreenShare = finalIsScreenShare;
                producer.kind = kind;
                producer.socketId = socket.id; // Store socket ID for easier lookup

                peer.producers.push(producer);

                console.log(`Producer created: ${producer.id}, kind: ${kind}, isScreenShare: ${producer.isScreenShare}, socketId: ${socket.id}`);

                // Emit to other participants with proper isScreenShare flag
                socket.to(currentRoom).emit("newProducer", {
                    producerId: producer.id,
                    socketId: socket.id,
                    kind,
                    isScreenShare: producer.isScreenShare // Use the stored flag
                });

                callback({ id: producer.id });
            } catch (err) {
                console.error("produce error:", err);
                callback({ error: err.message });
            }
        });

        socket.on("getExistingProducers", ({ roomId }, callback) => {
            const peerList = rooms.get(roomId);
            if (!peerList) return callback([]);
            const producers = [];
            for (const [id, peer] of peerList.entries()) {
                if (id !== socket.id) {
                    for (const p of peer.producers) {
                        producers.push({
                            producerId: p.id,
                            socketId: id,
                            kind: p.kind,
                            isScreenShare: Boolean(p.isScreenShare) // Ensure boolean conversion
                        });
                    }
                }
            }
            console.log(`Existing producers for ${socket.id}:`, producers);
            callback(producers);
        });

        socket.on("consume", async ({ transportId, producerId, rtpCapabilities }, callback) => {
            try {
                const router = routers.get(currentRoom);
                if (!router) return callback({ error: "Router not found" });
                const room = rooms.get(currentRoom);
                if (!room) return callback({ error: "Room not found" });
                const peer = room.get(socket.id);
                if (!peer) return callback({ error: "Peer not found" });
                const transport = peer.transports.find(t => t.id === transportId);
                if (!transport) return callback({ error: "Transport not found" });

                if (!router.canConsume({ producerId, rtpCapabilities })) {
                    console.warn('Can NOT consume:', {
                        producerId,
                        rtpCapabilities: rtpCapabilities ? "present" : "missing",
                        routerCaps: router.rtpCapabilities ? "present" : "missing"
                    });
                    return callback({ error: "Can't consume" });
                }

                const consumer = await transport.consume({ producerId, rtpCapabilities, paused: true });
                consumer.on('transportclose', () => console.log('Consumer transport closed:', consumer.id));
                consumer.on('producerclose', () => console.log('Producer closed:', consumer.id));
                consumer.on('pause', () => console.log('Consumer paused:', consumer.id));
                consumer.on('resume', () => console.log('Consumer resumed:', consumer.id));

                // FIX: Better producer lookup with proper isScreenShare detection
                let isScreenShare = false;
                let originalProducer = null;
                for (const [socketId, peerData] of room.entries()) {
                    const producer = peerData.producers.find(p => p.id === producerId);
                    if (producer) {
                        isScreenShare = Boolean(producer.isScreenShare);
                        originalProducer = producer;
                        console.log(`Found producer ${producerId} with isScreenShare: ${isScreenShare}`);
                        break;
                    }
                }

                peer.consumers.push(consumer);

                console.log(`Consumer created: ${consumer.id} for producer: ${producerId}, kind: ${consumer.kind}, isScreenShare: ${isScreenShare}`);

                callback({
                    producerId,
                    id: consumer.id,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                    type: consumer.type,
                    isScreenShare: isScreenShare // Return proper boolean value
                });
            } catch (err) {
                console.error("consume error:", err);
                callback({ error: err.message });
            }
        });

        socket.on("resumeConsumer", async ({ consumerId }, callback) => {
            try {
                console.log("Resuming consumer:", consumerId);
                const peer = rooms.get(currentRoom)?.get(socket.id);
                if (!peer) {
                    console.error("Peer not found for resumeConsumer");
                    if (callback) callback({ error: "Peer not found" });
                    return;
                }
                const consumer = peer.consumers.find(c => c.id === consumerId);
                if (!consumer) {
                    console.error("Consumer not found:", consumerId);
                    if (callback) callback({ error: "Consumer not found" });
                    return;
                }
                console.log("Consumer paused before resume:", consumer.paused);
                await consumer.resume();
                console.log("Consumer resumed successfully:", consumerId);
                console.log("Consumer paused after resume:", consumer.paused);

                if (callback) callback({ success: true });
            } catch (error) {
                console.error("Error resuming consumer:", error);
                if (callback) callback({ error: error.message });
            }
        });

        // FIX: Added producer pause/resume handlers for proper video toggle
        socket.on("pauseProducer", ({ producerId }) => {
            const peer = rooms.get(currentRoom)?.get(socket.id);
            if (!peer) return;

            const producer = peer.producers.find(p => p.id === producerId);
            if (producer && !producer.closed) {
                producer.pause();
                console.log(`Producer ${producerId} paused by ${socket.id}`);

                // Notify other peers about the pause
                socket.to(currentRoom).emit("producerPaused", {
                    producerId,
                    socketId: socket.id,
                    kind: producer.kind,
                    isScreenShare: producer.isScreenShare
                });
            }
        });

        socket.on("resumeProducer", ({ producerId }) => {
            const peer = rooms.get(currentRoom)?.get(socket.id);
            if (!peer) return;

            const producer = peer.producers.find(p => p.id === producerId);
            if (producer && !producer.closed) {
                producer.resume();
                console.log(`Producer ${producerId} resumed by ${socket.id}`);

                // Notify other peers about the resume
                socket.to(currentRoom).emit("producerResumed", {
                    producerId,
                    socketId: socket.id,
                    kind: producer.kind,
                    isScreenShare: producer.isScreenShare
                });
            }
        });

        socket.on("producerClosed", ({ producerId }) => {
            console.log(`Producer ${producerId} closed by ${socket.id}`);
            socket.to(currentRoom).emit("producerClosed", { producerId, socketId: socket.id });

            const peer = rooms.get(currentRoom)?.get(socket.id);
            if (!peer) return;

            // Remove from observer if it's audio
            const producer = peer.producers.find(p => p.id === producerId);
            if (producer && producer.kind === "audio") {
                const audioLevelObserver = audioLevelObservers.get(currentRoom);
                if (audioLevelObserver) {
                    audioLevelObserver.removeProducer({ producerId });
                }
            }

            // Remove consumer(s) pointing to that producer from ALL peers
            const room = rooms.get(currentRoom);
            if (room) {
                for (const [peerId, peerData] of room.entries()) {
                    peerData.consumers = peerData.consumers.filter(c => {
                        if (c.producerId !== producerId) return true;
                        try { c.close(); } catch (_) { }
                        return false;
                    });
                }
            }

            // Remove the producer from the current peer's list
            peer.producers = peer.producers.filter(p => p.id !== producerId);
        });

        socket.on("send-message", ({ roomId, message }) => {
            io.to(roomId).emit("receive-message", message);
        });

        socket.on("raising", ({ roomId, raiseHands }) => {
            if (!raisedHands.has(roomId)) {
                raisedHands.set(roomId, new Set());
            }
            const roomHands = raisedHands.get(roomId);
            if (raiseHands) {
                roomHands.add(socket.id);
            } else {
                roomHands.delete(socket.id);
            }
            io.to(roomId).emit("hand-raising", {
                socketId: socket.id,
                raiseHands
            });
            io.to(roomId).emit("hands-update", {
                raisedHands: Array.from(roomHands)
            });
        });


        socket.on("disconnect", () => {
            if (currentRoom && rooms.has(currentRoom)) {
                const peer = rooms.get(currentRoom).get(socket.id);
                if (!peer) return;

                // Close all consumers and producers
                peer.consumers.forEach(consumer => consumer.close());
                peer.producers.forEach(producer => {
                    producer.close();
                    socket.to(currentRoom).emit("producerClosed", { producerId: producer.id, socketId: socket.id });
                });
                peer.transports.forEach(transport => transport.close());

                rooms.get(currentRoom).delete(socket.id);
                emitPeersList(currentRoom);

                // Handle host change
                if (hosts.get(currentRoom) === socket.id) {
                    const peers = Array.from(rooms.get(currentRoom).keys())
                        .filter(id => id !== socket.id);

                    if (peers.length > 0) {
                        const randomIndex = Math.floor(Math.random() * peers.length);
                        const newHost = peers[randomIndex];
                        hosts.set(currentRoom, newHost);

                        io.to(newHost).emit("youAreHostNow");
                        io.to(currentRoom).emit("hostChanged", { newHostId: newHost });
                        emitPeersList(currentRoom);
                    }
                }

                // Clean up empty room
                if (rooms.get(currentRoom).size === 0) {
                    rooms.delete(currentRoom);
                    routers.delete(currentRoom);
                    hosts.delete(currentRoom);
                    const observer = audioLevelObservers.get(currentRoom);
                    if (observer) {
                        observer.close();
                        audioLevelObservers.delete(currentRoom);
                    }
                }
            }
        });

        socket.on("reclaimHost", ({ roomId }) => {
            if (previousHosts.get(roomId)?.has(socket.id)) {
                hosts.set(roomId, socket.id);
                io.to(roomId).emit("hostChanged", { newHostId: socket.id });
                emitPeersList(currentRoom);
            }
        });
    })
    return io;
}

module.exports = setupVideoCall;