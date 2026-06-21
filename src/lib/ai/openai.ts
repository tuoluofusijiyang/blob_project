import type {
  TextProvider, ImageProvider, TextGenerateParams, TextGenerateChunk,
  ImageGenerateParams, GeneratedImage, ModelInfo,
} from './base';
import { AIError } from './base';
import { getKey } from '@/lib/keychain';

export class OpenAICompatibleProvider implements TextProvider, ImageProvider {
  readonly type = 'openai';

  constructor(private apiKeyRef: string, private baseUrl?: string) {}

  private async getApiKey(): Promise<string> {
    const key = await getKey(this.apiKeyRef);
    if (!key) throw new AIError('API Key not found', 'auth', false);
    return key;
  }

  private async getBaseUrl(): Promise<string> {
    return this.baseUrl || 'https://api.openai.com/v1';
  }

  async *generateStream(params: TextGenerateParams): AsyncIterable<TextGenerateChunk> {
    const apiKey = await this.getApiKey();
    const baseUrl = await this.getBaseUrl();

    // 思考模式：仅 o1/o3 系列支持 reasoning_effort；其他模型（DeepSeek-R1、豆包深度思考等）本身就是思考型，不用额外参数
    const enableReasoning = params.enableReasoning ?? true;
    const isReasoningModel = /^(o1|o3|o4|chatgpt-4o-latest)/i.test(params.model);
    const body: Record<string, unknown> = {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stream: true,
      stream_options: { include_usage: true },
    };
    if (enableReasoning && isReasoningModel) {
      body.reasoning_effort = 'medium';
    }
    // 联网搜索：DeepSeek 接受 web_search: true；其他 OpenAI 兼容 provider 通常忽略该参数或有自己的同名参数
    const enableWebSearch = params.enableWebSearch ?? true;
    if (enableWebSearch) {
      body.web_search = true;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new AIError('API Key 无效', 'auth', false);
      }
      if (response.status === 429) {
        throw new AIError('请求过于频繁', 'rate_limit', true);
      }
      throw new AIError(`API 错误: ${err}`, 'unknown', response.status >= 500);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          yield { type: 'done' };
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { type: 'text', content: delta };
          if (json.usage) {
            yield {
              type: 'usage',
              usage: {
                inputTokens: json.usage.prompt_tokens,
                outputTokens: json.usage.completion_tokens,
              },
            };
          }
        } catch {}
      }
    }
    yield { type: 'done' };
  }

  async generate(params: ImageGenerateParams): Promise<GeneratedImage[]> {
    const apiKey = await this.getApiKey();
    const baseUrl = await this.getBaseUrl();

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        prompt: params.prompt,
        n: params.n || 1,
        size: `${params.width}x${params.height}`,
        response_format: 'b64_json',
      }),
      signal: params.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 401) throw new AIError('API Key 无效', 'auth', false);
      if (response.status === 429) throw new AIError('请求过于频繁', 'rate_limit', true);
      throw new AIError(`图片生成失败: ${err}`, 'unknown', response.status >= 500);
    }

    const json = await response.json();
    return (json.data || []).map((img: any) => ({
      base64: img.b64_json,
      url: img.url,
      mimeType: 'image/png',
      revisedPrompt: img.revised_prompt,
    }));
  }

  async listModels(): Promise<ModelInfo[]> {
    const apiKey = await this.getApiKey();
    const baseUrl = await this.getBaseUrl();

    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new AIError(`拉取模型列表失败: ${response.status}`, 'network', response.status >= 500);
    }

    const json = await response.json();
    const rawList: any[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];

    const models: ModelInfo[] = [];
    for (const m of rawList) {
      const id: string = m.id || m.model || m.name;
      if (!id || typeof id !== 'string') continue;
      const lower = id.toLowerCase();
      // 过滤掉明显非生成类的模型
      if (
        lower.includes('embed') ||
        lower.includes('whisper') ||
        lower.includes('tts') ||
        lower.includes('moderation') ||
        lower.includes('davinci') ||
        lower.includes('babbage') ||
        lower.includes('rerank')
      ) {
        continue;
      }
      const isImage = /(image|vision|sora|dall[- ]?e|flux|sd-|stable[- ]?diffusion|mj-|midjourney|seedream|seededit|jimeng|即梦|t2i|t2v|i2i)/.test(lower);
      models.push({
        id,
        displayName: id,
        type: isImage ? 'image' : 'text',
      });
    }

    // 稳定排序：文本模型在前，图片在后，按 id 升序
    models.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'text' ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

    return models;
  }
}