'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { imageCache } from '@/lib/imageCache';

/**
 * Character Avatar Component
 * Displays character portraits with emotion-based expressions and smooth transitions
 */

// Supported character names
export type CharacterName = 'Lumine' | 'Tartaglia' | 'Venti' | 'Zhongli';

// Supported emotion states
export type EmotionType = 
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking' 
  | 'confident' | 'concern' | 'annoyed' | 'blushing' | 'crying' 
  | 'disgusted' | 'fear' | 'deeply in love' | 'very happy';

interface CharacterAvatarProps {
  characterName: CharacterName;
  emotion?: EmotionType;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'huge' | 'portrait' | 'fullsize';
  showTransition?: boolean;
  shape?: 'circle' | 'rectangle';
}

// Emotion name to filename mapping
const emotionMap: Record<string, string> = {
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
  'very happy': 'Very Happy',
  // Alternative naming conventions
  'very_happy': 'Very Happy',
  'deeply_in_love': 'Deeply In Love'
};

// Size style configurations
const sizeStyles = {
  small: { circle: 'w-16 h-16', rectangle: 'w-12 h-16' },
  medium: { circle: 'w-24 h-24', rectangle: 'w-18 h-24' },
  large: { circle: 'w-32 h-32', rectangle: 'w-24 h-32' },
  xlarge: { circle: 'w-48 h-48', rectangle: 'w-36 h-48' },
  xxlarge: { circle: 'w-64 h-64', rectangle: 'w-48 h-64' },
  huge: { circle: 'w-80 h-80', rectangle: 'w-60 h-80' },
  portrait: { circle: 'w-96 h-96', rectangle: 'w-80 h-[28rem]' },
  fullsize: { circle: 'w-[120px] h-[120px]', rectangle: 'w-96 h-[40rem]' }
};

