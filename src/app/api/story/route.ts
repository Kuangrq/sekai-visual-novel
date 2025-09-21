import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// 模拟的故事数据
const storySegments = [
  {
    id: 'intro',
    content: `<Narrator>The warm scent of chili oil and sizzling meat wraps around me as I step inside Wanmin Restaurant.</Narrator> <Narrator>The cheerful chatter dies instantly, and I freeze as every head turns toward the door.</Narrator>`,
    choices: [
      { id: 'greet_friendly', text: '友好地向大家打招呼' },
      { id: 'stay_silent', text: '保持沉默，观察情况' },
      { id: 'ask_about_harbor', text: '询问关于璃月港的事情' }
    ]
  },
  {
    id: 'character_responses',
    content: `<character name="Lumine"> <action expression="Surprised">Nearly dropping her chopsticks, golden eyes widening</action> <say>Another traveler? Here in Liyue Harbor?</say> <action expression="Happy">Standing gracefully, her white dress swaying with the movement</action> <say>It's rare to meet someone else who journeys between worlds.</say> </character> <character name="Zhongli"> <action expression="Neutral">Looking up from his tea with measured interest</action> <say>Indeed. Your arrival was... anticipated.</say> <action expression="Thinking">Setting down his cup with deliberate care</action> <say>The contracts speak of one who would arrive when the harbor moon reaches its zenith.</say> </character> <character name="Tartaglia"> <action expression="Confident">Leaning back in his chair with a sharp grin</action> <say>Ha! Another fighter walks through that door - I can smell it.</say> <action expression="Very Happy">Standing up, cracking his knuckles</action> <say>The way you carry yourself, the weight of your steps... You're no ordinary wanderer!</say> </character> <character name="Venti"> <action expression="Happy">Strumming a cheerful note on his lyre</action> <say>Ehe~ What an auspicious wind blows you our way!</say> <action expression="Confident">Hopping down from his perch on the windowsill</action> <say>I was just composing a ballad about mysterious strangers. Care to inspire the next verse?</say> </character>`,
    choices: [
      { id: 'ask_lumine', text: '向流萤询问更多关于旅行者的事情' },
      { id: 'challenge_tartaglia', text: '接受达达利亚的挑战' },
      { id: 'listen_venti', text: '请温迪演奏他的新曲子' },
      { id: 'talk_zhongli', text: '与钟离讨论这些神秘的契约' }
    ]
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('id') || 'intro';
  const choice = searchParams.get('choice');

  // 根据选择确定返回的故事段落
  let storySegment = storySegments.find(s => s.id === storyId);
  
  if (!storySegment) {
    storySegment = storySegments[0]; // 默认返回开头
  }

  // 创建流式响应
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const content = storySegment!.content;
      let index = 0;
      
      function pushChunk() {
        if (index < content.length) {
          // 模拟网络延迟，每次发送1-3个字符
          const chunkSize = Math.min(Math.floor(Math.random() * 3) + 1, content.length - index);
          const chunk = content.slice(index, index + chunkSize);
          
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'content',
            data: chunk,
            isComplete: false
          }) + '\n'));
          
          index += chunkSize;
          
          // 随机延迟 20-100ms
          setTimeout(pushChunk, Math.random() * 80 + 20);
        } else {
          // 发送完成信号和选择
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

export async function POST(request: NextRequest) {
  try {
    const { prompt, choice, storyHistory } = await request.json();
    
    // 根据用户输入选择相应的故事段落
    let selectedSegment;
    
    if (!choice) {
      // 新故事开始
      selectedSegment = storySegments[0];
    } else {
      // 根据用户选择返回相应内容
      switch (choice) {
        case 'greet_friendly':
        case 'stay_silent':
        case 'ask_about_harbor':
          selectedSegment = storySegments[1];
          break;
        default:
          selectedSegment = storySegments[1];
      }
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        const content = selectedSegment.content;
        let index = 0;
        
        function pushChunk() {
          if (index < content.length) {
            const chunkSize = Math.min(Math.floor(Math.random() * 3) + 1, content.length - index);
            const chunk = content.slice(index, index + chunkSize);
            
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'content',
              data: chunk,
              isComplete: false
            }) + '\n'));
            
            index += chunkSize;
            setTimeout(pushChunk, Math.random() * 80 + 20);
          } else {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'complete',
              data: '',
              isComplete: true,
              choices: selectedSegment.choices
            }) + '\n'));
            
            controller.close();
          }
        }
        
        // 添加一些初始延迟
        setTimeout(pushChunk, 500);
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

// 获取示例XML数据的辅助端点
export async function GET_SAMPLE() {
  try {
    const samplePath = path.join(process.cwd(), 'public', 'assets', 'sample.xml');
    const sampleXML = await readFile(samplePath, 'utf-8');
    
    return NextResponse.json({
      success: true,
      data: sampleXML
    });
  } catch (error) {
    console.error('Failed to read sample XML:', error);
    return NextResponse.json(
      { error: 'Failed to load sample data' },
      { status: 500 }
    );
  }
}
