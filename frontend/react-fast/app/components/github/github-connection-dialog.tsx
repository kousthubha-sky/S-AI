// frontend/react-fast/app/components/github/github-connection-dialog.tsx
// New component for GitHub connection flow

import React, { useState } from 'react';
import { X, Github, AlertCircle, CheckCircle, ExternalLink, Shield, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GitHubConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  isConnecting: boolean;
}

export function GitHubConnectionDialog({ 
  isOpen, 
  onClose, 
  onConnect,
  isConnecting 
}: GitHubConnectionDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-[#1F2023] rounded-2xl border border-[#333333] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333]">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Connect GitHub</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2E3033] rounded-full transition-colors"
              disabled={isConnecting}
            >
              <X className="w-5 h-5 text-gray-200" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Info Section */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-blue-300 mb-1">
                    Secure Authentication
                  </h3>
                  <p className="text-xs text-blue-200/80 leading-relaxed">
                    You'll be redirected to GitHub to authorize access. We'll only request
                    read permissions for your repositories.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">What we'll access:</h3>
                <ul className="space-y-2">
                  {[
                    'View your public and private repositories',
                    'Read repository contents and files',
                    'Access repository metadata'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your GitHub credentials are encrypted and stored securely. You can disconnect
                  at any time from your profile settings.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={isConnecting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#2E3033] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    Connect GitHub
                    <ExternalLink className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-center text-gray-500">
              By connecting, you agree to GitHub's terms of service
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}