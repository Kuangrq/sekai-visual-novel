/**
 * 智能图片缓存管理器
 * 解决 Vercel 部署后的图片加载延迟和卡顿问题
 */

class ImageCacheManager {
  private cache = new Map<string, HTMLImageElement>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private preloadQueue: string[] = [];
  private isPreloading = false;

  /**
   * 预加载图片并缓存
   */
  async preloadImage(src: string): Promise<HTMLImageElement> {
    // 如果已经缓存，直接返回
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    // 如果正在加载，返回现有的 Promise
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    // 创建新的加载 Promise
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      const onLoad = () => {
        this.cache.set(src, img);
        this.loadingPromises.delete(src);
        console.log(`✅ 图片缓存完成: ${src}`);
        resolve(img);
      };

      const onError = () => {
        this.loadingPromises.delete(src);
        console.warn(`❌ 图片加载失败: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });
      
      // 设置较短的超时时间
      setTimeout(() => {
        if (!this.cache.has(src)) {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          onError();
        }
      }, 10000); // 10秒超时

      img.src = src;
    });

    this.loadingPromises.set(src, loadPromise);
    return loadPromise;
  }

  /**
   * 批量预加载图片
   */
  async preloadImages(srcs: string[]): Promise<void> {
    console.log(`🚀 开始批量预加载 ${srcs.length} 张图片`);
    
    // 分批加载，避免一次性加载太多
    const batchSize = 4;
    for (let i = 0; i < srcs.length; i += batchSize) {
      const batch = srcs.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(src => this.preloadImage(src))
      );
      
      // 小延迟避免阻塞主线程
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`✅ 批量预加载完成`);
  }

  /**
   * 获取缓存的图片
   */
  getCachedImage(src: string): HTMLImageElement | null {
    return this.cache.get(src) || null;
  }

  /**
   * 检查图片是否已缓存
   */
  isCached(src: string): boolean {
    return this.cache.has(src);
  }

  /**
   * 检查图片是否正在加载
   */
  isLoading(src: string): boolean {
    return this.loadingPromises.has(src);
  }

  /**
   * 预加载角色的所有表情
   */
  async preloadCharacterEmotions(characterName: string): Promise<void> {
    const emotions = [
      'Neutral', 'Happy', 'Sad', 'Angry', 'Surprised', 'Thinking',
      'Confident', 'Concern', 'Annoyed', 'Blushing', 'Crying',
      'Disgusted', 'Fear', 'Deeply In Love', 'Very Happy'
    ];

    const imagePaths = emotions.map(emotion => 
      `/characters/${characterName}/${emotion}.png`
    );

    await this.preloadImages(imagePaths);
  }

  /**
   * 预加载所有核心角色资源
   */
  async preloadAllCharacters(): Promise<void> {
    const characters = ['Lumine', 'Tartaglia', 'Venti', 'Zhongli'];
    
    console.log('🎭 开始预加载所有角色头像');
    
    // 并行预加载所有角色
    await Promise.allSettled(
      characters.map(character => this.preloadCharacterEmotions(character))
    );
    
    console.log('✅ 所有角色头像预加载完成');
  }

  /**
   * 清理缓存（如果需要）
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    console.log('🧹 图片缓存已清理');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { cached: number; loading: number } {
    return {
      cached: this.cache.size,
      loading: this.loadingPromises.size
    };
  }
}

// 导出单例实例
export const imageCache = new ImageCacheManager();
