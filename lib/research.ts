export interface ResearchResult {
  facts: Fact[];
  summary: string;
  sources: string[];
}

export interface Fact {
  claim: string;
  source: string;
  verified: boolean;
}

const MCP_ENDPOINT = 'https://api.z.ai/api/mcp/web_search_prime/mcp';

interface MCPResponse {
  data: any;
  sessionId: string | null;
}

async function callMCP(method: string, params: any, sessionId?: string): Promise<MCPResponse> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) throw new Error('ZAI_API_KEY not set');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Authorization': `Bearer ${apiKey}`,
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP ${method} failed: ${res.status} - ${text.substring(0, 200)}`);
  }

  const sid = res.headers.get('mcp-session-id');
  const text = await res.text();

  // Parse SSE format: "data:{...}"
  const dataLine = text.split('\n').find(l => l.startsWith('data:'));
  const json = dataLine ? JSON.parse(dataLine.substring(5)) : JSON.parse(text);

  return { data: json, sessionId: sid };
}

export async function researchTopic(topic: string): Promise<ResearchResult> {
  const apiKey = process.env.ZAI_API_KEY;

  if (!apiKey) {
    console.error('❌ ZAI_API_KEY not set in .env.local');
    return {
      facts: [],
      summary: 'Search unavailable - API key not configured',
      sources: [],
    };
  }

  try {
    // Step 1: Initialize MCP session
    const init = await callMCP('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'straughterg-os', version: '1.0.0' },
    });

    const sessionId = init.sessionId;
    if (!sessionId) throw new Error('No session ID returned from MCP init');

    // Step 2: Send initialized notification (fire and forget)
    const notifyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${apiKey}`,
      'Mcp-Session-Id': sessionId,
    };
    await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: notifyHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      }),
    });

    // Step 3: Call web_search_prime
    const searchResult = await callMCP(
      'tools/call',
      {
        name: 'web_search_prime',
        arguments: {
          search_query: topic.substring(0, 70), // API limit: 70 chars
          search_recency_filter: 'oneYear',
          content_size: 'medium',
          location: 'us',
        },
      },
      sessionId
    );

    // Step 4: Parse results from MCP response
    const results = parseMCPResults(searchResult.data);

    if (results.length === 0) {
      return {
        facts: [],
        summary: 'No search results found for this topic.',
        sources: [],
      };
    }

    const facts: Fact[] = results.map(result => ({
      claim: result.content || result.title,
      source: result.link,
      verified: true,
    }));

    const sources = results.map(result => result.link);
    const summary = `Found ${facts.length} verified sources about ${topic}`;

    return { facts, summary, sources };
  } catch (error) {
    console.error('❌ Z.AI Web Search failed:', error);
    return {
      facts: [],
      summary: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources: [],
    };
  }
}

interface SearchResult {
  title: string;
  link: string;
  content: string;
}

function parseMCPResults(data: any): SearchResult[] {
  try {
    // MCP response: { result: { content: [{ type: 'text', text: '"[...]"' }] } }
    const content = data?.result?.content;
    if (!content || !Array.isArray(content)) return [];

    const textItem = content.find((c: any) => c.type === 'text');
    if (!textItem?.text) return [];

    // The text field is a JSON string wrapped in quotes, need to parse twice
    let parsed = textItem.text;
    // Remove outer quotes if present
    if (parsed.startsWith('"') && parsed.endsWith('"')) {
      parsed = JSON.parse(parsed);
    }
    // Parse the inner JSON array
    const results = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;

    if (!Array.isArray(results)) return [];

    return results.map((item: any) => ({
      title: item.title || 'Untitled',
      link: item.link || item.url || '',
      content: item.content || item.description || item.snippet || '',
    })).filter((item: any) => item.link);
  } catch (error) {
    console.error('Failed to parse MCP results:', error);
    return [];
  }
}

export function formatResearchForPrompt(research: ResearchResult): string {
  if (research.facts.length === 0) {
    return 'No verified research data available. Generate content based on general knowledge only. Do NOT invent statistics or specific claims.';
  }

  const factsList = research.facts
    .slice(0, 10)
    .map((fact, i) => `${i + 1}. ${fact.claim} (Source: ${fact.source})`)
    .join('\n');

  return `VERIFIED RESEARCH DATA (from Z.AI Web Search):
${factsList}

IMPORTANT RULES:
- ONLY use facts and statistics from the sources above
- If a fact isn't in this list, don't use it
- Never invent numbers, percentages, or specific claims
- Cite sources when using their data`;
}
