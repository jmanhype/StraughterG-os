export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  scores?: ViralScores;
  timestamp: number;
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
  tone: {
    professional: number;
    casual: number;
    bold: number;
    witty: number;
    empathetic: number;
    technical: number;
  };
  formalCasual: number; // 0=formal, 100=casual
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  workspace: WorkspaceState;
  action?: string;
}
