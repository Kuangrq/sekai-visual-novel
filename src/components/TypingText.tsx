'use client';

import { useState, useEffect, useCallback } from 'react';

interface TypingTextProps {
  text: string;
  speed?: number; // milliseconds per character
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

  // Skip animation and show complete text immediately
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

  // Handle keyboard events - any key press to skip
  useEffect(() => {
    const handleKeyPress = () => {
      if (allowSkip && !isComplete) {
        skipAnimation();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [skipAnimation, allowSkip, isComplete]);

  // Handle click events
  const handleClick = () => {
    if (allowSkip && !isComplete) {
      skipAnimation();
    }
  };

  // Typing animation effect
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

  // Reset state when text changes
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
      
      {/* Skip hint */}
      {allowSkip && !isComplete && (
        <div className="absolute bottom-0 right-0 text-xs text-gray-400 opacity-70">
          Click or press any key to skip
        </div>
      )}
    </div>
  );
}

/**
 * Advanced typing component that supports multiple text segments
 */
interface MultiTypingTextProps {
  segments: Array<{
    text: string;
    className?: string;
    delay?: number; // delay between segments
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
      // Move to next segment
      setTimeout(() => {
        setCurrentSegmentIndex(prev => prev + 1);
      }, currentSegment.delay || 500);
    } else {
      // All segments completed
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

  // Reset state when segments change
  useEffect(() => {
    setCurrentSegmentIndex(0);
    setCompletedSegments([]);
  }, [segments]);

  if (segments.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Completed segments */}
      {completedSegments.map((text, index) => (
        <p 
          key={index} 
          className={`text-white leading-relaxed ${segments[index]?.className || ''}`}
        >
          {text}
        </p>
      ))}
      
      {/* Currently typing segment */}
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
