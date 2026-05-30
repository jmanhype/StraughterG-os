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
}

export interface WorkspaceState {
  model: string;
  temperature: number;
  platform: 'twitter' | 'linkedin' | 'longform';
  format: 'post' | 'thread' | 'article' | 'reply' | 'hook';
  length: 'short' | 'medium' | 'long';
  tone: {
    casual: number;    // 0-100 (0=formal, 100=casual)
    witty: number;     // 0-100
    provocative: number; // 0-100
    technical: number;   // 0-100
  };
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  workspace: WorkspaceState;
  action?: string;
}
