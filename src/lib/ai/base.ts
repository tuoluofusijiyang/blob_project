export interface TextGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  signal?: AbortSignal;
  enableReasoning?: boolean;
  enableWebSearch?: boolean;
}

export interface TextGenerateChunk {
  type: 'text' | 'reasoning' | 'usage' | 'done';
  content?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ModelInfo {
  id: string;
  displayName: string;
  type: 'text' | 'image';
  contextWindow?: number;
  description?: string;
}

export interface TextProvider {
  readonly type: string;
  generateStream(params: TextGenerateParams): AsyncIterable<TextGenerateChunk>;
  listModels(): Promise<ModelInfo[]>;
}

export interface ImageGenerateParams {
  prompt: string;
  model: string;
  width: number;
  height: number;
  n?: number;
  negativePrompt?: string;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  base64?: string;
  url?: string;
  mimeType?: string;
  revisedPrompt?: string;
}

export interface ImageProvider {
  readonly type: string;
  generate(params: ImageGenerateParams): Promise<GeneratedImage[]>;
  listModels(): Promise<ModelInfo[]>;
}

export class AIError extends Error {
  constructor(
    message: string,
    public code: 'auth' | 'rate_limit' | 'network' | 'unknown',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }
}