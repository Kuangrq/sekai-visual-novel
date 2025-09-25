/**
 * Save Manager Component
 * Provides save/load game functionality with UI
 */
'use client';

import { useState, useEffect } from 'react';
import { GameSave, saveManager } from '@/lib/saveManager';
import { audioManager } from '@/lib/audioManager';

interface SaveManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (saveData: GameSave['gameState']) => void;
  onLoad?: (saveData: GameSave) => void;
  currentGameState?: GameSave['gameState'];
  className?: string;
}

export function SaveManagerComponent({ 
  isOpen, 
  onClose, 
  onSave,
  onLoad,
  currentGameState,
  className = '' 
}: SaveManagerProps) {
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [autoSave, setAutoSave] = useState<GameSave | null>(null);
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('load');
  const [newSaveName, setNewSaveName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load saves when opening
  useEffect(() => {
    if (isOpen) {
      loadSaves();
    }
  }, [isOpen]);

  const loadSaves = () => {
    setIsLoading(true);
    const allSaves = saveManager.getAllSaves();
    const autoSaveData = saveManager.loadAutoSave();
    setSaves(allSaves.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    setAutoSave(autoSaveData);
    setIsLoading(false);
  };

  const handleSave = () => {
    if (!currentGameState || !newSaveName.trim()) return;

    audioManager.playSound('notification');
    
    try {
      saveManager.saveGame({
        name: newSaveName.trim(),
        gameState: currentGameState,
        playTime: 0, // TODO: Implement play time tracking
      });
      
      setNewSaveName('');
      loadSaves();
      onSave?.(currentGameState);
      
      // Show success feedback
      alert('Game saved successfully!');
    } catch {
      alert('Failed to save game. Please try again.');
    }
  };

  const handleLoad = (save: GameSave) => {
    audioManager.playSound('select');
    
    if (confirm(`Load "${save.name}"? This will overwrite your current progress.`)) {
      onLoad?.(save);
      onClose();
    }
  };

  const handleDelete = (saveId: string, saveName: string) => {
    audioManager.playSound('click');
    
    if (confirm(`Delete save "${saveName}"? This cannot be undone.`)) {
      saveManager.deleteSave(saveId);
      loadSaves();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatPlayTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <div className="bg-black/90 border border-cyan-400/30 rounded-lg w-full max-w-3xl h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-400/30">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-white">Save Manager</h2>
            
            {/* Tab buttons */}
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  audioManager.playSound('click');
                  setActiveTab('load');
                }}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === 'load'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                Load Game
              </button>
              
              {currentGameState && (
                <button
                  onClick={() => {
                    audioManager.playSound('click');
                    setActiveTab('save');
                  }}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeTab === 'save'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Save Game
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={() => {
              audioManager.playSound('click');
              onClose();
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading saves...</div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4">
              {activeTab === 'save' && currentGameState && (
                <div className="space-y-4">
                  {/* Quick save section */}
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-3">Create New Save</h3>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newSaveName}
                        onChange={(e) => setNewSaveName(e.target.value)}
                        placeholder="Enter save name..."
                        className="flex-1 bg-black/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                        maxLength={50}
                        onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                      />
                      <button
                        onClick={handleSave}
                        onMouseEnter={() => audioManager.playSound('hover')}
                        disabled={!newSaveName.trim()}
                        className="px-6 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  
                  {/* Current game state preview */}
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Current Progress</h3>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>Segments: {currentGameState.currentSegments.length}</div>
                      <div>Choices made: {currentGameState.storyHistory.length}</div>
                      <div>Fast mode: {currentGameState.fastMode ? 'On' : 'Off'}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'load' && (
                <div className="space-y-3">
                  {/* Auto-save */}
                  {autoSave && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="text-blue-400 font-medium">🔄 Auto Save</div>
                            <div className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                              AUTO
                            </div>
                          </div>
                          <div className="text-sm text-gray-300 mt-1">
                            {formatDate(autoSave.timestamp)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleLoad(autoSave)}
                          onMouseEnter={() => audioManager.playSound('hover')}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual saves */}
                  {saves.length === 0 && !autoSave ? (
                    <div className="flex items-center justify-center h-64 text-center text-gray-400">
                      <div>
                        <div className="text-4xl mb-2">💾</div>
                        <div>No saved games found</div>
                        <div className="text-sm mt-1">Create a save to see it here</div>
                      </div>
                    </div>
                  ) : (
                    saves.map((save) => (
                      <div
                        key={save.id}
                        className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 hover:border-cyan-400/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="text-white font-medium">{save.name}</div>
                              <div className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                                {formatPlayTime(save.playTime)}
                              </div>
                            </div>
                            <div className="text-sm text-gray-300 mt-1">
                              {formatDate(save.timestamp)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {save.gameState.storyHistory.length} choices made
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleLoad(save)}
                              onMouseEnter={() => audioManager.playSound('hover')}
                              className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleDelete(save.id, save.name)}
                              onMouseEnter={() => audioManager.playSound('hover')}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                              title="Delete save"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-400/30">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div>
              {saves.length} saves • {autoSave ? 'Auto-save available' : 'No auto-save'}
            </div>
            <div>
              Press ESC to close
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Save/Load button component
 */
interface SaveLoadButtonProps {
  onClick: () => void;
  className?: string;
  hasProgress?: boolean;
}

export function SaveLoadButton({ onClick, className = '', hasProgress = false }: SaveLoadButtonProps) {
  return (
    <button
      onClick={() => {
        audioManager.playSound('click');
        onClick();
      }}
      onMouseEnter={() => audioManager.playSound('hover')}
      className={`p-2 rounded-full transition-all duration-200 ${
        hasProgress
          ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
      } ${className}`}
      title="Save / Load Game"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
      </svg>
    </button>
  );
}
