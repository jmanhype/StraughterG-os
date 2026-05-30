import OpenAI from 'openai';
import { buildSystemPrompt } from '@/lib/systemPrompt';
import { ChatRequest } from '@/lib/types';

// Provider configs from .env.local
const PROVIDERS = {
  qwen: {
    baseURL: process.env.AI_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.AI_API_KEY || '',
  },
  zai: {
    baseURL: process.env.ZAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: process.env.ZAI_API_KEY || '',
  },
};

// Model prefix → provider mapping
const MODEL_PROVIDER_MAP: Record<string, keyof typeof PROVIDERS> = {
  'qwen': 'qwen',
  'glm': 'zai',
  'gpt': 'qwen', // fallback to qwen endpoint (it's OpenAI-compatible)
};

function getProviderForModel(model: string): { client: OpenAI; baseURL: string } {
  // Detect provider from model name
  let providerKey: keyof typeof PROVIDERS = 'qwen';
  for (const [prefix, provider] of Object.entries(MODEL_PROVIDER_MAP)) {
    if (model.toLowerCase().startsWith(prefix)) {
      providerKey = provider;
      break;
    }
  }

  const provider = PROVIDERS[providerKey];
  if (!provider.apiKey) {
    throw new Error(
      `API key missing for ${providerKey}. ` +
      `Set ${providerKey === 'qwen' ? 'AI_API_KEY' : 'ZAI_API_KEY'} in .env.local`
    );
  }

  const client = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
  });

  return { client, baseURL: provider.baseURL };
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, workspace, action } = body;

    const model = workspace.model || process.env.AI_MODEL || 'qwen-latest-series-invite-beta-v34';
    const { client } = getProviderForModel(model);

    const systemPrompt = buildSystemPrompt(workspace);

    // Build message array
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        openaiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Handle action buttons (rewrite, expand, etc.)
    if (action) {
      openaiMessages.push({
        role: 'user',
        content: `// ACTION: ${action} the last message. Maintain all formatting rules and re-output the JSON scores.`,
      });
    }

    const completion = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature: workspace.temperature,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content || '';

    // Parse scores from JSON block if present
    let scores = null;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        scores = JSON.parse(jsonMatch[1]);
      } catch {
        const scoreMatch = content.match(/\{[\s\S]*"viralScore"[\s\S]*\}/);
        if (scoreMatch) {
          try {
            scores = JSON.parse(scoreMatch[0]);
          } catch {
            // ignore
          }
        }
      }
    }

    return Response.json({
      content,
      scores,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
