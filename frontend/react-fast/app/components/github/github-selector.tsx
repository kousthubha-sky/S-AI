// frontend/react-fast/app/components/github/github-selector.tsx
// UPDATED: Added breadcrumb navigation feature

import React, { useState, useEffect } from 'react';
import { X, Search, ChevronRight, ChevronDown, Folder, FileText, Github, Loader2, Link2, ChevronLeft, Home } from 'lucide-react';
import { useAuthApi } from '~/hooks/useAuthApi';
import { GitHubConnectionDialog } from './github-connection-dialog';
import { useToast } from '~/components/ui/toast';

// Interfaces
interface GitHubRepo {
  id: number;
  name: string;
  owner: string;
  full_name: string;
  description?: string;
  private: boolean;
  default_branch?: string;
  html_url?: string;
}

interface GitHubFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size: number;
  capacity?: number;
  sha?: string;
  url?: string;
  git_url?: string;
  html_url?: string;
  download_url?: string;
}

interface SelectedFile {
  repo: string;
  owner: string;
  path: string;
  name: string;
  size: number;
}

interface GitHubSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: SelectedFile[]) => void;
}

export function GitHubSelector({ isOpen, onClose, onFilesSelected }: GitHubSelectorProps) {
  const { fetchWithAuth } = useAuthApi();
  const { showToast } = useToast();

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Map<string, SelectedFile>>(new Map());
  const [reposLoading, setReposLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Cache helpers
  const getCache = (key: string) => {
    try {
      const item = localStorage.getItem(`github_${key}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp > CACHE_TTL) {
        localStorage.removeItem(`github_${key}`);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  };

  const setCache = (key: string, data: any) => {
    try {
      localStorage.setItem(`github_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch {
      // Ignore storage errors
    }
  };

  // Check connection immediately when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  // Auto-load repos if connected
  useEffect(() => {
    if (isOpen && connected && repos.length === 0) {
      loadRepos();
    }
  }, [isOpen, connected]);

  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/github/oauth/status`);

      setConnectionStatus(response);
      setConnected(response.connected);

      if (!response.connected) {
        setError('GitHub not connected. Please connect your account.');
      } else {
        setError(null);

        // Auto-load repos if connected
        if (repos.length === 0) {
          loadRepos();
        }
      }
    } catch (err) {
      console.error('❌ Failed to check GitHub connection:', err);
      setError('Failed to check GitHub connection');
      setConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Listen for OAuth callback (connection success)
  useEffect(() => {
    const handleOAuthSuccess = (event: MessageEvent) => {
      // Check origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data === 'github_connected') {
        showToast('✅ GitHub connected successfully!', 'success', 3000);
        
        // Refresh connection status and repos
        setTimeout(() => {
          checkConnection().then(() => {
            // The checkConnection function will handle loading repos if connected
          });
        }, 1000);
        
        setShowConnectionDialog(false);
      } else if (event.data === 'github_error') {
        showToast('❌ Failed to connect GitHub. Please try again.', 'error', 3000);
        setShowConnectionDialog(false);
      }
    };

    window.addEventListener('message', handleOAuthSuccess);
    return () => window.removeEventListener('message', handleOAuthSuccess);
  }, [showToast]);

  const handleConnectGitHub = async () => {
    setIsConnecting(true);
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/github/oauth/authorize`);
      
      if (response.authorization_url) {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          response.authorization_url,
          'GitHub OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          showToast('❌ Popup blocked. Please allow popups for this site.', 'error', 3000);
          setIsConnecting(false);
          return;
        }

        // Poll for popup close
        const pollTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollTimer);
            setIsConnecting(false);
            
            // Check connection after popup closes
            setTimeout(() => {
              checkConnection();
            }, 1000);
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          if (popup && !popup.closed) {
            popup.close();
            showToast('❌ Connection timed out. Please try again.', 'error', 3000);
          }
          setIsConnecting(false);
        }, 5 * 60 * 1000);
      }
    } catch (err: any) {
      console.error('❌ Failed to initiate GitHub OAuth:', err);
      showToast('❌ Failed to connect GitHub', 'error', 3000);
      setIsConnecting(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/github/oauth/disconnect`, {
        method: 'POST'
      });
      showToast('✅ GitHub disconnected', 'success', 2000);
      setConnected(false);
      setConnectionStatus(null);
      setRepos([]);
      setSelectedRepo(null);
      setNavigationHistory(['']);
      setHistoryIndex(0);

      // Clear cache on disconnect
      try {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('github_'));
        keys.forEach(key => localStorage.removeItem(key));
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      console.error('❌ Failed to disconnect GitHub:', err);
      showToast('❌ Failed to disconnect', 'error', 3000);
    }
  };

  const loadRepos = async () => {
    // Check cache first
    const cachedRepos = getCache('repos');
    if (cachedRepos) {
      setRepos(cachedRepos);
      setReposLoading(false);
      return;
    }

    setReposLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/github/repos?per_page=100`);
      const reposData = response.repos || [];
      setRepos(reposData);
      setCache('repos', reposData);
    } catch (err: any) {
      console.error('❌ Error loading repos:', err);
      setError(err.message || 'Failed to load repositories');
    } finally {
      setReposLoading(false);
    }
  };

  const loadFiles = async (repo: GitHubRepo, path: string = '') => {
    const cacheKey = `files_${repo.owner}_${repo.name}_${path || 'root'}`;

    // Check cache first
    const cachedFiles = getCache(cacheKey);
    if (cachedFiles) {
      setFiles(cachedFiles);
      setFilesLoading(false);
      return;
    }

    setFilesLoading(true);
    setError(null);
    try {
      const encodedOwner = encodeURIComponent(repo.owner);
      const encodedName = encodeURIComponent(repo.name);
      const encodedPath = path ? `/${encodeURIComponent(path)}` : '';
      const response = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/github/repos/${encodedOwner}/${encodedName}/contents${encodedPath}`
      );
      let filesData = Array.isArray(response.contents) ? response.contents : [];
      const maxCapacity = 1000000;
      filesData = filesData.map((file: any) => ({ ...file, capacity: file.type === 'file' ? Math.round((file.size / maxCapacity) * 100) : 0 }));
      setFiles(filesData);
      setCache(cacheKey, filesData);
    } catch (err: any) {
      console.error('Error loading files:', err);
      setError(err.message || 'Failed to load files');
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFolderClick = (folderPath: string) => {
    if (selectedRepo) {
      const newPath = folderPath;
      setCurrentPath(newPath);
      
      // Add to navigation history
      const newHistory = navigationHistory.slice(0, historyIndex + 1);
      newHistory.push(newPath);
      setNavigationHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      loadFiles(selectedRepo, newPath);
    }
  };

  const navigateToPath = (path: string) => {
    if (selectedRepo) {
      setCurrentPath(path);
      loadFiles(selectedRepo, path);
      
      // Find the index in history or add new entry
      const index = navigationHistory.indexOf(path);
      if (index !== -1) {
        setHistoryIndex(index);
      } else {
        const newHistory = navigationHistory.slice(0, historyIndex + 1);
        newHistory.push(path);
        setNavigationHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
  };

  const handleNavigateBack = () => {
    if (historyIndex > 0 && selectedRepo) {
      const newIndex = historyIndex - 1;
      const path = navigationHistory[newIndex];
      setCurrentPath(path);
      setHistoryIndex(newIndex);
      loadFiles(selectedRepo, path);
    }
  };

  const handleNavigateForward = () => {
    if (historyIndex < navigationHistory.length - 1 && selectedRepo) {
      const newIndex = historyIndex + 1;
      const path = navigationHistory[newIndex];
      setCurrentPath(path);
      setHistoryIndex(newIndex);
      loadFiles(selectedRepo, path);
    }
  };

  const navigateToRoot = () => {
    if (selectedRepo) {
      setCurrentPath('');
      
      // Add to navigation history if not already there
      const newHistory = navigationHistory.slice(0, historyIndex + 1);
      newHistory.push('');
      setNavigationHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      loadFiles(selectedRepo, '');
    }
  };

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setCurrentPath('');
    setFiles([]);
    setSelectedFiles(new Map());
    setNavigationHistory(['']);
    setHistoryIndex(0);
    loadFiles(repo);
  };

  const handleFileToggle = (file: GitHubFile) => {
    const key = `${selectedRepo?.full_name}/${file.path}`;
    const selectedFile: SelectedFile = {
      repo: selectedRepo!.name,
      owner: selectedRepo!.owner,
      path: file.path,
      name: file.name,
      size: file.size
    };

    const newSelected = new Map(selectedFiles);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.set(key, selectedFile);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectFiles = () => {
    const selected = Array.from(selectedFiles.values());
    onFilesSelected(selected);
    onClose();
  };

  // Generate breadcrumb items
  const breadcrumbItems = currentPath.split('/').filter(p => p);
  const filteredRepos = repos.filter(repo => repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isLoading = filesLoading;
  const maxCapacity = 1000000;
  const usedCapacity = Math.round(Array.from(selectedFiles.values()).reduce((sum, f) => sum + f.size, 0) / maxCapacity * 100);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#2b2b2b] rounded-xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="text-[18px] font-semibold text-white mb-1">Add content from GitHub</h2>
              <p className="text-[13px] text-[#9ca3af]">Select the files you would like to add to this chat</p>
              {!connected ? (
                <button
                  onClick={() => setShowConnectionDialog(true)}
                  className="mt-2 px-4 py-2 bg-[#60a5fa] text-white rounded hover:bg-[#3b82f6] transition-colors text-[14px]"
                >
                  Connect GitHub
                </button>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[12px] text-[#6b7280]">
                    Connected as {connectionStatus?.username}
                  </span>
                  <button
                    onClick={handleDisconnectGitHub}
                    className="px-3 py-1 text-[12px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center hover:bg-[#3d3d3d] rounded transition-colors"
            >
              <X className="w-5 h-5 text-[#9ca3af] hover:text-white transition-colors" />
            </button>
          </div>

          {/* Repository Selector Bar */}
          <div className="px-6 relative">
            <div className="bg-[#1f1f1f] border border-[#3d3d3d] rounded-lg p-3 flex items-center gap-3">
              <Github className="w-5 h-5 text-[#9ca3af] flex-shrink-0" />

              <div className="relative flex-1">
                <button
                  onClick={() => setShowRepoDropdown(!showRepoDropdown)}
                  className="flex items-center gap-2 text-white hover:text-[#e5e7eb] transition-colors"
                >
                  <span className="text-[14px] font-medium">
                    {selectedRepo ? selectedRepo.full_name : 'Select a repository'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showRepoDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showRepoDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-[500px] bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg shadow-2xl z-50 max-h-[400px] overflow-y-auto">
                    <div className="p-2 border-b border-[#3d3d3d]">
                      <input
                        type="text"
                        placeholder="Search repositories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 bg-[#2b2b2b] border border-[#4b5563] rounded text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#60a5fa]"
                      />
                    </div>
                    {filteredRepos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => handleRepoSelect(repo)}
                        className="w-full text-left px-4 py-3 text-[14px] text-[#e5e7eb] hover:bg-[#2b2b2b] transition-colors border-b border-[#3d3d3d] last:border-b-0"
                      >
                        {repo.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="p-1.5 hover:bg-[#2b2b2b] rounded transition-colors"
                onClick={() => selectedRepo && window.open(selectedRepo.html_url, '_blank')}
              >
                <Link2 className="w-4 h-4 text-[#9ca3af]" />
              </button>

              <button className="p-1.5 hover:bg-[#2b2b2b] rounded transition-colors">
                <Search className="w-4 h-4 text-[#9ca3af]" />
              </button>
            </div>
          </div>

          {/* Breadcrumb Navigation Bar */}
          {selectedRepo && (
            <div className="px-6">
              <div className="flex items-center gap-2 rounded-lg p-2">
                {/* Navigation Buttons */}
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={handleNavigateBack}
                    disabled={historyIndex === 0}
                    className={`p-1.5 rounded ${historyIndex === 0 ? 'text-[#4b5563] cursor-not-allowed' : 'text-[#9ca3af] hover:bg-[#2b2b2b] hover:text-white'}`}
                    title="Go back"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNavigateForward}
                    disabled={historyIndex === navigationHistory.length - 1}
                    className={`p-1.5 rounded ${historyIndex === navigationHistory.length - 1 ? 'text-[#4b5563] cursor-not-allowed' : 'text-[#9ca3af] hover:bg-[#2b2b2b] hover:text-white'}`}
                    title="Go forward"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={navigateToRoot}
                    className="p-1.5 text-[#9ca3af] hover:bg-[#2b2b2b] hover:text-white rounded"
                    title="Go to root"
                  >
                    <Home className="w-4 h-4" />
                  </button>
                </div>

                {/* Breadcrumb Trail */}
                <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                  <button
                    onClick={() => navigateToPath('')}
                    className="text-[13px] px-2 py-1 text-[#60a5fa] hover:bg-[#2b2b2b] rounded"
                  >
                    {selectedRepo.name}
                  </button>
                  
                  {breadcrumbItems.map((item, index) => {
                    const path = breadcrumbItems.slice(0, index + 1).join('/');
                    return (
                      <div key={path} className="flex items-center">
                        <ChevronRight className="w-3 h-3 text-[#6b7280] mx-1" />
                        <button
                          onClick={() => navigateToPath(path)}
                          className="text-[13px] px-2 py-1 text-[#e5e7eb] hover:bg-[#2b2b2b] rounded truncate max-w-[150px]"
                          title={item}
                        >
                          {item}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Current Path Display */}
                <div className="ml-2 text-[12px] text-[#6b7280] truncate flex-shrink-0 max-w-[200px]">
                  {currentPath || 'Root'}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden px-6">
            {!connected ? (
              <div className="h-full flex items-center justify-center text-[#6b7280] text-[14px]">
                Please connect your GitHub account to get started
              </div>
            ) : !selectedRepo ? (
              <div className="h-full flex items-center justify-center text-[#6b7280] text-[14px]">
                Select a repository above to get started
              </div>
            ) : isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#6b7280]" />
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                {files.map((file, index) => {
                  const fileKey = `${selectedRepo.full_name}/${file.path}`;
                  const isSelected = selectedFiles.has(fileKey);

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 px-3 py-3 hover:bg-[#3d3d3d] rounded-lg cursor-pointer transition-colors group ${
                        file.type === 'dir' ? 'cursor-pointer' : ''
                      }`}
                      onClick={file.type === 'dir' ? () => handleFolderClick(file.path) : undefined}
                    >
                      {/* Checkbox or Folder indicator */}
                      {file.type === 'file' ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleFileToggle(file)}
                          className="w-4 h-4 rounded border-2 border-[#4b5563] bg-transparent checked:bg-transparent checked:border-[#4b5563] appearance-none cursor-pointer relative
                            before:content-[''] before:absolute before:inset-0 before:bg-transparent
                            checked:before:bg-[url('data:image/svg+xml;base64)] before:bg-center before:bg-no-repeat"
                        />
                      ) : (
                        <div className="w-4 h-4 flex items-center justify-center">
                          <ChevronRight className="w-3 h-3 text-[#9ca3af]" />
                        </div>
                      )}

                      {/* Icon */}
                      {file.type === 'dir' ? (
                        <Folder className="w-5 h-5 text-[#60a5fa] flex-shrink-0" fill="currentColor" />
                      ) : (
                        <FileText className="w-5 h-5 text-[#9ca3af] flex-shrink-0" />
                      )}

                      {/* File Info */}
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-[14px] text-white">{file.name}</span>
                        {file.capacity !== undefined && file.capacity > 0 && (
                          <span className="text-[13px] text-[#6b7280]">{file.capacity}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#3d3d3d] flex items-center justify-between">
            <span className="text-[13px] text-[#9ca3af]">
              {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#9ca3af]">
                {usedCapacity}% of capacity used
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-[#9ca3af] hover:bg-[#3d3d3d] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectFiles}
                disabled={selectedFiles.size === 0}
                className="px-4 py-2 bg-[#60a5fa] text-white rounded hover:bg-[#3b82f6] disabled:opacity-50 transition-colors"
              >
                Select Files
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Dialog */}
      <GitHubConnectionDialog
        isOpen={showConnectionDialog}
        onClose={() => setShowConnectionDialog(false)}
        onConnect={handleConnectGitHub}
        isConnecting={isConnecting}
      />
    </>
  );
}