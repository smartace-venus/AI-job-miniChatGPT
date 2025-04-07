
import { streamText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { searchUserDocument } from './tools/documentChat';
import { getSession } from '@/lib/server/supabase';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/server/server';
import { saveChatToSupbabase } from './SaveToDb';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const getSystemPrompt = (selectedFiles: string[]) => {
  const base = `You are a helpful assistant. Use markdown for formatting.`;
  if (selectedFiles.length === 0) return base;

  return `${base}

IMPORTANT: The user uploaded ${selectedFiles.length} document(s): ${selectedFiles.join(', ')}

1. Use the \`searchUserDocument\` tool for questions related to these documents.
2. Add references using: [Title, p.X](<?pdf=Title&p=X>)
3. Prefer document content over general knowledge.
`;
};

const getModel = (modelName: string) => openai(modelName);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    chatId,
    option = 'gpt-3.5-turbo-1106',
    selectedBlobs = [],
    messages = []  } = body;

    const signal = req.signal;

  if (!chatId) return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '24h')
  });

  const { success, limit, remaining, reset } = await ratelimit.limit(`ratelimit_${session.id}`);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset * 1000).toISOString()
        }
      }
    );
  }

  try {
    const model = getModel(option);
    const SYSTEM_PROMPT = getSystemPrompt(selectedBlobs);

    const result = await streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: convertToCoreMessages(messages),
      tools: {
        searchUserDocument: searchUserDocument({
          userId: session.id,
          selectedFiles: selectedBlobs
        })
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'api_chat',
        metadata: {
          userId: session.id,
          chatId
        }
      },
      onFinish: async (event) => {
        try {
          const last = messages[messages.length - 1];
          const userMsg = typeof last.content === 'string' ? last.content : '';
          await saveChatToSupbabase(chatId, session.id, userMsg, event.text, event.reasoning);
        } catch (err) {
          console.error('❌ Failed to save chat:', err);
        }
      }
    });

    return result.toDataStreamResponse({
      sendReasoning: true
    });

  } catch (err) {
    console.error('❌ Chat API error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
