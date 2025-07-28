import React, { useState, useEffect, useRef } from "react";
import { X, Sun, Moon, Copy, Users, Link } from "lucide-react";

const CopyLink = ({ peers, hostId, currentSocketId, showLink, setShowLink }) => {
  const [joinLink, setJoinLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    localStorage.getItem("copylink-dark-mode") === "true"
    return true;
  });

  const containerRef = useRef(null);

  useEffect(() => {
    setJoinLink(window.location.href);
  }, []);

  useEffect(() => {
    localStorage.setItem("copylink-dark-mode", darkMode);
  }, [darkMode]);

  const copyToClipboard = () => {
    if (!joinLink) return;
    navigator.clipboard.writeText(joinLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    if (setShowLink) {
      setShowLink(false);
    }
  };

  const containerClasses = darkMode
    ? "bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 text-slate-50"
    : "bg-gradient-to-b from-white to-gray-50 border-gray-200 text-gray-900";

  return (
    <div
      ref={containerRef}
      className={`fixed top-0 right-0 h-full shadow-2xl border-l z-50 flex flex-col transition-all duration-300 ${containerClasses}`}
      style={{
        width: "420px",
        maxWidth: "90vw",
        boxShadow: "0 8px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b backdrop-blur-sm ${
        darkMode 
          ? "border-slate-700 bg-slate-800/80" 
          : "border-gray-200 bg-white/80"
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-wide bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Meeting Info
          </span>
        </div>
        
        <button
          onClick={handleClose}
          className={`p-2 rounded-full transition-all duration-200 hover:rotate-90 ${
            darkMode 
              ? "bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white" 
              : "bg-gray-100 hover:bg-red-500 text-gray-600 hover:text-white"
          }`}
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Join Link Section */}
      <div className={`p-4 border-b ${
        darkMode ? "border-slate-700 bg-slate-800/50" : "border-gray-200 bg-gray-50/50"
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Link size={16} className={darkMode ? "text-slate-400" : "text-gray-600"} />
          <span className="font-semibold">Join Link</span>
        </div>
        
        <div className={`p-3 rounded-xl border-2 ${
          darkMode 
            ? "bg-slate-700 border-slate-600" 
            : "bg-white border-gray-300"
        }`}>
          <div className="text-sm break-all mb-3 font-mono">
            {joinLink}
          </div>
          <button
            onClick={copyToClipboard}
            className={`w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              copied
                ? "bg-green-600 text-white"
                : darkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <Copy size={16} />
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {/* Theme Toggle */}
        <div className={`flex items-center justify-center gap-3 mt-4 p-2 rounded-lg ${
          darkMode ? "bg-slate-700/50" : "bg-gray-100"
        }`}>
          <Sun size={18} className={darkMode ? "text-gray-400" : "text-orange-500"} />
          <button
            onClick={() => setDarkMode(d => !d)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              darkMode ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 top-0.5 ${
              darkMode ? "translate-x-6" : "translate-x-0.5"
            }`} />
          </button>
          <Moon size={18} className={darkMode ? "text-yellow-400" : "text-gray-400"} />
        </div>
      </div>

      {/* People List */}
      <div className={`flex-1 overflow-y-auto ${
        darkMode ? "bg-slate-900/30" : "bg-gray-50/30"
      }`}>
        <div className="p-4">
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
            darkMode ? "text-slate-200" : "text-gray-800"
          }`}>
            <Users size={20} />
            Participants ({peers.length})
          </h2>

          {peers.length === 0 ? (
            <div className={`text-center py-8 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
              <Users size={48} className="mx-auto mb-3 opacity-50" />
              <p>No participants yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {peers.map((peer) => {
                const isHost = peer.socketId === hostId;
                const isYou = peer.socketId === currentSocketId;

                return (
                  <div
                    key={peer.socketId}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                      darkMode
                        ? "bg-slate-700/50 hover:bg-slate-700 border border-slate-600"
                        : "bg-white hover:bg-gray-50 border border-gray-200 shadow-sm"
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={peer.profile?.photos || `https://i.pravatar.cc/48?u=${peer.socketId}`}
                        alt={peer.profile?.name || "User avatar"}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                        loading="lazy"
                      />
                      {isHost && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                          <span className="text-xs">🟢</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold truncate ${
                          darkMode ? "text-slate-200" : "text-gray-900"
                        }`}>
                          {peer.profile?.name || "Unknown User"}
                        </span>
                        {isYou && (
                          <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      {isHost && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Host
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopyLink;