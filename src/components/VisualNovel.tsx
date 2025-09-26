/**
 * Visual Novel Component
 * Main component that orchestrates the entire visual novel experience
 * Handles story flow, character display, user choices, and streaming content
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { CharacterAvatar, CharacterName, EmotionType } from './CharacterAvatar';
import { TypingText } from './TypingText';
import { parseSimpleXML, ParsedSegment } from '@/lib/xmlParser';
import { audioManager } from '@/lib/audioManager';
import { AudioControls } from './AudioControls';
import { ConversationHistory, HistoryButton } from './ConversationHistory';
import { SaveManagerComponent, SaveLoadButton } from './SaveManager';
import { saveManager, GameSave } from '@/lib/saveManager';
import { LLMSettings, LLMButton, LLMSettingsInline } from './LLMSettings';
import { llmService } from '@/lib/llmService';

interface Choice {
  id: string;
  text: string;
}

interface VisualNovelProps {
  onStoryUpdate?: (segments: ParsedSegment[]) => void;
}

export function VisualNovel({ onStoryUpdate }: VisualNovelProps) {
  const [currentSegments, setCurrentSegments] = useState<ParsedSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [storyHistory, setStoryHistory] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [fastMode, setFastMode] = useState(false);
  
  // History and save state
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveManager, setShowSaveManager] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [playStartTime, setPlayStartTime] = useState<Date | null>(null);
  
  // LLM state
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [isLLMConfigured, setIsLLMConfigured] = useState(false);
  const [useLLM, setUseLLM] = useState(false);
  

  // Get currently displayed character and emotion
  const getCurrentCharacter = (): { name: CharacterName; emotion: EmotionType } | null => {
    const currentSegment = currentSegments[currentSegmentIndex];
    if (currentSegment?.type === 'character') {
      return {
        name: currentSegment.name as CharacterName,
        emotion: currentSegment.expression as EmotionType
      };
    }
    return null;
  };

  // Fetch story content from API with streaming support
  const fetchStory = useCallback(async (choice?: string, prompt?: string) => {
    setIsLoading(true);
    
    // Get LLM config if needed
    let llmConfig = null;
    if (useLLM && isLLMConfigured) {
      try {
        const saved = localStorage.getItem('visual-novel-llm-config');
        if (saved) {
          llmConfig = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Failed to load LLM config for API request:', error);
      }
    }
    
    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choice,
          prompt,
          storyHistory,
          fastMode,
          useLLM: useLLM && isLLMConfigured,
          llmConfig
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let xmlContent = ''; // Accumulate complete XML content

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              if (data.type === 'content') {
                xmlContent += data.data;
              } else if (data.type === 'complete') {
                // Story segment complete, parse full XML
                const segments = parseSimpleXML(xmlContent);
                setCurrentSegments(segments);
                setCurrentSegmentIndex(0);
                setChoices(data.choices || []);
                onStoryUpdate?.(segments);
              }
            } catch (error) {
              console.error('Failed to parse JSON:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch story:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storyHistory, onStoryUpdate, fastMode, useLLM, isLLMConfigured]);

  // Start the game with user's initial prompt
  const startGame = async () => {
    if (!userPrompt.trim()) return;
    
    // Check if user wants to use LLM but it's not configured
    if (useLLM && !isLLMConfigured) {
      audioManager.playSound('click');
      alert('Please configure your OpenAI API key first to use AI-generated stories.');
      setShowLLMSettings(true);
      return;
    }
    
    audioManager.playSound('notification'); // Play game start sound
    setGameStarted(true);
    setStoryHistory([userPrompt]);
    setPlayStartTime(new Date());
    
    // Add user input to conversation history
    saveManager.addToHistory({
      type: 'user_input',
      content: userPrompt,
    });
    setHasHistory(true);
    
    await fetchStory(undefined, userPrompt);
  };

  // Handle user choice selection
  const handleChoice = async (choiceId: string, choiceText: string) => {
    audioManager.playSound('select'); // Play selection sound
    
    // Check if user wants to end the story
    if (choiceId === 'end_story') {
      audioManager.playSound('notification'); // Play end sound
      
      // Add choice to conversation history
      saveManager.addToHistory({
        type: 'user_choice',
        content: choiceText,
      });
      
      // Add a farewell message to history
      saveManager.addToHistory({
        type: 'story_segment',
        content: 'Story ended by user choice.',
      });
      
      // Reset game state and return to home
      setGameStarted(false);
      setCurrentSegments([]);
      setCurrentSegmentIndex(0);
      setChoices([]);
      setStoryHistory([]);
      setUserPrompt('');
      return;
    }
    
    setStoryHistory(prev => [...prev, choiceText]);
    setChoices([]);
    
    // Add choice to conversation history
    saveManager.addToHistory({
      type: 'user_choice',
      content: choiceText,
    });
    
    await fetchStory(choiceId);
  };

  // Handle completion of current text segment
  const handleSegmentComplete = () => {
    const currentSegment = currentSegments[currentSegmentIndex];
    
    // Add completed segment to conversation history
    if (currentSegment) {
      saveManager.addToHistory({
        type: 'story_segment',
        content: currentSegment.text,
        character: currentSegment.type === 'character' ? currentSegment.name : undefined,
        emotion: currentSegment.type === 'character' ? currentSegment.expression : undefined,
        segmentData: currentSegment,
      });
    }
    
    if (currentSegmentIndex < currentSegments.length - 1) {
      // Play transition sound when moving to next segment
      const nextSegment = currentSegments[currentSegmentIndex + 1];
      
      // Character transition without sound effect
      
      setCurrentSegmentIndex(prev => prev + 1);
    }
  };

  // Initialize saved progress state on client side
  useEffect(() => {
    // Check for saved progress only on client side to avoid hydration mismatch
    setHasSavedProgress(!!saveManager.loadAutoSave());
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (gameStarted && currentSegments.length > 0) {
      const gameState = {
        userPrompt,
        storyHistory,
        conversationHistory: saveManager.getConversationHistory(),
        currentSegmentIndex,
        currentSegments,
        choices,
        gameStarted,
        fastMode,
      };
      
      const playTime = playStartTime ? Math.floor((Date.now() - playStartTime.getTime()) / 1000) : 0;
      saveManager.autoSave(gameState, playTime);
      setHasSavedProgress(true);
    }
  }, [gameStarted, currentSegments, currentSegmentIndex, choices, storyHistory, userPrompt, fastMode, playStartTime]);

  // Save/Load handlers
  const handleSave = (_gameState: GameSave['gameState']) => {
    audioManager.playSound('notification');
    // Save is handled by the SaveManager component
  };

  const handleLoad = (save: GameSave) => {
    audioManager.playSound('notification');
    const state = save.gameState;
    
    // Restore game state
    setUserPrompt(state.userPrompt);
    setStoryHistory(state.storyHistory);
    setCurrentSegments(state.currentSegments);
    setCurrentSegmentIndex(state.currentSegmentIndex);
    setChoices(state.choices);
    setGameStarted(state.gameStarted);
    setFastMode(state.fastMode);
    setPlayStartTime(new Date(Date.now() - save.playTime * 1000)); // Adjust start time
    setHasHistory(true);
    setHasSavedProgress(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHistory) setShowHistory(false);
        if (showSaveManager) setShowSaveManager(false);
      }
      
      // Ctrl+H for history
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        if (hasHistory && !showSaveManager) {
          setShowHistory(!showHistory);
        }
      }
      
      // Ctrl+S for save manager
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (gameStarted && !showHistory) {
          setShowSaveManager(!showSaveManager);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showHistory, showSaveManager, hasHistory, gameStarted]);

  // Check for existing history and LLM config on component mount
  useEffect(() => {
    const existingHistory = saveManager.getConversationHistory();
    setHasHistory(existingHistory.length > 0);
    
    // Check if LLM is configured
    const checkLLMConfig = () => {
      if (llmService.loadConfig()) {
        setIsLLMConfigured(true);
        // Auto-enable LLM if configured
        setUseLLM(true);
      } else {
        setIsLLMConfigured(false);
      }
    };
    
    checkLLMConfig();
  }, []);

  const currentCharacter = getCurrentCharacter();

  const currentGameState = gameStarted ? {
    userPrompt,
    storyHistory,
    conversationHistory: saveManager.getConversationHistory(),
    currentSegmentIndex,
    currentSegments,
    choices,
    gameStarted,
    fastMode,
  } : undefined;

  return (
    <>
      {!gameStarted ? (
      <div className="min-h-screen relative bg-gradient-to-b from-purple-900 via-blue-900 to-black flex items-center justify-center">
        {/* Homepage background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: 'url(/assets/homepage-background.jpg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        {/* Control panel */}
        <div className="absolute top-4 right-4 z-50 flex space-x-2">
          <HistoryButton 
            onClick={() => setShowHistory(true)} 
            hasHistory={hasHistory} 
          />
          <SaveLoadButton 
            onClick={() => setShowSaveManager(true)} 
            hasProgress={hasSavedProgress} 
          />
          <LLMButton 
            onClick={() => setShowLLMSettings(true)} 
            isConfigured={isLLMConfigured} 
          />
          <AudioControls />
        </div>
        
        <div className="relative z-10 max-w-2xl mx-auto p-8 text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              AI Visual Novel Adventure
            </h1>
            
            {/* LLM设置弹窗 */}
            {showLLMSettings && (
              <LLMSettingsInline 
                onClose={() => setShowLLMSettings(false)}
                onConfigured={(configured) => {
                  setIsLLMConfigured(configured);
                  if (configured) {
                    setUseLLM(true);
                  }
                  setShowLLMSettings(false);
                }}
              />
            )}
            
            <p className="text-gray-300 text-lg">
              Begin your personalized AI-driven story journey
            </p>
          </div>
          
          <div className="bg-black/60 rounded-lg p-6 backdrop-blur-md border border-cyan-400/20 shadow-2xl">
            <label className="block text-white text-sm font-medium mb-3">
              Enter your story beginning:
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="For example: A lone wanderer discovers a hidden ancient library in the middle of a desert..."
              className="w-full h-32 p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-cyan-400 focus:outline-none resize-none"
              maxLength={500}
            />
            <div className="text-gray-400 text-sm mt-2 text-right">
              {userPrompt.length}/500
            </div>
            
             {/* Game options */}
             <div className="mt-4 space-y-3">
               <div className="flex items-center justify-center">
                 <label className="flex items-center space-x-2 text-gray-300 text-sm cursor-pointer">
                   <input
                     type="checkbox"
                     checked={fastMode}
                     onChange={(e) => setFastMode(e.target.checked)}
                     className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-600 rounded focus:ring-cyan-400 focus:ring-2"
                   />
                   <span>Fast mode (instant story loading)</span>
                 </label>
               </div>
               
               <div className="flex items-center justify-center">
                 <label className="flex items-center space-x-2 text-gray-300 text-sm cursor-pointer">
                   <input
                     type="checkbox"
                     checked={useLLM}
                     onChange={(e) => setUseLLM(e.target.checked)}
                     className="w-4 h-4 text-green-500 bg-gray-800 border-gray-600 rounded focus:ring-green-400 focus:ring-2"
                   />
                   <span>🤖 AI-Generated Story (OpenAI)</span>
                   {isLLMConfigured && (
                     <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                       Ready
                     </span>
                   )}
                   {!isLLMConfigured && useLLM && (
                     <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                       Not Configured
                     </span>
                   )}
                 </label>
               </div>
               
               {!isLLMConfigured && (
                 <div className="flex items-center justify-center">
                   <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded px-3 py-2 text-center">
                     ⚙️ Click the AI settings button above to configure AI stories
                   </div>
                 </div>
               )}
             </div>
            
            <button
              onClick={startGame}
              onMouseEnter={() => audioManager.playSound('hover')} // Play hover sound
              disabled={!userPrompt.trim() || isLoading}
              className="mt-4 w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? 'Generating Story...' : 'Begin Adventure'}
            </button>
          </div>
        </div>
      </div>
      ) : (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black">
      {/* Control panel */}
      <div className="absolute top-4 right-4 z-50 flex space-x-2">
        <HistoryButton 
          onClick={() => setShowHistory(true)} 
          hasHistory={hasHistory} 
        />
        <SaveLoadButton 
          onClick={() => setShowSaveManager(true)} 
          hasProgress={hasSavedProgress || gameStarted} 
        />
        <LLMButton 
          onClick={() => setShowLLMSettings(true)} 
          isConfigured={isLLMConfigured} 
        />
        <AudioControls />
      </div>
      
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: 'url(/assets/background.jpg)' }}
      />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Character display area */}
        {currentCharacter && (
          <div className="flex-shrink-0 pt-4 pb-4">
            <div className="flex justify-center">
               <CharacterAvatar
                 characterName={currentCharacter.name}
                 emotion={currentCharacter.emotion}
                 size="fullsize"
                 shape="rectangle"
                 showTransition={true}
                 className="drop-shadow-2xl"
               />
            </div>
          </div>
        )}
        
        {/* Story text area */}
        <div className="flex-grow flex items-end">
          <div className="w-full max-w-4xl mx-auto p-6">
            <div className="bg-black/70 rounded-lg p-6 backdrop-blur-sm border border-cyan-400/30">
              {currentSegments.length > 0 && currentSegmentIndex < currentSegments.length && (
                <TypingText
                  text={currentSegments[currentSegmentIndex].text}
                  speed={50}
                  onComplete={handleSegmentComplete}
                  className="text-lg"
                  allowSkip={true}
                />
              )}
              
              {isLoading && (
                <div className="text-center text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Generating story...
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Choice selection area */}
        {choices.length > 0 && !isLoading && (
          <div className="flex-shrink-0 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-3">
                {choices.map((choice) => {
                  const isEndChoice = choice.id === 'end_story';
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleChoice(choice.id, choice.text)}
                      onMouseEnter={() => audioManager.playSound('hover')} // Play hover sound
                      className={`w-full p-4 text-white rounded-lg border transition-all duration-200 text-left backdrop-blur-sm ${
                        isEndChoice
                          ? 'bg-red-900/60 hover:bg-red-900/80 border-red-400/30 hover:border-red-400'
                          : 'bg-black/60 hover:bg-black/80 border-cyan-400/30 hover:border-cyan-400'
                      }`}
                    >
                      {choice.text}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Story completion */}
        {choices.length === 0 && !isLoading && currentSegments.length > 0 && currentSegmentIndex >= currentSegments.length - 1 && (
          <div className="flex-shrink-0 p-6">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-black/60 rounded-lg p-8 backdrop-blur-sm border border-cyan-400/30">
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">
                  Story Complete
                </h3>
                <p className="text-gray-300 mb-6">
                  Your journey in Liyue Harbor has come to an end... for now.
                </p>
                <button
                  onClick={() => {
                    audioManager.playSound('notification'); // Play restart sound
                    setGameStarted(false);
                    setCurrentSegments([]);
                    setCurrentSegmentIndex(0);
                    setChoices([]);
                    setStoryHistory([]);
                    setUserPrompt('');
                  }}
                  onMouseEnter={() => audioManager.playSound('hover')} // Play hover sound
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200"
                >
                  Start New Adventure
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
      )}
      
      {/* History Modal */}
      <ConversationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
      
      {/* Save Manager Modal */}
      <SaveManagerComponent
        isOpen={showSaveManager}
        onClose={() => setShowSaveManager(false)}
        onSave={handleSave}
        onLoad={handleLoad}
        currentGameState={currentGameState}
      />
    </>
  );
}
