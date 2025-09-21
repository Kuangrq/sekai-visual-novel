// XML流式解析器 - 处理LLM返回的结构化对话数据

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
    // 查找标签结束位置
    const tagEndIndex = this.buffer.indexOf('>', index);
    if (tagEndIndex === -1) return; // 标签未完整

    const tagContent = this.buffer.slice(index + 1, tagEndIndex);
    this.parseTag(tagContent);
    this.isInTag = true;
  }

  private handleTagEnd(index: number): void {
    this.isInTag = false;
    
    if (this.tagName.startsWith('/')) {
      // 结束标签
      this.handleClosingTag();
    } else {
      // 开始标签
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

    // 解析属性
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
        // 开始收集对话文本
        break;
      
      case 'choice':
        // 处理选择项
        break;
    }
  }

  private handleClosingTag(): void {
    const closingTagName = this.tagName.slice(1); // 移除 '/'
    
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
        // 处理动作或对话结束
        break;
    }
  }

  private isBufferComplete(): boolean {
    // 简单检查是否包含完整的XML结构
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

// 辅助函数：从XML字符串中提取角色和对话信息
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

// 简化的解析函数，用于处理现有的sample.xml格式
export function parseSimpleXML(xmlString: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  
  if (!xmlString || xmlString.trim() === '') {
    console.warn('Empty XML string provided to parseSimpleXML');
    return segments;
  }
  
  console.log('Parsing XML string:', xmlString);
  
  // 使用正则表达式匹配不同的标签
  const narratorRegex = /<Narrator>(.*?)<\/Narrator>/gs;
  const characterRegex = /<character name="([^"]+)">(.*?)<\/character>/gs;
  const actionRegex = /<action expression="([^"]+)">([^<]*)<\/action>/g;
  const sayRegex = /<say>([^<]*)<\/say>/g;
  
  // 处理旁白
  let match;
  while ((match = narratorRegex.exec(xmlString)) !== null) {
    segments.push({
      type: 'narrator',
      text: match[1].trim()
    });
  }
  
  // 处理角色对话 - 改进逻辑以处理多个action和say标签
  const characterMatches = [...xmlString.matchAll(characterRegex)];
  
  for (const characterMatch of characterMatches) {
    const characterName = characterMatch[1];
    const characterContent = characterMatch[2];
    
    console.log(`Processing character: ${characterName}`);
    console.log(`Character content: ${characterContent}`);
    
    // 重置正则表达式
    actionRegex.lastIndex = 0;
    sayRegex.lastIndex = 0;
    
    const actionMatches = [...characterContent.matchAll(actionRegex)];
    const sayMatches = [...characterContent.matchAll(sayRegex)];
    
    console.log(`Found ${actionMatches.length} actions and ${sayMatches.length} dialogues`);
    
    // 为每个对话创建一个段落
    for (let i = 0; i < sayMatches.length; i++) {
      const dialogue = sayMatches[i][1].trim();
      let expression = 'neutral';
      let action = '';
      
      // 找到对应的动作（如果有的话）
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
  
  console.log('Final parsed segments:', segments);
  return segments;
}
