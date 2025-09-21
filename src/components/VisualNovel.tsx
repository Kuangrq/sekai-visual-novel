'use client';

import { useState, useEffect, useCallback } from 'react';
import { CharacterAvatar, CharacterName, EmotionType } from './CharacterAvatar';
import { TypingText } from './TypingText';
import { parseSimpleXML, ParsedSegment } from '@/lib/xmlParser';

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

  // 当前显示的角色和表情
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

  // 获取故事内容
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
          storyHistory
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
                // 累积接收到的XML内容
                // 这里应该实时解析并更新UI
                console.log('Received chunk:', data.data);
              } else if (data.type === 'complete') {
                // 故事段落完成，解析完整的XML
                const xmlContent = buffer; // 这里应该是完整的XML内容
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
  }, [storyHistory, onStoryUpdate]);

  // 开始游戏
  const startGame = async () => {
    if (!userPrompt.trim()) return;
    
    setGameStarted(true);
    setStoryHistory([userPrompt]);
    await fetchStory(undefined, userPrompt);
  };

  // 处理用户选择
  const handleChoice = async (choiceId: string, choiceText: string) => {
    setStoryHistory(prev => [...prev, choiceText]);
    setChoices([]);
    await fetchStory(choiceId);
  };

  // 处理当前段落完成
  const handleSegmentComplete = () => {
    if (currentSegmentIndex < currentSegments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    }
  };

  // 当前角色信息
  const currentCharacter = getCurrentCharacter();

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8 text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              AI 视觉小说冒险
            </h1>
            <p className="text-gray-300 text-lg">
              开始你的专属AI驱动故事之旅
            </p>
          </div>
          
          <div className="bg-black/40 rounded-lg p-6 backdrop-blur-sm">
            <label className="block text-white text-sm font-medium mb-3">
              输入你的故事开头：
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="例如：一个孤独的旅行者在沙漠中发现了一座隐藏的古老图书馆..."
              className="w-full h-32 p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-cyan-400 focus:outline-none resize-none"
              maxLength={500}
            />
            <div className="text-gray-400 text-sm mt-2 text-right">
              {userPrompt.length}/500
            </div>
            
            <button
              onClick={startGame}
              disabled={!userPrompt.trim() || isLoading}
              className="mt-4 w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? '生成故事中...' : '开始冒险'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black">
      {/* 背景图片 */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: 'url(/assets/background.jpg)' }}
      />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 角色显示区域 */}
        {currentCharacter && (
          <div className="flex-shrink-0 pt-8 pb-4">
            <div className="flex justify-center">
              <CharacterAvatar
                characterName={currentCharacter.name}
                emotion={currentCharacter.emotion}
                size="large"
                showTransition={true}
              />
            </div>
          </div>
        )}
        
        {/* 故事文本区域 */}
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
                  故事生成中...
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 选择区域 */}
        {choices.length > 0 && !isLoading && (
          <div className="flex-shrink-0 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-3">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoice(choice.id, choice.text)}
                    className="w-full p-4 bg-black/60 hover:bg-black/80 text-white rounded-lg border border-cyan-400/30 hover:border-cyan-400 transition-all duration-200 text-left backdrop-blur-sm"
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
