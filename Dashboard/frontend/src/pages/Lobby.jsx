import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Mic, MicOff, Settings, Monitor, Users, Clock } from 'lucide-react';
import axios from "axios";
import { socket } from "../socket";

const Lobby = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const isHost = location.state?.isHost || false;
  const userProfile = location.state?.user || [];

  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [user, setUser] = useState(null);
  const [image, setImage] = useState(null);
  const [devices, setDevices] = useState({ cameras: [], microphones: [], speakers: [] });
  const [selectedDevices, setSelectedDevices] = useState({ camera: '', microphone: '', speaker: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({ camera: 'prompt', microphone: 'prompt' });

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Avatar component for when video is off
  const Avatar = ({ alt, children, sx }) => {
    return (
      <div
        className="flex items-center justify-center text-white font-semibold"
        style={{
          width: sx.width || 96,
          height: sx.height || 96,
          background: sx.bgcolor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: sx.color || "white",
          fontWeight: sx.fontWeight || 600,
          border: sx.border || "4px solid rgba(83, 8, 223, 0.2)",
          boxShadow: sx.boxShadow || "0 8px 32px rgba(0, 0, 0, 0.1)",
          borderRadius: "50%"
        }}
      >
        {children}
      </div>
    );
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10); // e.g. "q4x8fj2k" why(2,10) as it generate 0.abcdefgh
  };

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:3000/user", {
          withCredentials: true,
        }).catch((err) => {
          console.log("AXIOS ERROR", err.response?.data || err.message);
        });
        setUser(res.data);
        setUserName(res.data.name || res.data.username);
        if (res.data.photos) setImage(res.data.photos);
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  // Get user media with current settings
  // const getUserMedia = async () => {
  //   try {
  //     setIsLoading(true);
  //     setError('');
  //     const constraints = {
  //       video: true,
  //       //   isVideoOn ? {
  //       //   deviceId: selectedDevices.camera ? { exact: selectedDevices.camera } : undefined,
  //       //   width: { ideal: 1280 },
  //       //   height: { ideal: 720 }
  //       // } : false,
  //       audio: true,
  //       //   isAudioOn ? {
  //       //   deviceId: selectedDevices.microphone ? { exact: selectedDevices.microphone } : undefined,
  //       //   echoCancellation: true,
  //       //   noiseSuppression: true,
  //       //   autoGainControl: true
  //       // } : false
  //     };
  //     const stream = await navigator.mediaDevices.getUserMedia(constraints);
  //     // Stop previous stream if exists
  //     if (streamRef.current) {
  //       streamRef.current.getTracks().forEach(track => track.stop());
  //     }
  //     streamRef.current = stream;
  //     setMediaStream(stream);
  //     if (videoRef.current && stream) {
  //       videoRef.current.srcObject = stream;
  //     }
  //     // Update permission status
  //     setPermissionStatus({
  //       camera: isVideoOn ? 'granted' : permissionStatus.camera,
  //       microphone: isAudioOn ? 'granted' : permissionStatus.microphone
  //     });
  //   } catch (err) {
  //     console.error('Both mic and video capturing access denied:', err);
  //     setError(err.name === 'NotAllowedError' ? 'Camera and microphone access denied' : 'Both mic and video access denied:');
  //     setPermissionStatus({
  //       camera: err.name === 'NotAllowedError' ? 'denied' : 'prompt',
  //       microphone: err.name === 'NotAllowedError' ? 'denied' : 'prompt'
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };



  // Get available devices

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      const speakers = devices.filter(device => device.kind === 'audiooutput');
      setDevices({ cameras, microphones, speakers });
      // Set default devices if none selected
      if (!selectedDevices.camera && cameras.length > 0) {
        setSelectedDevices(prev => ({ ...prev, camera: cameras[0].deviceId }));
      }
      if (!selectedDevices.microphone && microphones.length > 0) {
        setSelectedDevices(prev => ({ ...prev, microphone: microphones[0].deviceId }));
      }
      if (!selectedDevices.speaker && speakers.length > 0) {
        setSelectedDevices(prev => ({ ...prev, speaker: speakers[0].deviceId }));
      }
    } catch (err) {
      console.error('Error getting devices:', err);
    }
  };


  useEffect(() => {
    const handleDeviceChange = async () => {
      // alert("New device plugged-in");
      const updatedDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = updatedDevices.filter(d => d.kind === "videoinput");
      const microphones = updatedDevices.filter(d => d.kind === "audioinput");
      const speakers = updatedDevices.filter(d => d.kind === "audiooutput");
      setDevices({ cameras, microphones, speakers });
      // auto-select newly plugged-in device if nothing selected
      setSelectedDevices(prev => ({
        camera: prev.camera || (cameras[0]?.deviceId || ''),
        microphone: prev.microphone || (microphones[0]?.deviceId || ''),
        speaker: prev.speaker || (speakers[0]?.deviceId || '')
      }));
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    handleDeviceChange();
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, []);


  const toggleVideo = async () => {
    if (!isVideoOn) {
      try {
        // Only request video, merge with old stream if it had audio
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: selectedDevices.camera || undefined } });
        let newStream = stream;
        //if old media is already present
        if (mediaStream && mediaStream.getAudioTracks().length) {
          // Combine audio and new video
          newStream = new MediaStream([...stream.getVideoTracks(), ...mediaStream.getAudioTracks()]);
        }
        setMediaStream(newStream);
        setIsVideoOn(true);
        setPermissionStatus(prev => ({ ...prev, camera: 'granted' }));
        if (videoRef.current) videoRef.current.srcObject = newStream;
      } catch (e) {
        setIsVideoOn(false);
        setPermissionStatus(prev => ({ ...prev, camera: 'denied' }));
        alert("Camera denied!");
      }
    } else {
      // Turn off camera
      if (mediaStream) {
        mediaStream.getVideoTracks().forEach(track => track.stop());
        const audioTracks = mediaStream.getAudioTracks();
        if (audioTracks.length) {
          const newStream = new MediaStream(audioTracks);
          setMediaStream(newStream);
          // if (videoRef.current) videoRef.current.srcObject = newStream;
        } else {
          setMediaStream(null);
          // if (videoRef.current) videoRef.current.srcObject = null;
        }
      }
      setIsVideoOn(false);
    }
  };

  const toggleAudio = async () => {
    if (!isAudioOn) {
      try {
        // Only request audio, merge with old stream if it had video
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDevices.microphone || undefined } });
        let newStream = stream;
        if (mediaStream && mediaStream.getVideoTracks().length) {
          newStream = new MediaStream([...mediaStream.getVideoTracks(), ...stream.getAudioTracks()]);
        }
        setMediaStream(newStream);
        setIsAudioOn(true);
        setPermissionStatus(prev => ({ ...prev, microphone: 'granted' }));
        if (videoRef.current) videoRef.current.srcObject = newStream;
      } catch (e) {
        setIsAudioOn(false);
        setPermissionStatus(prev => ({ ...prev, microphone: 'denied' }));
        alert("Microphone denied!");
      }
    } else {
      // Turn off microphone
      if (mediaStream) {
        mediaStream.getAudioTracks().forEach(track => track.stop());
        const videoTracks = mediaStream.getVideoTracks();
        if (videoTracks.length) {
          const newStream = new MediaStream(videoTracks);
          setMediaStream(newStream);
          if (videoRef.current) videoRef.current.srcObject = newStream;
        } else {
          setMediaStream(null);
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      }
      setIsAudioOn(false);
    }
  };


  // Join meeting
  const joinMeeting = () => {
    if (!meetingId.trim()) {
      setError('Please enter a meeting ID or give a meeting link');
      return;
    }
    console.log("Request sent");
    console.log("Joining Meeting:", meetingId, userProfile);
    if (!meetingId) {
      console.error("Meeting ID is missing!");
      return;
    }
    socket.emit("askToJoin", { roomId: meetingId, profile: userProfile, });
  };

  useEffect(() => {
    socket.on("permissionGiven", ({ meetingId }) => {
      console.log("Permission granted! Joining meeting...");
      navigate(`/meeting/${meetingId}`, {
        state: { isHost: false, isVideoOn, isAudioOn, selectedDevices, userName, userProfile },
      });
      alert(`Permission granted! Joining meeting ${meetingId} as ${userName} with video ${isVideoOn ? 'on' : 'off'} and audio ${isAudioOn ? 'on' : 'off'}...`);
    });

    socket.on("permissionNotGiven", () => {
      console.log("Permission denied.");
      alert("Permission denied by host.");
    });

    return () => {
      socket.off("permissionGiven");
      socket.off("permissionNotGiven");
    };
  }, []);

  const startMeeting = () => {
    const roomId = generateRoomId();
    setMeetingId(roomId);
    navigate(`/meeting/${roomId}`, {
      state: { isHost: true, isVideoOn, isAudioOn, selectedDevices, userName, userProfile },
    });
    alert(`Starting meeting ${meetingId} as ${userName} with video ${isVideoOn ? 'on' : 'off'} and audio ${isAudioOn ? 'on' : 'off'}`);
  };


  useEffect(() => {
    getDevices();
    // Don't automatically get user media on mount, wait for user interaction
    // getUserMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update media when settings change
  // useEffect(() => {
  //   if (permissionStatus.camera !== 'denied' && permissionStatus.microphone !== 'denied') {
  //     getUserMedia();
  //   }
  // }, [isVideoOn, isAudioOn, selectedDevices.camera, selectedDevices.microphone]);

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });


  //To update preview whenever mediastream changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream || null;
    }
  }, [mediaStream]);

  function extractMeetingId(input) {
    // If it's 8 characters and no slash, just use it as ID
    if (/^[a-zA-Z0-9]{8}$/.test(input)) return input;
    // Else, try to extract from URL or path
    try {
      let url = input.trim();
      // Remove trailing slash if any
      if (url.endsWith('/')) url = url.slice(0, -1);
      // Find the last "/" and get what's after it (the meeting id)
      const fragments = url.split('/');
      const last = fragments[fragments.length - 1];
      if (/^[a-zA-Z0-9]{8}$/.test(last)) return last;
    } catch (e) { }

    // Fallback: just return the input (could show error)
    return input.trim();
  }


  return (
    <div className="min-h-screen min-w-screen-7xl bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Meeting Lobby</h1>
          </div>
          <div className="flex items-center space-x-4 text-gray-400">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{currentTime}</span>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              {isVideoOn && mediaStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <div className="text-center">
                    {user?.photos ? (
                      <img
                        src={user.photos}
                        alt="User"
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-300/50 shadow-2xl ring-4 ring-blue-100/50 mx-auto mb-4"
                      />
                    ) : (
                      <div className="mb-4">
                        <Avatar
                          alt={user?.name || user?.username || "User"}
                          sx={{
                            width: 96,
                            height: 96,
                            bgcolor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "white",
                            fontWeight: 600,
                            border: "4px solid rgba(83, 8, 223, 0.2)",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          {(user?.name || user?.username || "U")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </Avatar>
                      </div>
                    )}
                    <p className="text-gray-400 text-sm">
                      {user?.name || user?.username || "User"}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {isVideoOn ? 'Camera starting...' : 'Camera is off'}
                    </p>
                  </div>
                </div>
              )}

              {/* Controls overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-colors ${isVideoOn
                    ? 'bg-gray-600 hover:bg-gray-500'
                    : 'bg-red-600 hover:bg-red-500'
                    }`}
                >
                  {isVideoOn ? (
                    <Camera className="w-5 h-5 text-white" />
                  ) : (
                    <CameraOff className="w-5 h-5 text-white" />
                  )}
                </button>
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full transition-colors ${isAudioOn
                    ? 'bg-gray-600 hover:bg-gray-500'
                    : 'bg-red-600 hover:bg-red-500'
                    }`}
                >
                  {isAudioOn ? (
                    <Mic className="w-5 h-5 text-white" />
                  ) : (
                    <MicOff className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Join Panel */}
          <div className="space-y-4">
            {!isHost && <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Meeting ID
              </label>
              <input
                type="text"
                value={meetingId}
                onChange={e => {
                  const raw = e.target.value;
                  const id = extractMeetingId(raw);
                  setMeetingId(id);
                }}
                placeholder="Enter meeting ID or paste the meeting link"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            }

            {error && (
              <div className="bg-red-900 border border-red-600 text-red-200 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                <h3 className="text-white font-medium">Device Settings</h3>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Camera</label>
                  <select
                    value={selectedDevices.camera}
                    onChange={(e) => setSelectedDevices(prev => ({ ...prev, camera: e.target.value }))}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    {devices.cameras.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Microphone</label>
                  <select
                    value={selectedDevices.microphone}
                    onChange={(e) => setSelectedDevices(prev => ({ ...prev, microphone: e.target.value }))}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    {devices.microphones.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Speaker</label>
                  <select
                    value={selectedDevices.speaker}
                    onChange={(e) => setSelectedDevices(prev => ({ ...prev, speaker: e.target.value }))}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    {devices.speakers.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Status indicators */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isVideoOn ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                <span className="text-gray-400">Video {isVideoOn ? 'on' : 'off'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isAudioOn ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                <span className="text-gray-400">Audio {isAudioOn ? 'on' : 'off'}</span>
              </div>
            </div>

            {!isHost && <button
              onClick={joinMeeting}
              disabled={isLoading || !meetingId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Setting up...' : 'Ask for permission to join'}
            </button>}

            {isHost && <button
              onClick={startMeeting}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Setting up...' : 'Start the meeting'}
            </button>}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;