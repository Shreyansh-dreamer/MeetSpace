import React, { useState, useRef } from "react";

const ScreenRecorder = () => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8,opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        await uploadRecording(blob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      alert("Error starting recording: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadRecording = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'screen-recording.webm');

    const res = await fetch('/api/recordings/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Recording saved! Download link: ${data.link}`);
    } else {
      alert('Upload failed');
    }
  };

  return (
    <div>
      {!recording ? (
        <button onClick={startRecording}>Start Screen Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop & Upload Recording</button>
      )}
    </div>
  );
};

export default ScreenRecorder;
