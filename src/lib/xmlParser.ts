/**
 * XML Stream Parser for processing structured dialogue data from LLM responses
 * Handles real-time parsing of character conversations and narrative text
 */

export interface Character {
  name: string;
  expression: string;
  text: string;
  action?: string;
}

export interface NarratorText {
  type: 'narrator';
  text: string;
}

export interface CharacterDialogue {
  type: 'character';
  name: string;
  expression: string;
  text: string;
  action?: string;
}

export interface Choice {
  id: string;
  text: string;
}

export type ParsedSegment = NarratorText | CharacterDialogue;

export class XMLStreamParser {
  private buffer: string = '';
  private segments: ParsedSegment[] = [];
  private choices: Choice[] = [];
  private currentSegment: Partial<ParsedSegment> | null = null;
  private isInTag = false;
  private tagName = '';
  private attributes: Record<string, string> = {};

  public parseChunk(chunk: string): {
    segments: ParsedSegment[];
    choices: Choice[];
    isComplete: boolean;
  } {
    this.buffer += chunk;
    this.processBuffer();
    
    return {
      segments: [...this.segments],
      choices: [...this.choices],
      isComplete: this.isBufferComplete()
    };
  }

  private processBuffer(): void {
    let i = 0;
    while (i < this.buffer.length) {
      const char = this.buffer[i];
      
      if (char === '<') {
        this.handleTagStart(i);
      } else if (char === '>') {
        this.handleTagEnd(i);
      } else if (!this.isInTag) {
        this.handleTextContent(char);
      }
      
      i++;
    }
  }

  private handleTagStart(index: number): void {
    const tagEndIndex = this.buffer.indexOf('>', index);
    if (tagEndIndex === -1) return; // Incomplete tag

    const tagContent = this.buffer.slice(index + 1, tagEndIndex);
    this.parseTag(tagContent);
    this.isInTag = true;
  }

  private handleTagEnd(index: number): void {
    this.isInTag = false;
    
    if (this.tagName.startsWith('/')) {
      this.handleClosingTag();
    } else {
      this.handleOpeningTag();
    }
  }

  private handleTextContent(char: string): void {
    if (this.currentSegment) {
      if (!this.currentSegment.text) {
        this.currentSegment.text = '';
      }
      this.currentSegment.text += char;
    }
  }

  private parseTag(tagContent: string): void {
    const parts = tagContent.split(' ');
    this.tagName = parts[0].toLowerCase();
    this.attributes = {};

    // Parse attributes
    for (let i = 1; i < parts.length; i++) {
      const attrPart = parts[i];
      const equalIndex = attrPart.indexOf('=');
      if (equalIndex > 0) {
        const key = attrPart.slice(0, equalIndex);
        const value = attrPart.slice(equalIndex + 1).replace(/['"]/g, '');
        this.attributes[key] = value;
      }
    }
  }

  private handleOpeningTag(): void {
    switch (this.tagName) {
      case 'narrator':
        this.currentSegment = {
          type: 'narrator' as const,
          text: ''
        };
        break;
      
      case 'character':
        this.currentSegment = {
          type: 'character' as const,
          name: this.attributes.name || '',
          expression: this.attributes.expression || 'neutral',
          text: ''
        };
        break;
      
      case 'action':
        if (this.currentSegment && this.currentSegment.type === 'character') {
          this.currentSegment.action = '';
          this.currentSegment.expression = this.attributes.expression || 'neutral';
        }
        break;
      
      case 'say':
        // Start collecting dialogue text
        break;
      
      case 'choice':
        // Handle choice options
        break;
    }
  }

  private handleClosingTag(): void {
    const closingTagName = this.tagName.slice(1); // Remove '/'
    
    switch (closingTagName) {
      case 'narrator':
      case 'character':
        if (this.currentSegment && this.currentSegment.text) {
          this.currentSegment.text = this.currentSegment.text.trim();
          this.segments.push(this.currentSegment as ParsedSegment);
        }
        this.currentSegment = null;
        break;
      
      case 'action':
      case 'say':
        // Handle end of action or dialogue tags
        break;
    }
  }

  private isBufferComplete(): boolean {
    // Simple check for complete XML structure
    return this.buffer.includes('</character>') || 
           this.buffer.includes('</narrator>') ||
           this.buffer.includes('</choices>');
  }

  public reset(): void {
    this.buffer = '';
    this.segments = [];
    this.choices = [];
    this.currentSegment = null;
    this.isInTag = false;
    this.tagName = '';
    this.attributes = {};
  }
}

/**
 * Helper function to extract character and dialogue information from XML string
 */
export function parseXMLToSegments(xmlString: string): {
  segments: ParsedSegment[];
  choices: Choice[];
} {
  const parser = new XMLStreamParser();
  const result = parser.parseChunk(xmlString);
  return {
    segments: result.segments,
    choices: result.choices
  };
}

/**
 * Simplified parsing function for processing sample.xml format
 * Uses regex matching for quick extraction of story segments
 */
export function parseSimpleXML(xmlString: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  
  if (!xmlString || xmlString.trim() === '') {
    return segments;
  }
  
  // Define regex patterns for different XML tags
  const narratorRegex = /<Narrator>(.*?)<\/Narrator>/gs;
  const characterRegex = /<character name="([^"]+)">(.*?)<\/character>/gs;
  const actionRegex = /<action expression="([^"]+)">([^<]*)<\/action>/g;
  const sayRegex = /<say>([^<]*)<\/say>/g;
  
  // Process narrator segments
  let match;
  while ((match = narratorRegex.exec(xmlString)) !== null) {
    segments.push({
      type: 'narrator',
      text: match[1].trim()
    });
  }
  
  // Process character dialogue - improved logic to handle multiple action and say tags
  const characterMatches = [...xmlString.matchAll(characterRegex)];
  
  for (const characterMatch of characterMatches) {
    const characterName = characterMatch[1];
    const characterContent = characterMatch[2];
    
    // Reset regex indices
    actionRegex.lastIndex = 0;
    sayRegex.lastIndex = 0;
    
    const actionMatches = [...characterContent.matchAll(actionRegex)];
    const sayMatches = [...characterContent.matchAll(sayRegex)];
    
    // Create a segment for each dialogue
    for (let i = 0; i < sayMatches.length; i++) {
      const dialogue = sayMatches[i][1].trim();
      let expression = 'neutral';
      let action = '';
      
      // Find corresponding action if available
      if (i < actionMatches.length) {
        expression = actionMatches[i][1].toLowerCase();
        action = actionMatches[i][2].trim();
      }
      
      if (dialogue) {
        segments.push({
          type: 'character',
          name: characterName,
          expression: expression,
          text: dialogue,
          action: action
        });
      }
    }
  }
  
  return segments;
}
