/**
 * LLM Service for Visual Novel
 * Handles OpenAI API integration and prompt generation
 */

export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class LLMService {
  private config: LLMConfig | null = null;
  private readonly STORAGE_KEY = 'visual-novel-llm-config';

  /**
   * Initialize the LLM service with configuration
   */
  initialize(config: LLMConfig): void {
    this.config = config;
    this.saveConfig();
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config && this.config.apiKey);
  }

  /**
   * Get current configuration (without API key for security)
   */
  getConfig(): Omit<LLMConfig, 'apiKey'> | null {
    if (!this.config) return null;
    
    const { apiKey: _, ...configWithoutKey } = this.config;
    return configWithoutKey;
  }

  /**
   * Generate story content using OpenAI API
   */
  async generateStory(
    userInput: string,
    storyHistory: string[],
    characters: string[] = ['Lumine', 'Tartaglia', 'Venti', 'Zhongli']
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('LLM service not configured');
    }

    const prompt = this.buildPrompt(userInput, storyHistory, characters);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config!.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config!.temperature,
          max_tokens: this.config!.maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from OpenAI API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM generation error:', error);
      throw error;
    }
  }

  /**
   * Build prompt for story generation
   */
  private buildPrompt(userInput: string, storyHistory: string[], characters: string[]): string {
    const historyText = storyHistory.length > 0 
      ? `\n\nPrevious story context:\n${storyHistory.join('\n')}`
      : '';

    return `Generate the next part of an interactive visual novel story based on the user's input: "${userInput}"

STRICT CHARACTER CONSTRAINT: You MUST ONLY use these exact characters: ${characters.join(', ')}
DO NOT create, mention, or introduce any other characters. No NPCs, no background characters, no new characters.

Requirements:
1. Generate content in the following XML format:
   - Use <Narrator>text</Narrator> for narrative descriptions
   - Use <character name="CharacterName"><action expression="emotion">action description</action><say>dialogue</say></character> for character dialogue
   - Available emotions: neutral, happy, sad, angry, surprised, thinking, confident, concern, annoyed, blushing, crying, disgusted, fear, deeply in love, very happy
   - Character names MUST match exactly: Lumine, Tartaglia, Venti, Zhongli (case-sensitive)

2. Story guidelines:
   - Keep the story engaging and interactive
   - Focus on character development and dialogue between the specified characters only
   - Create meaningful choices for the player
   - Maintain consistency with the Genshin Impact universe
   - Include 2-3 characters per segment when possible
   - NO other characters allowed - only use the four specified characters

3. End the segment with a natural stopping point that leads to player choices.

${historyText}

Generate approximately 200-400 words of story content in the specified XML format using ONLY the four specified characters:`;
  }

  /**
   * Get system prompt for the LLM
   */
  private getSystemPrompt(): string {
    return this.config?.systemPrompt || `You are a creative writer for an interactive visual novel set in the Genshin Impact universe. You specialize in creating engaging, character-driven stories with meaningful dialogue and player choices.

CRITICAL CONSTRAINT: You can ONLY use these four characters in your stories:
- Lumine
- Tartaglia  
- Venti
- Zhongli

You are FORBIDDEN from:
- Creating new characters
- Mentioning other Genshin Impact characters (like Xiangling, Hu Tao, etc.)
- Adding NPCs or background characters
- Introducing any character not in the above list

Key guidelines:
- Write in a warm, engaging tone suitable for visual novels
- Focus on character interactions and emotional depth between the four specified characters only
- Create natural dialogue that reflects each character's personality
- Build tension and interest through storytelling using only these four characters
- Always output in the specified XML format
- Keep content appropriate for all audiences
- Ensure smooth narrative flow between segments
- If the story requires additional context, use the Narrator instead of new characters

Character personalities (THESE ARE THE ONLY CHARACTERS YOU CAN USE):
- Lumine: Determined, curious, kind-hearted traveler searching for her brother
- Tartaglia (Childe): Battle-hungry, charismatic Harbinger, loyal to friends despite his dangerous nature
- Venti: Carefree, wise, mischievous bard with hidden depths as an Archon
- Zhongli: Knowledgeable, composed, formal consultant with ancient wisdom as the former Geo Archon

Remember: NO OTHER CHARACTERS ALLOWED. Only use Lumine, Tartaglia, Venti, and Zhongli.`;
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    if (this.config) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      } catch (error) {
        console.error('Failed to save LLM config:', error);
      }
    }
  }

  /**
   * Load configuration from localStorage
   */
  loadConfig(): boolean {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.config = JSON.parse(saved);
        return this.isConfigured();
      }
    } catch (error) {
      console.error('Failed to load LLM config:', error);
    }
    return false;
  }

  /**
   * Clear configuration
   */
  clearConfig(): void {
    this.config = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear LLM config:', error);
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Service not configured' };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
        },
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return { 
          success: false, 
          error: `API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Get available models (for configuration UI)
   */
  async getAvailableModels(): Promise<string[]> {
    const defaultModels = ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'];
    
    if (!this.isConfigured()) {
      return defaultModels;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data
          .filter((model: { id: string }) => model.id.includes('gpt'))
          .map((model: { id: string }) => model.id)
          .sort();
        
        return models.length > 0 ? models : defaultModels;
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }

    return defaultModels;
  }
}

// Export singleton instance
export const llmService = new LLMService();
