import React, { useState } from 'react';
import { User, Video, Mic, Shield, X, Check } from 'lucide-react';

const PermissionPopup = ({ 
  isVisible = false, 
  profile,
  onApprove,
  onDeny,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    try {
      await onDeny?.();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible || !profile) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full transform animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Join Request</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Someone wants to join your room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              {profile.photos ? (
                <img 
                  src={profile.photos} 
                  alt={profile.name || profile.username}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{profile.name || profile.username}</h3>
              {profile.email && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.email}</p>
              )}
            </div>
          </div>

          {/* Permissions Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Requesting access to:</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Camera</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Microphone</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleDeny}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Deny</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'Processing...' : 'Allow'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-2xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You can change permissions later in room settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default PermissionPopup;