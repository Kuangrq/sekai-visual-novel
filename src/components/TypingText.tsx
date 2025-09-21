'use client';

import { useState, useEffect, useCallback } from 'react';

interface TypingTextProps {
  text: string;
  speed?: number; // 毫秒/字符
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
  allowSkip?: boolean;
}

export function TypingText({ 
  text, 
  speed = 50, 
  onComplete, 
  onSkip,
  className = '',
  allowSkip = true 
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  // 跳过动画，直接显示完整文本
  const skipAnimation = useCallback(() => {
    if (!isComplete && allowSkip) {
      setIsSkipped(true);
      setDisplayedText(text);
      setCurrentIndex(text.length);
      setIsComplete(true);
      onSkip?.();
      onComplete?.();
    }
  }, [text, isComplete, allowSkip, onSkip, onComplete]);

  // 键盘事件处理 - 按任意键跳过
  useEffect(() => {
    const handleKeyPress = () => {
      if (allowSkip && !isComplete) {
        skipAnimation();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [skipAnimation, allowSkip, isComplete]);

  // 点击事件处理
  const handleClick = () => {
    if (allowSkip && !isComplete) {
      skipAnimation();
    }
  };

  // 打字动画效果
  useEffect(() => {
    if (isSkipped || currentIndex >= text.length) {
      if (!isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayedText(prev => prev + text[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed, isSkipped, isComplete, onComplete]);

  // 当文本改变时重置状态
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
    setIsSkipped(false);
  }, [text]);

  return (
    <div 
      className={`relative ${className}`}
      onClick={handleClick}
      style={{ cursor: allowSkip && !isComplete ? 'pointer' : 'default' }}
    >
      <p className="text-white leading-relaxed">
        {displayedText}
        {!isComplete && (
          <span className="animate-pulse ml-1 text-cyan-400">|</span>
        )}
      </p>
      
      {/* 跳过提示 */}
      {allowSkip && !isComplete && (
        <div className="absolute bottom-0 right-0 text-xs text-gray-400 opacity-70">
          Click or press any key to skip
        </div>
      )}
    </div>
  );
}

// 高级打字机组件 - 支持多段文本
interface MultiTypingTextProps {
  segments: Array<{
    text: string;
    className?: string;
    delay?: number; // 段落间延迟
  }>;
  speed?: number;
  onAllComplete?: () => void;
  allowSkip?: boolean;
}

export function MultiTypingText({ 
  segments, 
  speed = 50, 
  onAllComplete,
  allowSkip = true 
}: MultiTypingTextProps) {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [completedSegments, setCompletedSegments] = useState<string[]>([]);

  const handleSegmentComplete = useCallback(() => {
    const currentSegment = segments[currentSegmentIndex];
    setCompletedSegments(prev => [...prev, currentSegment.text]);
    
    if (currentSegmentIndex < segments.length - 1) {
      // 移动到下一段
      setTimeout(() => {
        setCurrentSegmentIndex(prev => prev + 1);
      }, currentSegment.delay || 500);
    } else {
      // 所有段落完成
      onAllComplete?.();
    }
  }, [currentSegmentIndex, segments, onAllComplete]);

  const skipAll = useCallback(() => {
    if (allowSkip) {
      const allTexts = segments.map(s => s.text);
      setCompletedSegments(allTexts);
      setCurrentSegmentIndex(segments.length);
      onAllComplete?.();
    }
  }, [segments, allowSkip, onAllComplete]);

  // 重置状态当segments改变时
  useEffect(() => {
    setCurrentSegmentIndex(0);
    setCompletedSegments([]);
  }, [segments]);

  if (segments.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* 已完成的段落 */}
      {completedSegments.map((text, index) => (
        <p 
          key={index} 
          className={`text-white leading-relaxed ${segments[index]?.className || ''}`}
        >
          {text}
        </p>
      ))}
      
      {/* 当前正在打字的段落 */}
      {currentSegmentIndex < segments.length && (
        <TypingText
          text={segments[currentSegmentIndex].text}
          speed={speed}
          onComplete={handleSegmentComplete}
          className={segments[currentSegmentIndex].className}
          allowSkip={allowSkip}
          onSkip={skipAll}
        />
      )}
    </div>
  );
}