export function CharacterAvatar({ 
  characterName, 
  emotion = 'neutral', 
  className = '',
  size = 'medium',
  showTransition = true,
  shape = 'circle'
}: CharacterAvatarProps) {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>(emotion);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const mountedRef = useRef(true);

  // Build image path based on character and emotion
  const getImagePath = (char: CharacterName, emo: EmotionType): string => {
    const emotionFile = emotionMap[emo.toLowerCase()] || emotionMap.neutral;
    return `/characters/${char}/${emotionFile}.png`;
  };

  // 预加载当前角色的所有表情
  useEffect(() => {
    const preloadCharacter = async () => {
      try {
        await imageCache.preloadCharacterEmotions(characterName);
        if (mountedRef.current) {
          setIsPreloaded(true);
        }
      } catch (error) {
        console.warn(`预加载 ${characterName} 失败:`, error);
      }
    };

    preloadCharacter();
    
    return () => {
      mountedRef.current = false;
    };
  }, [characterName]);

  // 优化的状态切换逻辑
  useEffect(() => {
    if (emotion === currentEmotion) return;
    
    console.log(`🎭 Avatar 切换: ${characterName} ${currentEmotion} → ${emotion}`);
    
    const imagePath = getImagePath(characterName, emotion);
    const isCached = imageCache.isCached(imagePath);
    
    console.log(`📁 图片缓存状态: ${isCached ? '已缓存' : '未缓存'} - ${imagePath}`);
    
    if (showTransition && !isCached) {
      // 如果图片未缓存，使用较快的过渡
      setIsTransitioning(true);
      
      // 立即开始预加载
      imageCache.preloadImage(imagePath).then(() => {
        if (mountedRef.current) {
          setCurrentEmotion(emotion);
          setImageLoaded(false);
          
          setTimeout(() => {
            if (mountedRef.current) {
              setIsTransitioning(false);
            }
          }, 100);
        }
      }).catch(() => {
        if (mountedRef.current) {
          setCurrentEmotion(emotion);
          setIsTransitioning(false);
        }
      });
    } else {
      // 图片已缓存或不需要过渡，立即切换
      if (showTransition && isCached) {
        setIsTransitioning(true);
        setTimeout(() => {
          if (mountedRef.current) {
            setCurrentEmotion(emotion);
            setImageLoaded(true); // 已缓存的图片立即标记为已加载
            setTimeout(() => {
              if (mountedRef.current) {
                setIsTransitioning(false);
              }
            }, 50);
          }
        }, 50);
      } else {
        setCurrentEmotion(emotion);
        setImageLoaded(isCached);
      }
    }
  }, [emotion, characterName, currentEmotion, showTransition]);

  // Handle image loading errors
  const handleImageError = () => {
    setImageError(true);
    console.warn(`Failed to load avatar: ${getImagePath(characterName, currentEmotion)}`);
  };

  // Get size and shape styles
  const getSizeStyle = () => sizeStyles[size][shape];
  const getShapeStyle = () => shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  // Fallback avatar when image fails to load
  if (imageError) {
    return (
      <div className={`${getSizeStyle()} ${className} bg-gray-700 ${getShapeStyle()} flex items-center justify-center`}>
        <div className="text-white text-center">
          <div className="text-xs font-bold">{characterName}</div>
          <div className="text-xs opacity-70">{emotion}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${getSizeStyle()} ${className}`}>
      {/* Character avatar with advanced animations */}
      <div 
        className={`relative w-full h-full ${getShapeStyle()} overflow-hidden border-2 shadow-lg transition-all duration-500 ease-in-out transform ${
          isTransitioning 
            ? 'opacity-0 scale-90 rotate-2 border-cyan-300' 
            : 'opacity-100 scale-100 rotate-0 border-cyan-400 hover:scale-105 hover:shadow-2xl hover:border-cyan-300'
        }`}
        style={{
          filter: isTransitioning 
            ? 'blur(2px) brightness(0.8)' 
            : 'blur(0px) brightness(1) drop-shadow(0 0 20px rgba(34, 211, 238, 0.3))'
        }}
      >
        <Image
          src={imageError ? '/characters/Lumine/Neutral.png' : getImagePath(characterName, currentEmotion)}
          alt={`${characterName} - ${currentEmotion}`}
          fill
          className={`object-cover transition-all duration-300 ${
            isTransitioning ? 'opacity-70 scale-105' : 'opacity-100 scale-100'
          } ${!imageLoaded ? 'opacity-0' : ''}`}
          onError={handleImageError}
          onLoad={() => {
            if (mountedRef.current) {
              setImageLoaded(true);
              console.log(`✅ 图片渲染完成: ${characterName} - ${currentEmotion}`);
            }
          }}
          priority={size === 'large' || size === 'xlarge'}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Enhanced glow effect with pulsing */}
        <div className={`absolute inset-0 ${getShapeStyle()} transition-all duration-500 ${
          isTransitioning 
            ? 'bg-gradient-to-tr from-transparent via-white/5 to-transparent' 
            : 'bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-pulse'
        }`} />
        
        {/* 加载指示器 */}
        {!imageLoaded && (
          <div className={`absolute inset-0 ${getShapeStyle()} bg-gray-700/50 flex items-center justify-center`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        )}

        {/* Shimmer effect during transition */}
        {isTransitioning && (
          <div className={`absolute inset-0 ${getShapeStyle()} bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse`} />
        )}
      </div>

      {/* Character name label with animation */}
      <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 transition-all duration-500 ${
        isTransitioning ? 'opacity-50 scale-95 translate-y-1' : 'opacity-100 scale-100 translate-y-0'
      }`}>
        <div className={`bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap transition-all duration-300 ${
          isTransitioning ? 'bg-black/60' : 'bg-black/80 hover:bg-black/90'
        }`}>
          {characterName}
        </div>
      </div>

      {/* Emotion state indicator (development mode only) */}
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

/**
 * Character switcher component - supports displaying multiple characters simultaneously
 */
interface CharacterSwitcherProps {
  characters: Array<{
    name: CharacterName;
    emotion: EmotionType;
    isActive?: boolean;
  }>;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
}

/**
 * Character switcher component with enhanced animations
 * Features staggered transitions and visual indicators for the active character
 */
export function CharacterSwitcher({ 
  characters, 
  className = '',
  size = 'medium' 
}: CharacterSwitcherProps) {
  return (
    <div className={`flex justify-center items-end space-x-6 ${className}`}>
      {characters.map((char, index) => (
        <div 
          key={`${char.name}-${index}`}
          className={`relative transition-all duration-700 ease-out transform ${
            char.isActive 
              ? 'scale-110 opacity-100 translate-y-0 z-10' 
              : 'scale-85 opacity-50 translate-y-3 z-0 hover:scale-90 hover:opacity-70 hover:translate-y-1'
          }`}
          style={{
            // Stagger animation timing for a wave effect
            transitionDelay: `${index * 150}ms`,
            filter: char.isActive 
              ? 'brightness(1.1) saturate(1.2) drop-shadow(0 0 25px rgba(34, 211, 238, 0.4))' 
              : 'brightness(0.7) saturate(0.6)',
          }}
        >
          <CharacterAvatar
            characterName={char.name}
            emotion={char.emotion}
            size={char.isActive ? size : 
              size === 'xxlarge' ? 'xlarge' :
              size === 'xlarge' ? 'large' :
              size === 'large' ? 'medium' : 'small'}
            showTransition={true}
            className={char.isActive ? 'animate-pulse' : ''}
          />
          
          {/* Active character indicator */}
          {char.isActive && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce shadow-lg" 
                     style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-cyan-300 rounded-full animate-bounce shadow-md mx-1" 
                     style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce shadow-lg" 
                     style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
        {/* Glow ring for active character */}
        {char.isActive && (
          <div className={`absolute inset-0 ${char.isActive ? 'rounded-lg' : 'rounded-full'} border-2 border-cyan-400/30 animate-ping pointer-events-none`} />
        )}
        </div>
      ))}
    </div>
  );
}

/**
 * Character emotion preview component (for development and testing)
 */
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
