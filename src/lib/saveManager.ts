/**
 * Save Manager for Visual Novel
 * Handles game state persistence and conversation history
 */

import { ParsedSegment } from './xmlParser';

export interface ConversationEntry {
  id: string;
  timestamp: Date;
  type: 'user_input' | 'story_segment' | 'user_choice';
  content: string;
  character?: string;
  emotion?: string;
  segmentData?: ParsedSegment;
}

export interface GameSave {
  id: string;
  name: string;
  timestamp: Date;
  gameState: {
    userPrompt: string;
    storyHistory: string[];
    conversationHistory: ConversationEntry[];
    currentSegmentIndex: number;
    currentSegments: ParsedSegment[];
    choices: Array<{ id: string; text: string; }>;
    gameStarted: boolean;
    fastMode: boolean;
  };
  screenshot?: string; // Base64 encoded screenshot
  playTime: number; // in seconds
}

class SaveManager {
  private readonly SAVE_KEY = 'visual-novel-saves';
  private readonly HISTORY_KEY = 'visual-novel-conversation-history';
  private readonly AUTO_SAVE_KEY = 'visual-novel-auto-save';
  private readonly MAX_SAVES = 10;
  private readonly MAX_HISTORY_ENTRIES = 1000;

  /**
   * Save current game state
   */
  saveGame(save: Omit<GameSave, 'id' | 'timestamp'>): string {
    try {
      const saves = this.getAllSaves();
      const saveId = this.generateSaveId();
      
      const newSave: GameSave = {
        ...save,
        id: saveId,
        timestamp: new Date(),
      };

      saves.push(newSave);
      
      // Keep only the most recent saves
      if (saves.length > this.MAX_SAVES) {
        saves.splice(0, saves.length - this.MAX_SAVES);
      }

      localStorage.setItem(this.SAVE_KEY, JSON.stringify(saves));
      
      console.log(`Game saved: ${save.name}`);
      return saveId;
    } catch (error) {
      console.error('Failed to save game:', error);
      throw new Error('Failed to save game');
    }
  }

  /**
   * Load game state by ID
   */
  loadGame(saveId: string): GameSave | null {
    try {
      const saves = this.getAllSaves();
      const save = saves.find(s => s.id === saveId);
      
      if (save) {
        console.log(`Game loaded: ${save.name}`);
        return save;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  /**
   * Delete a save by ID
   */
  deleteSave(saveId: string): boolean {
    try {
      const saves = this.getAllSaves();
      const index = saves.findIndex(s => s.id === saveId);
      
      if (index !== -1) {
        saves.splice(index, 1);
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(saves));
        console.log(`Save deleted: ${saveId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }

  /**
   * Get all saved games
   */
  getAllSaves(): GameSave[] {
    try {
      const saved = localStorage.getItem(this.SAVE_KEY);
      if (saved) {
        const saves = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return saves.map((save: Omit<GameSave, 'timestamp'> & { timestamp: string }) => ({
          ...save,
          timestamp: new Date(save.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get saves:', error);
      return [];
    }
  }

  /**
   * Auto-save current game state
   */
  autoSave(gameState: GameSave['gameState'], playTime: number): void {
    try {
      const autoSave: GameSave = {
        id: 'auto-save',
        name: 'Auto Save',
        timestamp: new Date(),
        gameState,
        playTime,
      };

      localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(autoSave));
    } catch (error) {
      console.error('Failed to auto-save:', error);
    }
  }

  /**
   * Load auto-save
   */
  loadAutoSave(): GameSave | null {
    try {
      const saved = localStorage.getItem(this.AUTO_SAVE_KEY);
      if (saved) {
        const autoSave = JSON.parse(saved);
        return {
          ...autoSave,
          timestamp: new Date(autoSave.timestamp)
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to load auto-save:', error);
      return null;
    }
  }

  /**
   * Add entry to conversation history
   */
  addToHistory(entry: Omit<ConversationEntry, 'id' | 'timestamp'>): void {
    try {
      const history = this.getConversationHistory();
      
      const newEntry: ConversationEntry = {
        ...entry,
        id: this.generateEntryId(),
        timestamp: new Date(),
      };

      history.push(newEntry);
      
      // Keep only recent entries
      if (history.length > this.MAX_HISTORY_ENTRIES) {
        history.splice(0, history.length - this.MAX_HISTORY_ENTRIES);
      }

      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationEntry[] {
    try {
      const saved = localStorage.getItem(this.HISTORY_KEY);
      if (saved) {
        const history = JSON.parse(saved);
        return history.map((entry: Omit<ConversationEntry, 'timestamp'> & { timestamp: string }) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    try {
      localStorage.removeItem(this.HISTORY_KEY);
      console.log('Conversation history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  /**
   * Export conversation history as text
   */
  exportHistory(): string {
    const history = this.getConversationHistory();
    
    let output = `# Visual Novel Conversation History\n`;
    output += `Generated: ${new Date().toLocaleString()}\n`;
    output += `Total entries: ${history.length}\n\n`;

    for (const entry of history) {
      const time = entry.timestamp.toLocaleString();
      
      switch (entry.type) {
        case 'user_input':
          output += `[${time}] **USER**: ${entry.content}\n\n`;
          break;
        case 'story_segment':
          if (entry.character) {
            output += `[${time}] **${entry.character.toUpperCase()}** (${entry.emotion || 'neutral'}): ${entry.content}\n\n`;
          } else {
            output += `[${time}] **NARRATOR**: ${entry.content}\n\n`;
          }
          break;
        case 'user_choice':
          output += `[${time}] **CHOICE**: ${entry.content}\n\n`;
          break;
      }
    }

    return output;
  }

  /**
   * Get storage usage info
   */
  getStorageInfo(): {
    savesCount: number;
    historyCount: number;
    storageUsed: string;
    hasAutoSave: boolean;
  } {
    const saves = this.getAllSaves();
    const history = this.getConversationHistory();
    const autoSave = this.loadAutoSave();
    
    // Estimate storage usage
    let storageSize = 0;
    try {
      storageSize += new Blob([localStorage.getItem(this.SAVE_KEY) || '']).size;
      storageSize += new Blob([localStorage.getItem(this.HISTORY_KEY) || '']).size;
      storageSize += new Blob([localStorage.getItem(this.AUTO_SAVE_KEY) || '']).size;
    } catch {
      // Fallback estimation
      storageSize = JSON.stringify({ saves, history, autoSave }).length;
    }

    return {
      savesCount: saves.length,
      historyCount: history.length,
      storageUsed: this.formatBytes(storageSize),
      hasAutoSave: !!autoSave,
    };
  }

  /**
   * Generate unique save ID
   */
  private generateSaveId(): string {
    return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const saveManager = new SaveManager();
