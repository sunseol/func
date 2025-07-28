import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `당신은 FunCommute 업무 보고서 시스템의 전문 AI 어시스턴트입니다. 
          한국어로 정확하고 유용한 답변을 제공하며, 업무 보고서 데이터 분석에 특화되어 있습니다.
          답변은 구체적이고 실용적이어야 하며, 필요시 개선 제안도 포함해주세요.`
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    const content = chatCompletion.choices[0]?.message?.content || '';

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('GROQ API Error:', error);

    // API 키 관련 오류
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'API key configuration error' },
        { status: 401 }
      );
    }

    // 요청 한도 초과
    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 기타 오류
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'GROQ API endpoint is working' },
    { status: 200 }
  );
}