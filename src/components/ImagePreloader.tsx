'use client';

import { useEffect, useState } from 'react';
import { imageCache } from '@/lib/imageCache';

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
    const preloadAllAssets = async () => {
      try {
        // 预加载背景图片
        const backgroundImages = ['/assets/background.jpg'];
        
        setTotalCount(backgroundImages.length + 4); // 4个角色
        
        // 预加载背景
        for (const img of backgroundImages) {
          try {
            await imageCache.preloadImage(img);
            setLoadedCount(prev => prev + 1);
          } catch (error) {
            console.warn(`背景图片预加载失败: ${img}`, error);
            setLoadedCount(prev => prev + 1);
          }
        }
        
        // 预加载所有角色（并行）
        const characters = ['Lumine', 'Tartaglia', 'Venti', 'Zhongli'];
        const preloadPromises = characters.map(async (character) => {
          try {
            await imageCache.preloadCharacterEmotions(character);
            setLoadedCount(prev => prev + 1);
          } catch (error) {
            console.warn(`角色 ${character} 预加载失败:`, error);
            setLoadedCount(prev => prev + 1);
          }
        });
        
        await Promise.allSettled(preloadPromises);
        
        console.log('🎉 所有资源预加载完成');
        onLoadComplete?.();
        
      } catch (error) {
        console.error('预加载过程中出现错误:', error);
        onLoadComplete?.();
      }
    };

    preloadAllAssets();
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
