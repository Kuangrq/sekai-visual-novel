/**
 * Audio Controls Component
 * Provides user interface for managing audio settings
 */
'use client';

import { useState, useEffect } from 'react';
import { audioManager } from '@/lib/audioManager';

interface AudioControlsProps {
  className?: string;
}

export function AudioControls({ className = '' }: AudioControlsProps) {
  const [settings, setSettings] = useState(audioManager.getSettings());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSettings(audioManager.getSettings());
  }, []);

  const updateVolume = (type: 'volume' | 'typingVolume' | 'uiVolume', value: number) => {
    const newSettings = { ...settings, [type]: value };
    setSettings(newSettings);
    audioManager.updateSettings(newSettings);
  };

  const toggleAudio = () => {
    const enabled = audioManager.toggleAudio();
    setSettings(prev => ({ ...prev, enabled }));
    
    // Play test sound when enabling
    if (enabled) {
      setTimeout(() => audioManager.playSound('notification'), 100);
    }
  };

  const testSound = (soundType: 'typing' | 'click' | 'hover' | 'select') => {
    audioManager.playSound(soundType);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Audio toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => audioManager.playSound('hover')}
        className={`p-2 rounded-full transition-all duration-200 ${
          settings.enabled 
            ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' 
            : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
        }`}
        title="Audio Settings"
      >
        {settings.enabled ? (
          // Audio on icon
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797L5.5 14.5H3a1 1 0 01-1-1v-3a1 1 0 011-1h2.5l2.883-2.297a1 1 0 011.617.797zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.414 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.758 4.243 1 1 0 01-1.414-1.414A3.983 3.983 0 0013 10a3.983 3.983 0 00-1.172-2.829 1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          // Audio off icon
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.797L5.5 14.5H3a1 1 0 01-1-1v-3a1 1 0 011-1h2.5l2.883-2.297a1 1 0 011.617.797zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Audio control panel */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-80 bg-black/90 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4 z-50">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Audio Settings</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Enable Audio</label>
              <button
                onClick={toggleAudio}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.enabled ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {settings.enabled && (
              <>
                {/* Master Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">Master Volume</label>
                    <span className="text-cyan-400 text-sm">{Math.round(settings.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.volume}
                    onChange={(e) => updateVolume('volume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${settings.volume * 100}%, #4b5563 ${settings.volume * 100}%, #4b5563 100%)`
                    }}
                  />
                </div>

                {/* Typing Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">Typing Effects</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-400 text-sm">{Math.round(settings.typingVolume * 100)}%</span>
                      <button
                        onClick={() => testSound('typing')}
                        className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.typingVolume}
                    onChange={(e) => updateVolume('typingVolume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${settings.typingVolume * 100}%, #4b5563 ${settings.typingVolume * 100}%, #4b5563 100%)`
                    }}
                  />
                </div>

                {/* UI Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-sm">UI Sounds</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-400 text-sm">{Math.round(settings.uiVolume * 100)}%</span>
                      <button
                        onClick={() => testSound('click')}
                        className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.uiVolume}
                    onChange={(e) => updateVolume('uiVolume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${settings.uiVolume * 100}%, #4b5563 ${settings.uiVolume * 100}%, #4b5563 100%)`
                    }}
                  />
                </div>

                {/* Sound test buttons */}
                <div className="pt-2 border-t border-gray-600">
                  <div className="text-gray-300 text-sm mb-2">Test Sounds:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => testSound('hover')}
                      className="text-xs px-3 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 transition-colors"
                    >
                      Hover
                    </button>
                    <button
                      onClick={() => testSound('select')}
                      className="text-xs px-3 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 transition-colors"
                    >
                      Select
                    </button>
                    <button
                      onClick={() => audioManager.playSound('notification')}
                      className="text-xs px-3 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 transition-colors"
                    >
                      Notification
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
