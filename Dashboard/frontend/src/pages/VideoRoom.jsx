import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import PermissionPopup from "./PermissionPopup.jsx"
import * as mediasoupClient from "mediasoup-client";
import { IconButton, Tooltip, Box, Typography, Snackbar, Alert } from "@mui/material";
import { Videocam, VideocamOff, Mic, MicOff, ScreenShare, StopScreenShare } from "@mui/icons-material";
import Cached from '@mui/icons-material/Cached';
import ChatIcon from "@mui/icons-material/Chat";
import BackHandIcon from '@mui/icons-material/BackHand';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import CallEndIcon from '@mui/icons-material/CallEnd';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { X as CloseIcon, ChevronLeft, ChevronRight, MoreHorizontal as MoreHoriz, Users } from "lucide-react";
import ChatSection from "./ChatSection"
import CopyLink from "./CopyLink"

let device;
let sendTransport;
let recvTransport;
let currentProducers = {};
let currentConsumers = {};

const VideoRoom = () => {
  const { id: roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isHost = location.state?.isHost || false;
  const isVideoOn = location.state?.isVideoOn ?? true;
  const isAudioOn = location.state?.isAudioOn ?? true;
  const selectedDevices = location.state?.selectedDevices || {};
  const userProfile = location.state?.userProfile || {}

  const [pinnedProducerId, setPinnedProducerId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [joined, setJoined] = useState(true);
  const [videoPaused, setVideoPaused] = useState(!isVideoOn);
  const [audioPaused, setAudioPaused] = useState(!isAudioOn);
  const [screenSharing, setScreenSharing] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [screenAudioPaused, setScreenAudioPaused] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [showPermissionPopup, setShowPermissionPopup] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [peers, setPeers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [ishost, setIshost] = useState(isHost);
  const [showLink, setShowLink] = useState(false);
  const [remoteVideos, setRemoteVideos] = useState({});
  const [localVideoStream, setLocalVideoStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [remotePeerVideoStates, setRemotePeerVideoStates] = useState({});
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [raiseHands, setRaiseHands] = useState(false);
  const [handList, setHandList] = useState([]);
  const videoRefs = useRef({});

  const [currentPage, setCurrentPage] = useState(0);
  const [maxVisibleVideos, setMaxVisibleVideos] = useState(6);
  const [gridLayout, setGridLayout] = useState({ cols: 3, rows: 2 });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isTouchDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isSmallScreen = window.innerWidth <= 768;
    setIsMobile(isTouchDevice && isSmallScreen);
  }, []);

  useEffect(() => { //listen for when the user disconnects
    const handleDisconnect = () => {
      navigate('/');
    };
    socket.on('disconnect', handleDisconnect);
    return () => {
      socket.off('disconnect', handleDisconnect);
    };
  }, [navigate]);

  useEffect(() => {
    // Listen for host changes
    socket.on("hostChanged", ({ newHostId }) => {
      setHostId(newHostId); // Update your host state
      console.log("Host changed to:", newHostId);
    });

    // Listen if you become the host
    socket.on("youAreHostNow", () => {
      console.log("You are now the host!");
      setIshost(true);
    });

    return () => {
      socket.off("hostChanged");
      socket.off("youAreHostNow");
    };
  }, []);

  // Function to reclaim host (if you were a previous host)
  const reclaimHost = () => {
    socket.emit("reclaimHost", { roomId });
  };


  useEffect(() => {
    const updateGridSize = () => {
      const sidebarOpen = showChat || showLink;
      const windowWidth = window.innerWidth;

      if (windowWidth <= 768 && sidebarOpen) {
        setMaxVisibleVideos(0);
        setGridLayout({ cols: 0, rows: 0 });
        return;
      }

      let availableWidth = windowWidth;
      if (sidebarOpen && windowWidth > 768) {
        availableWidth = windowWidth - 320;
      }

      let maxVideos, cols, rows;

      if (availableWidth < 480) {
        maxVideos = 1;
        cols = 1;
        rows = 1;
      } else if (availableWidth < 600) {
        maxVideos = 2;
        cols = 1;
        rows = 2;
      } else if (availableWidth < 840) {
        maxVideos = (pinnedProducerId != null) ? 5 : 4;
        cols = 2;
        rows = 2;
      } else if (availableWidth < 1200) {
        maxVideos = 6;
        cols = 3;
        rows = 2;
      } else if (availableWidth < 1600) {
        maxVideos = (pinnedProducerId != null) ? 6 : 6;
        cols = 3;
        rows = (pinnedProducerId != null) ? 3 : 2;
      } else {
        maxVideos = (pinnedProducerId != null) ? 7 : 8;
        cols = 4;
        rows = 2;
      }

      setMaxVisibleVideos(maxVideos);
      setGridLayout({ cols, rows });
    };

    updateGridSize();
    window.addEventListener('resize', updateGridSize);
    return () => window.removeEventListener('resize', updateGridSize);
  }, [showChat, showLink]);


  useEffect(() => {
    function handleActiveSpeaker({ socketId, producerId, volume }) {
      setActiveSpeaker(socketId);
    }
    socket.on("active-speaker", handleActiveSpeaker);
    return () => socket.off("active-speaker", handleActiveSpeaker);
  }, [socket]);


  const showRecoveryAlert = (message) => {
    setAlertMessage(message);
    setAlertOpen(true);
  };

  useEffect(() => {
    socket.on("askForPermission", ({ requesterId, profile }) => {
      console.log("askForPermission received", profile);
      setCurrentRequest({ requesterId, profile });
      setShowPermissionPopup(true);
    });
    return () => {
      socket.off("askForPermission");
    };
  }, []);

  useEffect(() => {
    function handleReceive({ user, text }) {
      setChatMessages(prev => [...prev, { user, text }]);
    }
    socket.on("receive-message", handleReceive);
    return () => socket.off("receive-message", handleReceive);
  }, []);

  useEffect(() => {
    function handleHandRaisedList({ socketId, raiseHands }) {
      setHandList(prev => {
        if (raiseHands) {
          return prev.includes(socketId) ? prev : [...prev, socketId];
        } else {
          return prev.filter(id => id !== socketId);
        }
      });
    }
    socket.on("hand-raising", handleHandRaisedList);
    return () => socket.off("hand-raising", handleHandRaisedList);
  }, []);


  useEffect(() => {
    function handleHandsUpdate({ raisedHands }) {
      setHandList(raisedHands);
    }
    socket.on("hands-update", handleHandsUpdate);
    return () => socket.off("hands-update", handleHandsUpdate);
  }, []);


  useEffect(() => {
    function handlePeersList(data) {
      if (data.peers) setPeers(data.peers);
      if (data.hostId) setHostId(data.hostId);
    }
    socket.on("peers-list", handlePeersList);
    return () => {
      socket.off("peers-list", handlePeersList);
    };
  }, [roomId]);

  const handleApprove = async () => {
    socket.emit("permissionGranted", { userId: currentRequest.requesterId, roomId });
    setShowPermissionPopup(false);
  };

  const handleDeny = async () => {
    socket.emit("permissionDenied", { userId: currentRequest.requesterId });
    setShowPermissionPopup(false);
  };

  const recoverVideo = async () => {
    try {
      showRecoveryAlert("Attempting to recover video...");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const fallbackCamera = devices.find(d => d.kind === "videoinput");
      if (!fallbackCamera) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: fallbackCamera.deviceId }
      });
      const newTrack = stream.getVideoTracks()[0];
      const producer = currentProducers["video"];
      if (producer) {
        await producer.replaceTrack({ track: newTrack });
        console.log("Replaced video track after disconnection");
        setLocalVideoStream(new MediaStream([newTrack]));
      }
    } catch (err) {
      console.error("Failed to recover video:", err);
    }
  };

  const recoverAudio = async () => {
    try {
      showRecoveryAlert("Attempting to recover audio...");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const fallbackMic = devices.find(d => d.kind === "audioinput");
      if (!fallbackMic) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: fallbackMic.deviceId }
      });
      const newTrack = stream.getAudioTracks()[0];
      const producer = currentProducers["audio"];

      if (producer) {
        await producer.replaceTrack({ track: newTrack });
        console.log("Replaced audio track after disconnection");
      }
    } catch (err) {
      console.error("Failed to recover audio:", err);
    }
  };

  const flipCamera = async () => {
    try {
      const newFacing = facingMode === "user" ? "environment" : "user";
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: newFacing } }
      });
      const newTrack = stream.getVideoTracks()[0];

      newTrack.onended = () => {
        console.warn("Flipped video track ended");
        recoverVideo();
      };

      const producer = currentProducers["video"];
      if (producer) {
        await producer.replaceTrack({ track: newTrack });
        console.log("Camera flipped");
        setLocalVideoStream(new MediaStream([newTrack]));
        setFacingMode(newFacing);
      }
    } catch (err) {
      console.error("Failed to flip camera:", err);
      alert("Flip camera failed. Maybe unsupported on this device.");
    }
  };


  const toggleVideo = async () => {
    let videoProducer = currentProducers["video"];

    if (!videoProducer) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDevices?.camera ? { exact: selectedDevices.camera } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        const videoTrack = stream.getVideoTracks()[0];

        videoTrack.onended = () => {
          console.warn("Video track ended — attempting recovery...");
          recoverVideo();
        };
        videoProducer = await sendTransport.produce({
          track: videoTrack,
          appData: { isScreenShare: false }
        });
        currentProducers["video"] = videoProducer;
        setLocalVideoStream(new MediaStream([videoTrack]));
        setVideoPaused(false);
      } catch (err) {
        alert("Camera permission denied or error: " + err.message);
        return;
      }
    } else {
      if (videoProducer.paused) {
        await videoProducer.resume();
        socket.emit("resumeProducer", { producerId: videoProducer.id });
        setVideoPaused(false);

        if (videoProducer.track) {
          setLocalVideoStream(new MediaStream([videoProducer.track]));
        }
      } else {
        // Pause video
        await videoProducer.pause();
        socket.emit("pauseProducer", { producerId: videoProducer.id });
        setVideoPaused(true);
        setLocalVideoStream(null);
      }
    }
  };

  const toggleAudio = async () => {
    let audioProducer = currentProducers["audio"];

    if (!audioProducer) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedDevices?.microphone ? { exact: selectedDevices.microphone } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        const audioTrack = stream.getAudioTracks()[0];

        audioTrack.onended = () => {
          console.warn("Audio track ended — attempting recovery...");
          recoverAudio();
        };

        audioProducer = await sendTransport.produce({
          track: audioTrack,
          appData: { isScreenShare: false }
        });
        currentProducers["audio"] = audioProducer;
        setAudioPaused(false);
      } catch (err) {
        alert("Mic permission denied or error: " + err.message);
        return;
      }
    } else {
      if (audioProducer.paused) {
        await audioProducer.resume();
        setAudioPaused(false);
      } else {
        await audioProducer.pause();
        setAudioPaused(true);
      }
    }
  };

  const raise = () => {
    const newRaiseState = !raiseHands;
    setRaiseHands(newRaiseState);
    //updating list locally too
    if (newRaiseState) {
      setHandList(prev =>
        prev.includes(socket.id) ? prev : [...prev, socket.id]
      );
    } else {
      setHandList(prev => prev.filter(id => id !== socket.id));
    }
    socket.emit("raising", { roomId, raiseHands: newRaiseState });
  };


  const endCall = () => {
    socket.disconnect(); // Will trigger 'disconnect' event
  };


  const shareScreen = async (withAudio = false) => {
    if (screenSharing) {
      // Stop screen sharing
      for (const tag of ["screen", "screenAudio"]) {
        if (currentProducers[tag]) {
          const id = currentProducers[tag].id;
          await currentProducers[tag].close();
          delete currentProducers[tag];
          socket.emit("producerClosed", { producerId: id });
        }
      }
      setScreenSharing(false);
      setLocalScreenStream(null);
      return;
    }

    try {
      const constraints = { video: true, audio: withAudio };
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      const videoTrack = stream.getVideoTracks()[0];

      setLocalScreenStream(stream);

      const videoProducer = await sendTransport.produce({
        track: videoTrack,
        appData: { isScreenShare: true }
      });
      currentProducers["screen"] = videoProducer;
      setScreenSharing(true);

      videoTrack.onended = async () => {
        console.log("Screen share ended");
        if (currentProducers["screen"]) {
          const id = currentProducers["screen"].id;
          await currentProducers["screen"].close();
          delete currentProducers["screen"];
          socket.emit("producerClosed", { producerId: id });
        }

        if (currentProducers["screenAudio"]) {
          const audioId = currentProducers["screenAudio"].id;
          await currentProducers["screenAudio"].close();
          delete currentProducers["screenAudio"];
          socket.emit("producerClosed", { producerId: audioId });
        }

        setScreenSharing(false);
        setLocalScreenStream(null);
      };

      // screen share audio if requested
      if (withAudio) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          const audioProducer = await sendTransport.produce({
            track: audioTrack,
            appData: { isScreenShare: true }
          });
          currentProducers["screenAudio"] = audioProducer;
        }
      }
    } catch (err) {
      console.error("Screen share failed:", err);
      setScreenSharing(false);
      setLocalScreenStream(null);
    }
  };

  useEffect(() => {
    const handleJoin = async () => {
      if (!roomId.trim()) return;

      socket.on("newProducer", ({ producerId, socketId, kind, isScreenShare, appData }) => {
        console.log("New producer received:", producerId, socketId, kind, "isScreenShare:", isScreenShare, "appData:", appData);
        // Use appData.isScreenShare if available, fallback to isScreenShare field
        const finalIsScreenShare = appData?.isScreenShare ?? Boolean(isScreenShare);
        consumeNewProducer(producerId, socketId, kind, finalIsScreenShare);
      });

      socket.on("producerClosed", ({ producerId, socketId }) => {
        console.log("Producer closed:", producerId, "from socket:", socketId);

        const closedVideoData = remoteVideos[producerId];

        setRemoteVideos(prev => {
          const updated = { ...prev };
          delete updated[producerId];
          return updated;
        });

        if (closedVideoData && closedVideoData.socketId && !closedVideoData.isScreenShare) {
          // Check if this peer has any other video
          const hasOtherVideoFeeds = Object.values(remoteVideos).some(
            video => video.socketId === closedVideoData.socketId &&
              video.producerId !== producerId &&
              !video.isScreenShare
          );
          if (!hasOtherVideoFeeds) {
            setRemotePeerVideoStates(prev => ({
              ...prev,
              [closedVideoData.socketId]: { hasVideo: false, videoPaused: true }
            }));
          }
        }
        if (videoRefs.current[producerId]) {
          delete videoRefs.current[producerId];
        }

        if (currentConsumers[producerId]) {
          currentConsumers[producerId].close();
          delete currentConsumers[producerId];
        }

        const audioElement = document.getElementById(producerId);
        if (audioElement) {
          audioElement.remove();
        }
      });


      socket.on("producerPaused", ({ producerId, socketId, kind, isScreenShare }) => {
        console.log("Producer paused:", producerId, "from socket:", socketId);
        if (kind === "video" && !isScreenShare) {
          // Update remote peer video state for regular video (not screen share)
          setRemotePeerVideoStates(prev => ({
            ...prev,
            [socketId]: { hasVideo: false, videoPaused: true }
          }));
          // Remove from remoteVideos but keep the consumer for when it resumes
          setRemoteVideos(prev => {
            const updated = { ...prev };
            if (updated[producerId]) {
              // Keep the consumer but mark as paused
              updated[producerId].isPaused = true;
            }
            return updated;
          });
        }
      });

      socket.on("producerResumed", ({ producerId, socketId, kind, isScreenShare }) => {
        console.log("Producer resumed:", producerId, "from socket:", socketId);
        if (kind === "video" && !isScreenShare) {
          setRemotePeerVideoStates(prev => ({
            ...prev,
            [socketId]: { hasVideo: true, videoPaused: false }
          }));
          setRemoteVideos(prev => {
            const updated = { ...prev };
            if (updated[producerId]) {
              updated[producerId].isPaused = false;
            }
            return updated;
          });
        }
      });


      const rtpCapabilities = await new Promise((resolve, reject) => {
        socket.emit("joinRoom", { roomId, profile: userProfile }, (res) => {
          if (res.error) reject(res.error);
          else resolve(res);
        });
      });
      device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      sendTransport = await createSendTransport();
      recvTransport = await createRecvTransport();
      await produceMedia();
      setJoined(true);
      const existingProducers = await new Promise((res) =>
        socket.emit("getExistingProducers", { roomId }, res)
      );
      for (const { producerId, socketId, kind, isScreenShare, appData } of existingProducers) {
        // Use appData.isScreenShare if available, fallback to isScreenShare field
        const finalIsScreenShare = appData?.isScreenShare ?? Boolean(isScreenShare);
        console.log(`Processing existing producer: ${producerId}, kind: ${kind}, isScreenShare: ${finalIsScreenShare}, appData:`, appData);
        consumeNewProducer(producerId, socketId, kind, finalIsScreenShare);
      }
    };

    const createSendTransport = async () => {
      const transportOptions = await new Promise((res) =>
        socket.emit("createWebRtcTransport", res)
      );
      const transport = device.createSendTransport(transportOptions);

      transport.on("connect", ({ dtlsParameters }, callback) => {
        socket.emit("connectTransport", { transportId: transport.id, dtlsParameters }, callback);
      });

      transport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
        console.log("Transport produce event - appData:", appData);

        socket.emit("produce", {
          transportId: transport.id,
          kind,
          rtpParameters,
          paused: false,
          appData: appData || {}
        }, (response) => {
          if (response.error) {
            errback(new Error(response.error));
          } else {
            callback({ id: response.id });
          }
        });
      });

      return transport;
    };

    const createRecvTransport = async () => {
      const transportOptions = await new Promise((res) =>
        socket.emit("createWebRtcTransport", res)
      );
      const transport = device.createRecvTransport(transportOptions);

      transport.on("connect", ({ dtlsParameters }, callback) => {
        socket.emit("connectTransport", { transportId: transport.id, dtlsParameters }, callback);
      });

      return transport;
    };

    const produceMedia = async () => {
      // Video
      if (isVideoOn) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: selectedDevices?.camera ? { exact: selectedDevices.camera } : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });

          const videoTrack = videoStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              console.warn("Video track ended — attempting recovery...");
              recoverVideo();
            };

            const videoProducer = await sendTransport.produce({
              track: videoTrack,
              appData: { isScreenShare: false }
            });
            currentProducers["video"] = videoProducer;
            setLocalVideoStream(new MediaStream([videoTrack]));
          }
        } catch (err) {
          console.error("Video setup failed:", err);
        }
      }

      // Audio
      if (isAudioOn) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: selectedDevices?.microphone ? { exact: selectedDevices.microphone } : undefined,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });

          const audioTrack = audioStream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.onended = () => {
              console.warn("Audio track ended — attempting recovery...");
              recoverAudio();
            };

            const audioProducer = await sendTransport.produce({
              track: audioTrack,
              appData: { isScreenShare: false }
            });
            currentProducers["audio"] = audioProducer;
          }
        } catch (err) {
          console.error("Audio setup failed:", err);
        }
      }
    };

    const consumeNewProducer = async (producerId, socketId, kind, isScreenShare = false) => {
      try {
        console.log(`Consuming producer: ${producerId}, kind: ${kind}, isScreenShare: ${isScreenShare}, socketId: ${socketId}`);

        const consumerParams = await new Promise((resolve, reject) => {
          socket.emit("consume", {
            transportId: recvTransport.id,
            producerId,
            rtpCapabilities: device.rtpCapabilities,
          }, (response) => {
            if (response.error) {
              reject(response.error);
            } else {
              resolve(response);
            }
          });
        });

        const consumer = await recvTransport.consume({
          id: consumerParams.id,
          producerId: consumerParams.producerId,
          kind: consumerParams.kind,
          rtpParameters: consumerParams.rtpParameters,
          paused: true,
        });

        currentConsumers[producerId] = consumer;

        await new Promise((resolve, reject) => {
          socket.emit("resumeConsumer", { consumerId: consumer.id }, (response) => {
            if (response && response.error) {
              reject(response.error);
            } else {
              resolve();
            }
          });
        });

        if (consumer.kind === "video") {
          const videoStream = new MediaStream([consumer.track]);

          // Determine if this is a screen share from multiple sources
          const finalIsScreenShare = Boolean(
            consumerParams.isScreenShare !== undefined ?
              consumerParams.isScreenShare :
              (consumerParams.appData?.isScreenShare ?? isScreenShare)
          );

          console.log(`Adding video stream for producer ${producerId}, isScreenShare: ${finalIsScreenShare}, consumerParams:`, consumerParams);

          setRemoteVideos(prev => ({
            ...prev,
            [producerId]: {
              consumer,
              socketId,
              stream: videoStream,
              isScreenShare: finalIsScreenShare,
              producerId,
              isPaused: false
            }
          }));

          if (!finalIsScreenShare) {
            setRemotePeerVideoStates(prev => ({
              ...prev,
              [socketId]: { hasVideo: true, videoPaused: false }
            }));
          }
        } else if (consumer.kind === "audio") {
          const remoteAudio = document.createElement("audio");
          const remoteStream = new MediaStream([consumer.track]);
          remoteAudio.srcObject = remoteStream;
          remoteAudio.autoplay = true;
          remoteAudio.controls = false;
          remoteAudio.style.display = "none";
          remoteAudio.id = producerId;
          document.body.appendChild(remoteAudio);
        }
      } catch (error) {
        console.error("Error consuming producer:", error);
      }
    };
    handleJoin();
  }, []);


  const allParticipants = [
    // Local user's regular video
    {
      id: 'local',
      type: 'local',
      name: userProfile.name || 'You',
      hasVideo: !videoPaused && localVideoStream && currentProducers["video"] && !currentProducers["video"].paused,
      stream: (!videoPaused && localVideoStream) ? localVideoStream : null,
      socketId: socket.id,
      isScreenShare: false,
      priority: 4 // Normal video priority
    },
    // Local user's screen share (if active)
    ...(localScreenStream ? [{
      id: 'local-screen',
      type: 'local-screen',
      name: `${userProfile.name || 'You'} (Screen)`,
      hasVideo: true,
      stream: localScreenStream,
      socketId: socket.id,
      isScreenShare: true,
      priority: 2 // Screen share priority
    }] : []),
    // Remote participants with video (only show if not paused)
    ...Object.entries(remoteVideos)
      .filter(([producerId, data]) => !data.isPaused)
      .map(([producerId, data]) => ({
        id: producerId,
        type: 'remote',
        name: peers.find(p => p.socketId === data.socketId)?.profile?.name || `User ${data.socketId.slice(-4)}`,
        hasVideo: true,
        stream: data.stream,
        socketId: data.socketId,
        isScreenShare: data.isScreenShare || false,
        priority: data.isScreenShare ? 2 : 4, // Screen share gets higher priority
        data
      })),
    // Show avatars for peers without video or with paused video
    ...peers
      .filter(peer => {
        if (peer.socketId === socket.id) return false; // Skip self
        // Check if this peer has any active (non-paused) regular video
        const hasActiveVideo = Object.values(remoteVideos).some(rv =>
          rv.socketId === peer.socketId &&
          !rv.isScreenShare &&
          !rv.isPaused
        );
        // Show avatar if no active video OR if video is paused
        const peerVideoState = remotePeerVideoStates[peer.socketId];
        return !hasActiveVideo || (peerVideoState && peerVideoState.videoPaused);
      })
      .map(peer => ({
        id: `avatar-${peer.socketId}`,
        type: 'avatar',
        name: peer.profile?.name || `User ${peer.socketId.slice(-4)}`,
        hasVideo: false,
        socketId: peer.socketId,
        isScreenShare: false,
        priority: 4 // Normal video priority
      }))
  ];

  // Sort all participants by priority
  const sortedParticipants = allParticipants.sort((a, b) => {
    // First check if either is the active speaker
    const aIsSpeaking = activeSpeaker && a.socketId === activeSpeaker;
    const bIsSpeaking = activeSpeaker && b.socketId === activeSpeaker;

    if (aIsSpeaking && !bIsSpeaking) return -1;
    if (!aIsSpeaking && bIsSpeaking) return 1;

    // Then sort by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // Keep original order for same priority
    return 0;
  });

  // Determine what to pin
  let effectivePinnedParticipant = null;
  let effectivePinnedId = pinnedProducerId;

  if (pinnedProducerId) {
    effectivePinnedParticipant = sortedParticipants.find(p => p.id === pinnedProducerId);
  }

  // Filter out pinned participant from grid
  const gridParticipants = sortedParticipants.filter(p => p.id !== effectivePinnedId);

  // Calculate available slots
  let availableSlots = maxVisibleVideos;
  if (effectivePinnedParticipant && maxVisibleVideos > 0) {
    availableSlots = maxVisibleVideos - 1; // Reserve one slot for pinned
  }

  // Calculate pagination - screen shares are treated like any other participant
  const totalPages = availableSlots > 0 ? Math.ceil(gridParticipants.length / availableSlots) : 1;
  const visibleParticipants = availableSlots > 0 ? gridParticipants.slice(
    currentPage * availableSlots,
    (currentPage + 1) * availableSlots
  ) : [];

  const pinnedParticipant = effectivePinnedParticipant;

  function getPeerPhoto(peers, socketIdOrId) {
    if (!peers) return null;
    const peer = Array.isArray(peers)
      ? peers.find(p => p.socketId === socketIdOrId || p.id === socketIdOrId)
      : peers[socketIdOrId];
    if (!peer) return null;

    if (peer.profile?.photos) return peer.profile.photos;

    if (Array.isArray(peer.profile?.photos)) {
      const firstPhoto = peer.profile.photos[0];
      if (typeof firstPhoto === 'string') return firstPhoto;
      if (firstPhoto?.url) return firstPhoto.url;
    }

    return null;
  }


  const getAvatarInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  };

  const renderParticipant = (participant, isPinned = false) => {
    const isHandRaised = handList.includes(participant.socketId);

    const containerClass = isPinned
      ? "sm:col-span-2 md:col-span-2 row-span-2 2xl:row-span-3 relative flex justify-center items-center"
      : "relative flex justify-center items-center";

    let borderColor = "border-blue-500";
    if (participant.type === 'local' || participant.type === 'local-screen') {
      borderColor = "border-green-500";
    } else if (participant.isScreenShare) {
      borderColor = isPinned ? "border-purple-500" : "border-purple-400";
    } else if (isPinned) {
      borderColor = "border-yellow-500";
    }

    // Add special styling for active speaker
    const isActiveSpeaker = activeSpeaker && participant.socketId === activeSpeaker;
    if (isActiveSpeaker && !isPinned) {
      borderColor = "border-orange-500";
    }

    const videoClass = isPinned
      ? `rounded-lg border-4 ${borderColor} object-cover w-full h-full max-h-[64vh] min-h-[200px]`
      : `rounded-lg border-2 ${borderColor} object-cover w-full h-full  max-h-[300px]`;

    const photoUrl = getPeerPhoto(peers, participant.socketId || participant.id);

    return (
      <div key={participant.id} className={containerClass}>
        {participant.hasVideo && participant.stream ? (
          <video
            autoPlay
            playsInline
            muted={participant.type === 'local' || participant.type === 'local-screen'}
            className={videoClass}
            style={{
              minWidth: isPinned ? '250px' : '150px',
              maxWidth: '100%',
              aspectRatio: '15/10'
            }}
            ref={el => {
              if (el && el.srcObject !== participant.stream) {
                el.srcObject = participant.stream;
              }
            }}
          />
        ) : (
          <div className={`${isPinned ? 'w-48 h-48 max-h-[50vh] min-h-[160px]' : 'w-full h-full min-h-[130px] max-h-[200px]'} bg-gray-700 rounded-lg flex items-center justify-center border-2 ${borderColor}`}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={participant.name}
                className={`${isPinned ? 'w-24 h-24' : 'w-24 h-24'} rounded-full object-cover`}
              />
            ) : (
              <div className={`${isPinned ? 'w-24 h-24 text-4xl' : 'w-24 h-24 text-2xl'} bg-blue-600 rounded-full flex items-center justify-center text-white font-bold`}>
                {getAvatarInitials(participant.name)}
              </div>
            )}
          </div>
        )}

        {/* Pin button - show for all participants except when they're already pinned */}
        {!isPinned && (
          <button
            onClick={() => setPinnedProducerId(participant.id)}
            className="absolute top-6 right-2 bg-black bg-opacity-60 text-yellow-300 px-2 py-1 rounded hover:bg-opacity-80 transition"
            title="Pin"
          >
            <PushPinOutlinedIcon />
          </button>
        )}

        {/* Unpin button - show when participant is pinned */}
        {isPinned && pinnedProducerId === participant.id && (
          <button
            onClick={() => setPinnedProducerId(null)}
            className="absolute top-5 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded hover:bg-opacity-80 transition"
            title="Unpin"
          >
            <PushPinIcon />
          </button>
        )}

        {isHandRaised && (
          <div className="absolute top-6 right-15 top-2.5 bg-black bg-opacity-90 text-yellow-500 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
            <BackHandIcon />
          </div>
        )}

        {participant.isScreenShare && (
          <div className="absolute top-2 left-2 bg-purple-600 bg-opacity-80 text-white px-2 py-1 rounded text-xs font-semibold">
            🖥️ Screen Share
          </div>
        )}

        {isActiveSpeaker && (
          <div className="absolute top-2 left-2 bg-orange-500 bg-opacity-80 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
            🔊 Speaking
          </div>
        )}

        <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
          {participant.name}
          {(participant.type === 'local' || participant.type === 'local-screen') && ' (You)'}
        </div>

        {(participant.type === 'local' || participant.type === 'local-screen') && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded">
            {audioPaused ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen min-w-screen bg-gray-900 text-white flex flex-col relative overflow-hidden">
      {/* Main Content */}
      <div className={`flex-grow flex transition-all duration-300 ${(showChat || showLink) && window.innerWidth > 768 ? 'mr-110' : ''}`}>
        {/* Video Grid */}
        <div className={`flex-grow p-2 md:p-4 transition-all duration-300 ${(showChat || showLink) && window.innerWidth <= 768 ? 'hidden' : ''}`}>
          {/* Pagination */}
          {totalPages > 1 && maxVisibleVideos > 0 && (
            <div className="flex justify-center items-center gap-4 mb-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="p-2 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-2 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {maxVisibleVideos > 0 ? (
            <div
              className="grid gap-1 md:gap-2 h-full max-h-[calc(100vh-220px)] overflow-hidden"
              style={{
                gridTemplateColumns: gridLayout.cols > 0 ? `repeat(${gridLayout.cols}, 1fr)` : '1fr',
                gridTemplateRows: gridLayout.rows > 0 ? `repeat(${gridLayout.rows}, 1fr)` : '1fr',
                minHeight: '300px',
                maxHeight: 'calc(100vh - 220px)' // space for controls and header
              }}
            >
              {pinnedParticipant && renderParticipant(pinnedParticipant, true)}

              {visibleParticipants.map(participant => renderParticipant(participant))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <p className="text-xl mb-2">Sidebar is open</p>
                <p>Close sidebar to see video grid</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {(showChat || showLink) && (
          <div className={`${window.innerWidth <= 768 ? 'fixed inset-0 z-50 w-screen bg-gray-900' : 'fixed right-0 top-0 h-full w-80'} bg-gray-800 border-l border-gray-700 overflow-hidden flex flex-col transition-all duration-300`}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800 flex-shrink-0">
              <h3 className="text-lg font-semibold">
                {showChat ? 'Chat' : 'Meeting Info'}
              </h3>
              <button
                onClick={() => {
                  setShowChat(false);
                  setShowLink(false);
                }}
                className="p-2 hover:bg-gray-700 rounded transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="sm:min-w-screen flex-grow overflow-hidden">
              {showChat && (
                <ChatSection
                  roomId={roomId}
                  userName={userProfile.name}
                  messages={chatMessages}
                  setMessages={setChatMessages}
                  showChat={showChat}
                  setShowChat={setShowChat}
                />
              )}
              {showLink && (
                <CopyLink
                  peers={peers}
                  hostId={hostId}
                  currentSocketId={socket.id}
                  showLink={showLink}
                  setShowLink={setShowLink}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={`max-w-screen xl:max-w-auto flex justify-center items-center rounded-lg  transition-all duration-300 ${(showChat || showLink) && window.innerWidth > 768 ? 'mr-100' : ''} gap-2 md:gap-4 p-2 md:p-4 bg-gray-800 flex-shrink-0 flex-wrap`}>
        <button
          onClick={toggleVideo}
          className={`rounded-full p-2 md:p-3 transition-colors duration-300 ${videoPaused ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
          title={videoPaused ? "Turn Video On" : "Turn Video Off"}
        >
          {videoPaused ? <VideocamOff className="w-5 h-5 md:w-6 md:h-6" /> : <Videocam className="w-5 h-5 md:w-6 md:h-6" />}
        </button>

        {isMobile && (
          <button
            onClick={flipCamera}
            className="rounded-full p-2 md:p-3 bg-gray-500 text-white hover:bg-gray-600 transition"
            title="Flip Camera"
          >
            <Cached className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}

        <button
          onClick={toggleAudio}
          className={`rounded-full p-2 md:p-3 transition-colors duration-300 ${audioPaused ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
          title={audioPaused ? "Turn Audio On" : "Turn Audio Off"}
        >
          {audioPaused ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
        </button>

        <button
          onClick={() => shareScreen(true)}
          className={`rounded-full p-2 md:p-3 transition-colors duration-300 ${screenSharing ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
          title={screenSharing ? "Stop Screen Share" : "Start Screen Share"}
        >
          {screenSharing ? <StopScreenShare className="w-5 h-5 md:w-6 md:h-6" /> : <ScreenShare className="w-5 h-5 md:w-6 md:h-6" />}
        </button>

        <button
          onClick={raise}
          title="raise hands"
          className={`rounded-full p-2 md:p-3 transition-colors duration-300 bg-blue-500 ${raiseHands ? "text-yellow-500" : "text-white"}`}
        >
          <BackHandIcon />
        </button>

        <button
          onClick={() => {
            setShowChat(prev => !prev);
            setShowLink(false);
          }}
          className={`rounded-full p-2 md:p-3 transition-colors duration-300 ${showChat ? "bg-blue-500 opacity-75" : "bg-blue-500"} text-white hover:bg-blue-600`}
          title="Toggle Chat"
        >
          <ChatIcon className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        <button
          onClick={() => {
            setShowLink(prev => !prev);
            setShowChat(false);
          }}
          className={`rounded-full p-2 md:p-3 transition-colors duration-300 ${showLink ? "bg-blue-500 opacity-75" : "bg-blue-500"} text-white hover:bg-blue-600`}
          title="Toggle Info"
        >
          <Users className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        <button
          onClick={endCall}
          className="rounded-full p-2 md:p-3 bg-red-500 text-white hover:bg-red-600 transition-colors"
          title="End Call"
        >
          <CallEndIcon className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {isHost && (
          <div className="hidden md:block text-xs md:text-sm text-green-400 bg-green-900 px-2 md:px-3 py-1 rounded">
            Host
          </div>
        )}
      </div>

      {/* Alerts */}
      {alertOpen && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded shadow-lg z-50 max-w-sm mx-4">
          {alertMessage}
          <button
            onClick={() => setAlertOpen(false)}
            className="ml-4 text-sm text-blue-600 underline hover:text-blue-800"
          >
            Close
          </button>
        </div>
      )}

      {/* Permission Popup */}
      <PermissionPopup
        isVisible={showPermissionPopup}
        profile={currentRequest?.profile}
        onApprove={handleApprove}
        onDeny={handleDeny}
        onClose={() => setShowPermissionPopup(false)}
      />
    </div>
  );
};

export default VideoRoom;