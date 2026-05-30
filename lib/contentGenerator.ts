import { researchTopic, formatResearchForPrompt } from '@/lib/research';

export async function generateContent(topic: string, options: ContentOptions = {}) {
  // Step 1: Research the topic
  const research = await researchTopic(topic);
  
  // Step 2: Build the system prompt with verified facts
  const systemPrompt = buildSystemPrompt(research, options);
  
  // Step 3: Generate content using only verified facts
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a ${options.format || 'post'} about: ${topic}` }
      ],
      ...options
    })
  });

  if (!response.ok) {
    throw new Error(`Content generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: data.content,
    research: research,
    sources: research.sources
  };
}

function buildSystemPrompt(research: any, options: ContentOptions): string {
  const researchData = formatResearchForPrompt(research);
  const tone = options.tone || 'casual';
  
  return `You are a content creator specializing in viral social media content.

${researchData}

TONE: ${tone}
FORMAT: ${options.format || 'post'}
PLATFORM: ${options.platform || 'twitter'}

RULES:
- ONLY use facts and statistics from the VERIFIED RESEARCH DATA above
- Do NOT invent numbers, percentages, or claims
- If research doesn't provide a specific stat, don't make one up
- Write in ${tone} tone
- Keep it engaging and shareable
- End with a hook or question

If the research data is insufficient, focus on narrative and storytelling rather than invented statistics.`;
}

interface ContentOptions {
  tone?: 'casual' | 'professional' | 'bold' | 'witty';
  format?: 'post' | 'thread' | 'article' | 'hook';
  platform?: 'twitter' | 'linkedin' | 'instagram' | 'tiktok';
  temperature?: number;
}
