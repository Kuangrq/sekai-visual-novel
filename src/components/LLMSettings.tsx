/**
 * LLM Settings Component
 * Provides UI for configuring OpenAI API integration
 */
'use client';

import { useState, useEffect } from 'react';
import { llmService, LLMConfig } from '@/lib/llmService';
import { audioManager } from '@/lib/audioManager';

interface LLMSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: (configured: boolean) => void;
  className?: string;
}

export function LLMSettings({ 
  isOpen, 
  onClose, 
  onConfigured,
  className = '' 
}: LLMSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>(['gpt-4', 'gpt-3.5-turbo']);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Load existing configuration
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      
      // Try to load existing config
      if (llmService.loadConfig()) {
        const config = llmService.getConfig();
        if (config) {
          setModel(config.model);
          setTemperature(config.temperature);
          setMaxTokens(config.maxTokens);
          setSystemPrompt(config.systemPrompt || '');
        }
      }
      
      // Load available models
      loadAvailableModels();
      setIsLoading(false);
    }
  }, [isOpen]);

  const loadAvailableModels = async () => {
    try {
      const models = await llmService.getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Please enter your OpenAI API key');
      return;
    }

    audioManager.playSound('notification');

    const config: LLMConfig = {
      apiKey: apiKey.trim(),
      model,
      temperature,
      maxTokens,
      systemPrompt: systemPrompt.trim() || undefined,
    };

    llmService.initialize(config);
    onConfigured?.(true);
    setTestResult(null);
    
    alert('LLM configuration saved successfully!');
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      alert('Please enter your OpenAI API key first');
      return;
    }

    setIsTesting(true);
    audioManager.playSound('click');

    // Temporarily configure the service for testing
    const tempConfig: LLMConfig = {
      apiKey: apiKey.trim(),
      model,
      temperature,
      maxTokens,
      systemPrompt,
    };

    llmService.initialize(tempConfig);

    try {
      const result = await llmService.testConnection();
      setTestResult(result);
      
      if (result.success) {
        // Reload models with the working API key
        await loadAvailableModels();
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    audioManager.playSound('click');
    
    if (confirm('Clear all LLM configuration? This will disable AI-generated stories.')) {
      llmService.clearConfig();
      setApiKey('');
      setModel('gpt-4');
      setTemperature(0.8);
      setMaxTokens(1000);
      setSystemPrompt('');
      setTestResult(null);
      onConfigured?.(false);
      
      alert('LLM configuration cleared');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <div className="bg-black/90 border border-green-400/30 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-400/30">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">🤖 AI Story Generator</h2>
            <div className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
              OpenAI Integration
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-400">Loading configuration...</div>
            </div>
          ) : (
            <>
              {/* API Key */}
              <div className="space-y-2">
                <label className="block text-white font-medium">
                  OpenAI API Key
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:border-green-400 focus:outline-none pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-sm"
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  Get your API key from{' '}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 underline"
                  >
                    OpenAI Platform
                  </a>
                </div>
              </div>

              {/* Test Connection */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTest}
                  disabled={isTesting || !apiKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
                
                {testResult && (
                  <div className={`text-sm px-3 py-1 rounded ${
                    testResult.success 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {testResult.success ? '✅ Connection successful' : `❌ ${testResult.error}`}
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="block text-white font-medium">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-white focus:border-green-400 focus:outline-none"
                >
                  {availableModels.map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-400">
                  Recommended: gpt-4 for best quality, gpt-3.5-turbo for faster responses
                </div>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <label className="block text-white font-medium">
                  Creativity (Temperature): {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #059669 0%, #059669 ${(temperature / 2) * 100}%, #4b5563 ${(temperature / 2) * 100}%, #4b5563 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Consistent (0.0)</span>
                  <span>Creative (2.0)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <label className="block text-white font-medium">
                  Max Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #059669 0%, #059669 ${((maxTokens - 100) / 1900) * 100}%, #4b5563 ${((maxTokens - 100) / 1900) * 100}%, #4b5563 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Short (100)</span>
                  <span>Long (2000)</span>
                </div>
              </div>

              {/* Custom System Prompt */}
              <div className="space-y-2">
                <label className="block text-white font-medium">
                  Custom System Prompt (Optional)
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Leave empty to use default prompt..."
                  rows={4}
                  className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:border-green-400 focus:outline-none resize-none"
                />
                <div className="text-xs text-gray-400">
                  Advanced: Customize how the AI behaves. Leave empty for default behavior.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-green-400/30">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              ⚠️ Your API key is stored locally and never shared
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClear}
                onMouseEnter={() => audioManager.playSound('hover')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
              
              <button
                onClick={handleSave}
                onMouseEnter={() => audioManager.playSound('hover')}
                disabled={!apiKey.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LLM button component
 */
interface LLMButtonProps {
  onClick: () => void;
  isConfigured: boolean;
  className?: string;
}

export function LLMButton({ onClick, isConfigured, className = '' }: LLMButtonProps) {
  return (
    <button
      onClick={() => {
        audioManager.playSound('click');
        onClick();
      }}
      onMouseEnter={() => audioManager.playSound('hover')}
      className={`relative p-2 rounded-full transition-all duration-200 ${
        isConfigured
          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
      } ${className}`}
      title="AI Story Generator Settings"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
      
      {/* Status indicator */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${
        isConfigured ? 'bg-green-400' : 'bg-gray-500'
      }`} />
    </button>
  );
}
