import OpenAI from 'openai';
import { buildSystemPrompt } from '@/lib/systemPrompt';
import { ChatRequest } from '@/lib/types';
import { researchTopic, formatResearchForPrompt } from '@/lib/research';

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

    // Extract topic from the latest user message for research
    const latestUserMessage = messages.filter(m => m.role === 'user').pop();
    const topic = latestUserMessage?.content || '';
    
    console.log('🔍 Research trigger check:', { 
      hasTopic: !!topic, 
      topicPreview: topic.substring(0, 50),
      hasAction: !!action,
      startsWithSlash: topic.startsWith('//')
    });
    
    // Run research if there's a topic (skip for actions like "rewrite", "expand")
    let researchContext = '';
    let researchSources: string[] = [];
    let researchFacts: { claim: string; source: string }[] = [];
    if (topic && !action && !topic.startsWith('//')) {
      try {
        console.log('🔬 Running Zhipu Web Search for:', topic.substring(0, 100));
        const research = await researchTopic(topic);
        console.log('✅ Research complete:', {
          sources: research.sources.length,
          facts: research.facts.length,
          summary: research.summary
        });
        researchContext = formatResearchForPrompt(research);
        researchSources = research.sources;
        researchFacts = research.facts.map(f => ({ claim: f.claim, source: f.source }));
      } catch (error) {
        console.error('❌ Research failed, continuing without it:', error);
        researchContext = '';
      }
    }

    const systemPrompt = buildSystemPrompt(workspace);

    // Build message array with research context
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Inject research context if available
    if (researchContext) {
      openaiMessages.push({
        role: 'system',
        content: `CRITICAL RESEARCH DATA:\n${researchContext}\n\nYou MUST only use facts and statistics from the verified research above. Do NOT invent numbers, percentages, or claims that aren't in this research data.`,
      });
    }

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
        // fallback: find JSON object anywhere in content
        const scoreMatch = content.match(/\{[^{}]*"viralScore"[^{}]*\}/);
        if (scoreMatch) {
          try {
            scores = JSON.parse(scoreMatch[0]);
          } catch {
            // ignore
          }
        }
      }
    }
    // Ensure all score fields exist with defaults
    if (scores) {
      scores = {
        viralScore: scores.viralScore ?? 0,
        hookStrength: scores.hookStrength ?? 0,
        readability: scores.readability ?? 0,
        emotionalPull: scores.emotionalPull ?? 0,
        storyScore: scores.storyScore ?? 0,
        emotionalArc: scores.emotionalArc ?? 0,
        retention: scores.retention ?? 0,
      };
    }

    return Response.json({
      content,
      scores,
      model: completion.model,
      usage: completion.usage,
      research: {
        sources: researchSources,
        facts: researchFacts,
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
