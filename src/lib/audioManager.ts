/**
 * Audio Manager for Visual Novel
 * Handles sound effects using Web Audio API for typing sounds and UI interactions
 */

export type SoundType = 
  | 'typing' 
  | 'click' 
  | 'hover' 
  | 'select' 
  | 'transition' 
  | 'notification'
  | 'character_enter'
  | 'character_exit';

interface AudioSettings {
  enabled: boolean;
  volume: number;
  typingVolume: number;
  uiVolume: number;
}

class AudioManager {
  private audioContext: AudioContext | null = null;
  private settings: AudioSettings = {
    enabled: true,
    volume: 0.7,
    typingVolume: 0.3,
    uiVolume: 0.5,
  };
  private isInitialized = false;

  /**
   * Initialize the audio context
   * Must be called after user interaction due to browser autoplay policies
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.isInitialized = true;
      
      // Load settings from localStorage
      this.loadSettings();
      
      console.log('Audio Manager initialized');
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
    }
  }

  /**
   * Play a synthesized sound effect
   */
  async playSound(type: SoundType): Promise<void> {
    if (!this.settings.enabled || !this.audioContext || !this.isInitialized) return;

    try {
      await this.audioContext.resume();
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure sound based on type
      this.configureSoundEffect(oscillator, gainNode, type);

      const now = this.audioContext.currentTime;
      oscillator.start(now);
      oscillator.stop(now + this.getSoundDuration(type));

    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  /**
   * Configure oscillator and gain for different sound types
   */
  private configureSoundEffect(
    oscillator: OscillatorNode, 
    gainNode: GainNode, 
    type: SoundType
  ): void {
    const baseVolume = this.settings.volume;
    const now = this.audioContext!.currentTime;

    switch (type) {
      case 'typing':
        // Soft mechanical keyboard sound
        oscillator.frequency.setValueAtTime(800 + Math.random() * 200, now);
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.typingVolume * 0.3, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        break;

      case 'click':
        // Sharp click sound
        oscillator.frequency.setValueAtTime(1200, now);
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.uiVolume * 0.4, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        break;

      case 'hover':
        // Subtle hover sound
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.uiVolume * 0.2, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        break;

      case 'select':
        // Choice selection sound
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.linearRampToValueAtTime(660, now + 0.1);
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.uiVolume * 0.5, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        break;

      case 'transition':
        // Character transition whoosh
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.uiVolume * 0.3, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        break;

      case 'notification':
        // Gentle notification chime
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.uiVolume * 0.4, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        break;

      case 'character_enter':
        // Character entrance sound
        oscillator.frequency.setValueAtTime(330, now);
        oscillator.frequency.linearRampToValueAtTime(440, now + 0.2);
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.uiVolume * 0.4, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        break;

      case 'character_exit':
        // Character exit sound
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.linearRampToValueAtTime(220, now + 0.3);
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.uiVolume * 0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        break;

      default:
        // Default click sound
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * this.settings.uiVolume * 0.3, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    }
  }

  /**
   * Get sound duration for different types
   */
  private getSoundDuration(type: SoundType): number {
    switch (type) {
      case 'typing': return 0.1;
      case 'click': return 0.15;
      case 'hover': return 0.2;
      case 'select': return 0.3;
      case 'transition': return 0.5;
      case 'notification': return 0.8;
      case 'character_enter': return 0.4;
      case 'character_exit': return 0.5;
      default: return 0.1;
    }
  }

  /**
   * Update audio settings
   */
  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  /**
   * Get current audio settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Toggle audio on/off
   */
  toggleAudio(): boolean {
    this.settings.enabled = !this.settings.enabled;
    this.saveSettings();
    return this.settings.enabled;
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('visual-novel-audio-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save audio settings:', error);
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('visual-novel-audio-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error);
    }
  }

  /**
   * Play rapid typing sequence for streaming text
   */
  async playTypingSequence(duration: number = 1000): Promise<void> {
    if (!this.settings.enabled || !this.audioContext || !this.isInitialized) return;

    const interval = 50 + Math.random() * 30; // Random typing speed
    const playSound = () => {
      this.playSound('typing');
    };

    const intervalId = setInterval(playSound, interval);
    
    setTimeout(() => {
      clearInterval(intervalId);
    }, duration);
  }

  /**
   * Check if audio is supported
   */
  isSupported(): boolean {
    return !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  }

  /**
   * Get the current audio context state
   */
  getContextState(): string {
    return this.audioContext?.state || 'uninitialized';
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

// Auto-initialize on first user interaction
let isAutoInitialized = false;
const autoInitialize = () => {
  if (!isAutoInitialized) {
    audioManager.initialize();
    isAutoInitialized = true;
    
    // Remove listeners after first initialization
    document.removeEventListener('click', autoInitialize);
    document.removeEventListener('keydown', autoInitialize);
    document.removeEventListener('touchstart', autoInitialize);
  }
};

// Wait for DOM to be ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.addEventListener('click', autoInitialize, { once: true });
      document.addEventListener('keydown', autoInitialize, { once: true });
      document.addEventListener('touchstart', autoInitialize, { once: true });
    });
  } else {
    document.addEventListener('click', autoInitialize, { once: true });
    document.addEventListener('keydown', autoInitialize, { once: true });
    document.addEventListener('touchstart', autoInitialize, { once: true });
  }
}
