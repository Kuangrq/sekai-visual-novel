'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// 支持的角色名称
export type CharacterName = 'Lumine' | 'Tartaglia' | 'Venti' | 'Zhongli';

// 支持的表情状态
export type EmotionType = 
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking' 
  | 'confident' | 'concern' | 'annoyed' | 'blushing' | 'crying' 
  | 'disgusted' | 'fear' | 'deeply in love' | 'very happy';

interface CharacterAvatarProps {
  characterName: CharacterName;
  emotion?: EmotionType;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showTransition?: boolean;
}

// 表情名称映射到文件名
const emotionMap: Record<EmotionType, string> = {
  'neutral': 'Neutral',
  'happy': 'Happy',
  'sad': 'Sad',
  'angry': 'Angry',
  'surprised': 'Surprised',
  'thinking': 'Thinking',
  'confident': 'Confident',
  'concern': 'Concern',
  'annoyed': 'Annoyed',
  'blushing': 'Blushing',
  'crying': 'Crying',
  'disgusted': 'Disgusted',
  'fear': 'Fear',
  'deeply in love': 'Deeply In Love',
  'very happy': 'Very Happy'
};

// 尺寸样式配置
const sizeStyles = {
  small: 'w-16 h-16',
  medium: 'w-24 h-24',
  large: 'w-32 h-32'
};

export function CharacterAvatar({ 
  characterName, 
  emotion = 'neutral', 
  className = '',
  size = 'medium',
  showTransition = true 
}: CharacterAvatarProps) {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>(emotion);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 构建图片路径
  const getImagePath = (char: CharacterName, emo: EmotionType): string => {
    const emotionFile = emotionMap[emo] || emotionMap.neutral;
    return `/characters/${char}/${emotionFile}.png`;
  };

  // 处理表情变化动画
  useEffect(() => {
    if (emotion !== currentEmotion && showTransition) {
      setIsTransitioning(true);
      
      // 短暂延迟后切换表情
      const timeout = setTimeout(() => {
        setCurrentEmotion(emotion);
        setIsTransitioning(false);
      }, 150);
      
      return () => clearTimeout(timeout);
    } else if (emotion !== currentEmotion) {
      setCurrentEmotion(emotion);
    }
  }, [emotion, currentEmotion, showTransition]);

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
    console.warn(`Failed to load avatar: ${getImagePath(characterName, currentEmotion)}`);
  };

  // 如果图片加载失败，显示默认头像
  if (imageError) {
    return (
      <div className={`${sizeStyles[size]} ${className} bg-gray-700 rounded-full flex items-center justify-center`}>
        <div className="text-white text-center">
          <div className="text-xs font-bold">{characterName}</div>
          <div className="text-xs opacity-70">{emotion}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${sizeStyles[size]} ${className}`}>
      {/* 角色头像 */}
      <div 
        className={`relative w-full h-full rounded-full overflow-hidden border-2 border-cyan-400 shadow-lg transition-all duration-300 ${
          isTransitioning ? 'opacity-70 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <Image
          src={getImagePath(characterName, currentEmotion)}
          alt={`${characterName} - ${emotion}`}
          fill
          className="object-cover"
          onError={handleImageError}
          priority={size === 'large'}
        />
        
        {/* 发光效果 */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
      </div>

      {/* 角色名称标签 */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
          {characterName}
        </div>
      </div>

      {/* 表情状态指示器（开发模式） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-cyan-500 text-white text-xs px-1 py-0.5 rounded text-center min-w-12">
            {emotion}
          </div>
        </div>
      )}
    </div>
  );
}

// 角色头像切换器 - 支持多个角色同时显示
interface CharacterSwitcherProps {
  characters: Array<{
    name: CharacterName;
    emotion: EmotionType;
    isActive?: boolean;
  }>;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function CharacterSwitcher({ 
  characters, 
  className = '',
  size = 'medium' 
}: CharacterSwitcherProps) {
  return (
    <div className={`flex justify-center items-end space-x-4 ${className}`}>
      {characters.map((char, index) => (
        <div 
          key={`${char.name}-${index}`}
          className={`transition-all duration-500 ${
            char.isActive 
              ? 'scale-110 opacity-100' 
              : 'scale-90 opacity-60'
          }`}
        >
          <CharacterAvatar
            characterName={char.name}
            emotion={char.emotion}
            size={char.isActive ? size : size === 'large' ? 'medium' : 'small'}
            showTransition={true}
          />
        </div>
      ))}
    </div>
  );
}

// 角色表情预览组件（用于开发和测试）
export function EmotionPreview({ characterName }: { characterName: CharacterName }) {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('neutral');
  
  const emotions = Object.keys(emotionMap) as EmotionType[];

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="text-center mb-4">
        <CharacterAvatar
          characterName={characterName}
          emotion={selectedEmotion}
          size="large"
        />
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {emotions.map(emotion => (
          <button
            key={emotion}
            onClick={() => setSelectedEmotion(emotion)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedEmotion === emotion
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {emotion}
          </button>
        ))}
      </div>
    </div>
  );
}
