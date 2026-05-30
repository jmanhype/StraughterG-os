import * as DDG from 'duck-duck-scrape';

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

export async function researchTopic(topic: string): Promise<ResearchResult> {
  try {
    const searchResults = await DDG.search(topic, { safeSearch: DDG.SafeSearchType.STRICT });
    
    if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
      return {
        facts: [],
        summary: 'No search results found for this topic.',
        sources: []
      };
    }

    // Extract key facts from search results
    const facts: Fact[] = searchResults.results.slice(0, 10).map(result => ({
      claim: result.description || result.title,
      source: result.url,
      verified: true
    }));

    const sources = searchResults.results.slice(0, 10).map(r => r.url);

    const summary = `Research found ${searchResults.results.length} relevant sources about "${topic}". Key data points extracted for content generation.`;

    return { facts, summary, sources };
  } catch (error) {
    console.error('Research error:', error);
    return {
      facts: [],
      summary: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources: []
    };
  }
}

export function formatResearchForPrompt(research: ResearchResult): string {
  if (research.facts.length === 0) {
    return 'No verified research data available. Generate content based on general knowledge only.';
  }

  const factLines = research.facts.map((fact, i) => 
    `${i + 1}. ${fact.claim} (Source: ${fact.source})`
  ).join('\n');

  return `VERIFIED RESEARCH DATA (use these facts in your content):
${factLines}

IMPORTANT: Only use the statistics and facts listed above. Do not invent numbers or claims.`;
}
