import { buildSystemPrompt } from '@/lib/systemPrompt';
import { ChatRequest } from '@/lib/types';
import { researchTopic, formatResearchForPrompt } from '@/lib/research';

// Allow this route to run up to 120s (Next.js dev default is ~10s)
export const maxDuration = 120;

// Provider configs from .env.local
const PROVIDERS = {
  qwen: {
    baseURLs: [
      process.env.AI_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      'https://llm-k189xkia71r72n1w.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
    ],
    apiKey: process.env.AI_API_KEY || '',
  },
  zai: {
    baseURLs: [process.env.ZAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'],
    apiKey: process.env.ZAI_API_KEY || '',
  },
};

// Model prefix → provider mapping
const MODEL_PROVIDER_MAP: Record<string, keyof typeof PROVIDERS> = {
  'qwen': 'qwen',
  'glm': 'zai',
  'gpt': 'qwen',
};

function getProviderForModel(model: string, overrides?: { apiKey?: string; baseUrl?: string }): { baseURLs: string[]; apiKey: string } {
  let providerKey: keyof typeof PROVIDERS = 'qwen';
  for (const [prefix, provider] of Object.entries(MODEL_PROVIDER_MAP)) {
    if (model.toLowerCase().startsWith(prefix)) {
      providerKey = provider;
      break;
    }
  }

  const provider = PROVIDERS[providerKey];
  const apiKey = overrides?.apiKey || provider.apiKey;
  const baseURLs = overrides?.baseUrl ? [overrides.baseUrl] : provider.baseURLs;

  if (!apiKey) {
    throw new Error(
      `API key missing for ${providerKey}. ` +
      `Set ${providerKey === 'qwen' ? 'AI_API_KEY' : 'ZAI_API_KEY'} in .env.local or configure in Settings.`
    );
  }

  return { baseURLs, apiKey };
}

export async function POST(request: Request) {
  try {
    // ─── Input Validation ──────────────────────────────────────────────
    const body: ChatRequest = await request.json();
    const { messages, workspace, action, apiOverrides } = body;

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required and must not be empty' }, { status: 400 });
    }
    if (messages.length > 50) {
      return Response.json({ error: 'Too many messages (max 50)' }, { status: 400 });
    }

    // Validate each message
    const VALID_ROLES = new Set(['user', 'assistant', 'system']);
    for (const msg of messages) {
      if (!msg.role || !VALID_ROLES.has(msg.role)) {
        return Response.json({ error: `Invalid message role: ${msg.role}` }, { status: 400 });
      }
      if (typeof msg.content !== 'string' || msg.content.length > 50000) {
        return Response.json({ error: 'Message content must be a string under 50,000 characters' }, { status: 400 });
      }
    }

    // Validate action if provided
    const VALID_ACTIONS = new Set(['rewrite', 'expand', 'shorten', 'reply', 'cta', 'trend']);
    if (action && !VALID_ACTIONS.has(action)) {
      return Response.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const model = workspace?.model || process.env.AI_MODEL || 'qwen-latest-series-invite-beta-v34';
    const { baseURLs, apiKey } = getProviderForModel(model, apiOverrides);

    // Extract topic from the latest user message for research
    const latestUserMessage = messages.filter(m => m.role === 'user').pop();
    const topic = latestUserMessage?.content || '';
    
    // Run research if there's a topic (skip for actions like "rewrite", "expand")
    let researchContext = '';
    let researchSources: string[] = [];
    let researchFacts: { claim: string; source: string }[] = [];
    if (topic && !action && !topic.startsWith('//')) {
      try {
        const research = await researchTopic(topic);
        researchContext = formatResearchForPrompt(research);
        researchSources = research.sources;
        researchFacts = research.facts.map(f => ({ claim: f.claim, source: f.source }));
      } catch (error) {
        console.error('❌ Research failed, continuing without it');
        researchContext = '';
      }
    }

    const systemPrompt = buildSystemPrompt(workspace);

    // Fetch voice profile prompt if one is selected
    let voiceContext = '';
    if (workspace.voiceProfile) {
      try {
        const voiceRes = await fetch(`http://localhost:8420/voice/${encodeURIComponent(workspace.voiceProfile)}/prompt`);
        if (voiceRes.ok) {
          const voiceData = await voiceRes.json();
          voiceContext = voiceData.prompt || '';
        }
      } catch (e) {
        console.warn('Voice profile fetch failed, continuing without:', e);
      }
    }

    // Build message array with research context
    const openaiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Inject voice profile if available
    if (voiceContext) {
      openaiMessages.push({
        role: 'system',
        content: `VOICE STYLE OVERRIDE — You MUST write in this exact style:\n\n${voiceContext}\n\nAll generated content MUST follow this voice profile strictly.`,
      });
    }

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

    // LLM call via native fetch (OpenAI SDK has connection issues with Aliyun)
    const maxRetries = 3;
    let completionData: any;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const endpointIdx = attempt % baseURLs.length;
      const currentEndpoint = baseURLs[endpointIdx];
      const endpointLabel = currentEndpoint.includes('maas') ? 'MAAS' : 'dashscope-intl';

      try {
        console.log(`🔄 LLM attempt ${attempt + 1}/${maxRetries} via ${endpointLabel}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);

        const res = await fetch(`${currentEndpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: openaiMessages,
            temperature: workspace.temperature,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const errText = await res.text();
          const err: any = new Error(`API error ${res.status}: ${errText.substring(0, 200)}`);
          err.status = res.status;
          throw err;
        }

        completionData = await res.json();
        if (attempt > 0) {
          console.log(`✅ Succeeded on attempt ${attempt + 1} via ${endpointLabel}`);
        }
        break;
      } catch (e: any) {
        lastError = e;
        const isTransient = e.message?.includes('Premature close') ||
                           e.message?.includes('ECONNRESET') ||
                           e.message?.includes('ETIMEDOUT') ||
                           e.message?.includes('network') ||
                           e.message?.includes('abort') ||
                           e.status === 502 || e.status === 503;
        if (!isTransient || attempt === maxRetries - 1) throw e;
        const backoff = Math.min(2 ** attempt, 8);
        console.warn(`⚠️ LLM attempt ${attempt + 1} failed (${e.message?.substring(0, 60)}), retrying in ${backoff}s...`);
        await new Promise(r => setTimeout(r, backoff * 1000));
      }
    }

    if (!completionData) throw lastError || new Error('LLM call failed');

    const content = completionData.choices?.[0]?.message?.content || '';

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
      model: completionData?.model || model,
      usage: completionData?.usage || null,
      research: {
        sources: researchSources,
        facts: researchFacts,
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Classify the error for the frontend
    const msg = error.message || '';
    let errorType = 'unknown';
    let retryable = false;
    if (msg.includes('Premature close') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('Invalid response body') || msg.includes('network')) {
      errorType = 'network';
      retryable = true;
    } else if (error.status === 429 || msg.includes('rate') || msg.includes('quota')) {
      errorType = 'rate_limit';
      retryable = true;
    } else if (error.status === 401 || msg.includes('API key') || msg.includes('invalid_request')) {
      errorType = 'auth';
      retryable = false;
    } else if (error.status === 502 || error.status === 503) {
      errorType = 'server';
      retryable = true;
    }
    
    return Response.json(
      { error: msg || 'Internal server error', errorType, retryable },
      { status: error.status || 500 }
    );
  }
}
