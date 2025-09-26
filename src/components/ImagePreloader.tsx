'use client';

import { useEffect, useState } from 'react';

/**
 * Image Preloader Component
 * 预加载关键图片资源以改善 Vercel 部署后的性能
 */

interface ImagePreloaderProps {
  onLoadComplete?: () => void;
}

export function ImagePreloader({ onLoadComplete }: ImagePreloaderProps) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // 需要预加载的关键图片
    const imagesToPreload = [
      '/assets/background.jpg',
      // 主要角色的默认表情
      '/characters/Lumine/Neutral.png',
      '/characters/Tartaglia/Neutral.png',
      '/characters/Venti/Neutral.png',
      '/characters/Zhongli/Neutral.png',
      // 常用表情
      '/characters/Lumine/Happy.png',
      '/characters/Lumine/Surprised.png',
      '/characters/Tartaglia/Confident.png',
      '/characters/Tartaglia/Very Happy.png',
      '/characters/Venti/Happy.png',
      '/characters/Venti/Confident.png',
      '/characters/Zhongli/Thinking.png',
      '/characters/Zhongli/Neutral.png',
    ];

    setTotalCount(imagesToPreload.length);

    const preloadImage = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          setLoadedCount(prev => prev + 1);
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to preload image: ${src}`);
          setLoadedCount(prev => prev + 1); // 即使失败也计算，避免卡住
          resolve(); // 不要 reject，继续加载其他图片
        };
        img.src = src;
      });
    };

    // 并行预加载所有图片
    Promise.all(imagesToPreload.map(preloadImage))
      .then(() => {
        console.log('所有关键图片预加载完成');
        onLoadComplete?.();
      })
      .catch((error) => {
        console.error('图片预加载过程中出现错误:', error);
        onLoadComplete?.(); // 即使有错误也继续
      });
  }, [onLoadComplete]);

  const progress = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-64 h-2 bg-gray-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-white text-lg mb-2">加载资源中...</p>
        <p className="text-gray-300 text-sm">
          {loadedCount} / {totalCount} 图片已加载
        </p>
      </div>
    </div>
  );
}
