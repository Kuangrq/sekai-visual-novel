/**
 * Story API Route
 * Handles streaming story content and user choice processing
 * Supports both predefined story segments and real LLM integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { llmService } from '@/lib/llmService';

// Mock story data for demonstration
const storySegments = [
  {
    id: 'intro',
    content: `<Narrator>The warm scent of chili oil and sizzling meat wraps around me as I step inside Wanmin Restaurant.</Narrator> <Narrator>The cheerful chatter dies instantly, and I freeze as every head turns toward the door.</Narrator>`,
    choices: [
      { id: 'greet_friendly', text: 'Greet everyone with a friendly smile' },
      { id: 'stay_silent', text: 'Stay silent and observe the situation' },
      { id: 'ask_about_harbor', text: 'Ask about what\'s happening in Liyue Harbor' },
      { id: 'end_story', text: '🚪 End story and return to home' }
    ]
  },
  {
    id: 'character_responses',
    content: `<character name="Lumine"> <action expression="Surprised">Nearly dropping her chopsticks, golden eyes widening</action> <say>Another traveler? Here in Liyue Harbor?</say> <action expression="Happy">Standing gracefully, her white dress swaying with the movement</action> <say>It's rare to meet someone else who journeys between worlds.</say> </character> <character name="Zhongli"> <action expression="Neutral">Looking up from his tea with measured interest</action> <say>Indeed. Your arrival was... anticipated.</say> <action expression="Thinking">Setting down his cup with deliberate care</action> <say>The contracts speak of one who would arrive when the harbor moon reaches its zenith.</say> </character> <character name="Tartaglia"> <action expression="Confident">Leaning back in his chair with a sharp grin</action> <say>Ha! Another fighter walks through that door - I can smell it.</say> <action expression="Very Happy">Standing up, cracking his knuckles</action> <say>The way you carry yourself, the weight of your steps... You're no ordinary wanderer!</say> </character> <character name="Venti"> <action expression="Happy">Strumming a cheerful note on his lyre</action> <say>Ehe~ What an auspicious wind blows you our way!</say> <action expression="Confident">Hopping down from his perch on the windowsill</action> <say>I was just composing a ballad about mysterious strangers. Care to inspire the next verse?</say> </character>`,
    choices: [
      { id: 'ask_lumine', text: 'Ask Lumine more about her travels between worlds' },
      { id: 'challenge_tartaglia', text: 'Accept Tartaglia\'s challenge and show your skills' },
      { id: 'listen_venti', text: 'Ask Venti to play his new ballad' },
      { id: 'talk_zhongli', text: 'Discuss the mysterious contracts with Zhongli' },
      { id: 'end_story', text: '🚪 End story and return to home' }
    ]
  },
  {
    id: 'lumine_path',
    content: `<character name="Lumine"> <action expression="Sad">Her expression grows distant, a shadow passing over her golden eyes</action> <say>I've been searching for my brother for so long... We were separated when we arrived in this world.</say> <action expression="Thinking">She pauses, studying your face intently</action> <say>Perhaps you've seen him? He looks much like me, but with lighter hair...</say> </character> <Narrator>The restaurant falls quiet as Lumine's story touches everyone present. Even Tartaglia's usual bravado seems subdued.</Narrator> <character name="Zhongli"> <action expression="Concern">Setting down his teacup with deliberate care</action> <say>Loss is a burden many of us carry. Time may reveal what we seek.</say> </character>`,
    choices: []
  },
  {
    id: 'tartaglia_path',
    content: `<character name="Tartaglia"> <action expression="Very Happy">His eyes light up with excitement</action> <say>Now we're talking! I knew you had the spirit of a warrior!</say> <action expression="Confident">He stands up, stretching his arms</action> <say>How about we step outside? I promise to go easy on you... maybe.</say> </character> <character name="Zhongli"> <action expression="Annoyed">Sighing deeply</action> <say>Childe, perhaps we should finish our meal first. Violence can wait.</say> </character> <character name="Venti"> <action expression="Happy">Laughing melodiously</action> <say>Ehe! A warrior's feast deserves a warrior's song!</say> </character>`,
    choices: []
  },
  {
    id: 'venti_path',
    content: `<character name="Venti"> <action expression="Very Happy">His face brightens with pure joy</action> <say>Ehe! A music lover! My heart sings just hearing those words!</say> <action expression="Happy">He begins to strum a gentle, haunting melody</action> <say>This is a song of travelers, of journeys that bring strangers together...</say> </character> <Narrator>The melody fills the air, weaving a spell of nostalgia and hope. Even the other patrons stop their conversations to listen.</Narrator> <character name="Lumine"> <action expression="Happy">Closing her eyes, a peaceful smile crossing her face</action> <say>Beautiful... it reminds me of home.</say> </character>`,
    choices: []
  },
  {
    id: 'zhongli_path',
    content: `<character name="Zhongli"> <action expression="Thinking">His amber eyes seem to peer into ancient memories</action> <say>The contracts I speak of are not mere mortal agreements. They are woven into the very fabric of this land.</say> <action expression="Neutral">He takes a contemplative sip of tea</action> <say>Liyue Harbor sits at the crossroads of fate. Those who arrive here are rarely here by mere chance.</say> </character> <character name="Tartaglia"> <action expression="Thinking">Leaning forward with sudden interest</action> <say>You speak as if you know something we don't, old man...</say> </character> <Narrator>The air grows thick with unspoken mysteries, and you sense that your arrival has set ancient wheels in motion.</Narrator>`,
    choices: []
  }
];

/**
 * GET endpoint for story retrieval (legacy support)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('id') || 'intro';

  // Find appropriate story segment
  let storySegment = storySegments.find(s => s.id === storyId);
  
  if (!storySegment) {
    storySegment = storySegments[0]; // Default to intro
  }

  // Create streaming response
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const content = storySegment!.content;
      let index = 0;
      
      function pushChunk() {
        if (index < content.length) {
          // Send larger chunks with reduced delay for better performance
          const chunkSize = Math.min(Math.floor(Math.random() * 8) + 5, content.length - index);
          const chunk = content.slice(index, index + chunkSize);
          
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'content',
            data: chunk,
            isComplete: false
          }) + '\n'));
          
          index += chunkSize;
          setTimeout(pushChunk, Math.random() * 20 + 5);
        } else {
          // Send completion signal with choices
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'complete',
            data: '',
            isComplete: true,
            choices: storySegment!.choices
          }) + '\n'));
          
          controller.close();
        }
      }
      
      pushChunk();
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * POST endpoint for interactive story progression
 * Handles user choices and returns appropriate story segments
 */
