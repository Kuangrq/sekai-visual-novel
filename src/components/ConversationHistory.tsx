/**
 * Conversation History Component
 * Displays the conversation history in a scrollable panel
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { ConversationEntry, saveManager } from '@/lib/saveManager';
import { audioManager } from '@/lib/audioManager';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ConversationHistory({ 
  isOpen, 
  onClose, 
  className = '' 
}: ConversationHistoryProps) {
  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'user' | 'story' | 'choices'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation history
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const conversationHistory = saveManager.getConversationHistory();
      setHistory(conversationHistory);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const filteredHistory = history.filter(entry => {
    if (filter === 'all') return true;
    if (filter === 'user') return entry.type === 'user_input' || entry.type === 'user_choice';
    if (filter === 'story') return entry.type === 'story_segment';
    if (filter === 'choices') return entry.type === 'user_choice';
    return true;
  });

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  };

  const exportHistory = () => {
    audioManager.playSound('click');
    const exportText = saveManager.exportHistory();
    
    // Create and download file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visual-novel-history-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    audioManager.playSound('click');
    if (confirm('Are you sure you want to clear all conversation history? This cannot be undone.')) {
      saveManager.clearHistory();
      setHistory([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <div className="bg-black/90 border border-cyan-400/30 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-400/30">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-white">Conversation History</h2>
            <div className="text-sm text-gray-400">
              {filteredHistory.length} entries
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Filter buttons */}
            <div className="flex space-x-1">
              {(['all', 'user', 'story', 'choices'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => {
                    audioManager.playSound('click');
                    setFilter(filterType);
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    filter === filterType
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Action buttons */}
            <button
              onClick={exportHistory}
              onMouseEnter={() => audioManager.playSound('hover')}
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
              title="Export history as text file"
            >
              Export
            </button>
            
            <button
              onClick={clearHistory}
              onMouseEnter={() => audioManager.playSound('hover')}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
              title="Clear all history"
            >
              Clear
            </button>
            
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading history...</div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <div className="text-2xl mb-2">📚</div>
                <div>No conversation history yet</div>
                <div className="text-sm mt-1">Start playing to see your story unfold here</div>
              </div>
            </div>
          ) : (
            <div 
              ref={scrollRef}
              className="h-full overflow-y-auto p-4 space-y-3"
            >
              {filteredHistory.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg ${
                    entry.type === 'user_input' 
                      ? 'bg-blue-500/10 border-l-4 border-blue-500'
                      : entry.type === 'user_choice'
                      ? 'bg-cyan-500/10 border-l-4 border-cyan-500'
                      : 'bg-gray-500/10 border-l-4 border-gray-500'
                  }`}
                >
                  {/* Timestamp */}
                  <div className="text-xs text-gray-400 mt-1 min-w-20">
                    {formatTime(entry.timestamp)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    {entry.type === 'user_input' && (
                      <div>
                        <div className="text-blue-400 font-medium text-sm mb-1">YOU</div>
                        <div className="text-white">{entry.content}</div>
                      </div>
                    )}
                    
                    {entry.type === 'user_choice' && (
                      <div>
                        <div className="text-cyan-400 font-medium text-sm mb-1">CHOICE</div>
                        <div className="text-white">{entry.content}</div>
                      </div>
                    )}
                    
                    {entry.type === 'story_segment' && (
                      <div>
                        <div className="text-gray-300 font-medium text-sm mb-1 flex items-center space-x-2">
                          <span>{entry.character ? entry.character.toUpperCase() : 'NARRATOR'}</span>
                          {entry.emotion && (
                            <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                              {entry.emotion}
                            </span>
                          )}
                        </div>
                        <div className="text-white">{entry.content}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-400/30">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div>
              Total: {history.length} entries • Showing: {filteredHistory.length}
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
 * Floating history button component
 */
interface HistoryButtonProps {
  onClick: () => void;
  hasHistory: boolean;
  className?: string;
}

export function HistoryButton({ onClick, hasHistory, className = '' }: HistoryButtonProps) {
  return (
    <button
      onClick={() => {
        audioManager.playSound('click');
        onClick();
      }}
      onMouseEnter={() => audioManager.playSound('hover')}
      className={`p-2 rounded-full transition-all duration-200 ${
        hasHistory
          ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
          : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
      } ${className}`}
      disabled={!hasHistory}
      title="View Conversation History"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
  );
}
