export interface FileAttachment {
  name: string;
  type: 'text' | 'image';
  content: string; // text content or base64 data URL for images
  size: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  scores?: ViralScores;
  timestamp: number;
  attachments?: FileAttachment[];
  research?: {
    sources: string[];
    facts: Array<{ claim: string; source: string }>;
  };
  errorType?: 'network' | 'rate_limit' | 'auth' | 'server' | 'unknown';
  retryable?: boolean;
}

export interface ViralScores {
  viralScore: number;
  hookStrength: number;
  readability: number;
  emotionalPull: number;
  storyScore: number;
  emotionalArc: number;
  retention: number;
}

export interface WorkspaceState {
  model: string;
  temperature: number;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'newsletter';
  format: 'post' | 'thread' | 'article' | 'reply' | 'hook';
  length: 'short' | 'medium' | 'long';
  tone: 'professional' | 'casual' | 'bold' | 'witty' | 'empathetic' | 'technical';
  voiceProfile?: string;
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  workspace: WorkspaceState;
  action?: string;
  apiOverrides?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
}
