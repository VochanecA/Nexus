// app/api/explain/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface ExplainRequest {
  text: string;
}

interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  max_tokens: number;
  temperature: number;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as ExplainRequest;
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Koristite OpenRouter API
    const openRouterRequest: OpenRouterRequest = {
      model: 'deepseek/deepseek-chat:free',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that explains social media posts in a clear, concise way. Provide explanations in the same language as the post.'
        },
        {
          role: 'user',
          content: `Please explain this post in simple terms:\n\n"${text.substring(0, 1000)}"`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_APP_NAME || 'Social App'
      },
      body: JSON.stringify(openRouterRequest)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      return NextResponse.json(
        { error: 'Failed to get explanation' },
        { status: response.status }
      );
    }

    const data = await response.json() as OpenRouterResponse;
    const explanation = data.choices[0]?.message?.content;

    if (!explanation) {
      return NextResponse.json(
        { error: 'No explanation generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Explanation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}