export async function POST(request: NextRequest) {
  try {
    const { choice, prompt, storyHistory, fastMode, useLLM, llmConfig } = await request.json();
    
    let content = '';
    let choices: Array<{ id: string; text: string; }> = [];
    
    // Use LLM if configured and requested
    if (useLLM && llmConfig) {
      try {
        // Initialize LLM service with provided config
        llmService.initialize(llmConfig);
        
        // Determine user input for LLM
        const userInput = choice ? `User chose: ${choice}` : prompt || 'Begin the story';
        
        // Generate story using LLM
        const llmResponse = await llmService.generateStory(
          userInput,
          storyHistory || [],
          ['Lumine', 'Tartaglia', 'Venti', 'Zhongli']
        );
        
        content = llmResponse;
        
        // Generate choices based on the story content
        // For LLM-generated content, we'll provide generic choices
        if (content && !content.includes('Story Complete')) {
          choices = [
            { id: 'continue_1', text: 'Continue the conversation' },
            { id: 'ask_question', text: 'Ask a question' },
            { id: 'change_topic', text: 'Change the subject' },
            { id: 'end_story', text: '🚪 End story and return to home' }
          ];
        }
        
      } catch (error) {
        console.error('LLM generation failed:', error);
        // Fallback to predefined content if LLM fails
        content = `<Narrator>The AI storyteller seems to have taken a break. Let's continue with our prepared story...</Narrator>`;
        choices = [
          { id: 'greet_friendly', text: 'Greet everyone with a friendly smile' },
          { id: 'stay_silent', text: 'Stay silent and observe the situation' },
          { id: 'end_story', text: '🚪 End story and return to home' }
        ];
      }
    } else {
      // Use predefined story segments
      let selectedSegment = storySegments[0]; // Default to intro
      
      if (!choice) {
        // New story beginning
        selectedSegment = storySegments[0];
      } else {
        // Route to appropriate story path based on choice
        switch (choice) {
          case 'greet_friendly':
          case 'stay_silent':
          case 'ask_about_harbor':
            selectedSegment = storySegments[1]; // character_responses
            break;
          case 'ask_lumine':
            selectedSegment = storySegments[2]; // lumine_path
            break;
          case 'challenge_tartaglia':
            selectedSegment = storySegments[3]; // tartaglia_path
            break;
          case 'listen_venti':
            selectedSegment = storySegments[4]; // venti_path
            break;
          case 'talk_zhongli':
            selectedSegment = storySegments[5]; // zhongli_path
            break;
          default:
            selectedSegment = storySegments[1]; // Fallback to character intro
        }
      }
      
      content = selectedSegment.content;
      choices = selectedSegment.choices;
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        
        if (fastMode) {
          // Fast mode: send all content immediately
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'content',
            data: content,
            isComplete: false
          }) + '\n'));
          
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'complete',
            data: '',
            isComplete: true,
            choices: choices
          }) + '\n'));
          
          controller.close();
        } else {
          // Normal streaming mode with typing effect
          let index = 0;
          
          function pushChunk() {
            if (index < content.length) {
              // Send optimized chunks for better performance
              const chunkSize = Math.min(Math.floor(Math.random() * 8) + 5, content.length - index);
              const chunk = content.slice(index, index + chunkSize);
              
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'content',
                data: chunk,
                isComplete: false
              }) + '\n'));
              
              index += chunkSize;
              setTimeout(pushChunk, Math.random() * 20 + 5);
            } else {
                    controller.enqueue(encoder.encode(JSON.stringify({
                      type: 'complete',
                      data: '',
                      isComplete: true,
                      choices: choices
                    }) + '\n'));
              
              controller.close();
            }
          }
          
          // Minimal initial delay
          setTimeout(pushChunk, 100);
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Story API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate story' },
      { status: 500 }
    );
  }
}

