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
          fastMode
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
  }, [storyHistory, onStoryUpdate, fastMode]);

  // Start the game with user's initial prompt
  const startGame = async () => {
    if (!userPrompt.trim()) return;
    
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
      
      // Play character transition sound if character changes
      if (nextSegment.type === 'character' && currentSegment.type === 'character' && 
          nextSegment.name !== currentSegment.name) {
        audioManager.playSound('character_enter');
      }
      
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
  const handleSave = (gameState: GameSave['gameState']) => {
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

  // Check for existing history on component mount
  useEffect(() => {
    const existingHistory = saveManager.getConversationHistory();
    setHasHistory(existingHistory.length > 0);
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

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black flex items-center justify-center">
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
          <AudioControls />
        </div>
        
        <div className="max-w-2xl mx-auto p-8 text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              AI Visual Novel Adventure
            </h1>
            <p className="text-gray-300 text-lg">
              Begin your personalized AI-driven story journey
            </p>
          </div>
          
          <div className="bg-black/40 rounded-lg p-6 backdrop-blur-sm">
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
            
            {/* Fast mode toggle */}
            <div className="mt-4 flex items-center justify-center space-x-3">
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
    );
  }

  return (
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
          <div className="flex-shrink-0 pt-8 pb-6">
            <div className="flex justify-center">
               <CharacterAvatar
                 characterName={currentCharacter.name}
                 emotion={currentCharacter.emotion}
                 size="xxlarge"
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
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoice(choice.id, choice.text)}
                    onMouseEnter={() => audioManager.playSound('hover')} // Play hover sound
                    className="w-full p-4 bg-black/60 hover:bg-black/80 text-white rounded-lg border border-cyan-400/30 hover:border-cyan-400 transition-all duration-200 text-left backdrop-blur-sm"
                  >
                    {choice.text}
                  </button>
                ))}
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
    </div>
  );
}
