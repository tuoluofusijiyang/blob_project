import type { TextProvider, TextGenerateParams, TextGenerateChunk, ModelInfo } from './base';
import { AIError } from './base';
import { getKey } from '@/lib/keychain';

export class AnthropicProvider implements TextProvider {
  readonly type = 'anthropic';

  constructor(private apiKeyRef: string, private baseUrl?: string) {}

  private async getApiKey(): Promise<string> {
    const key = await getKey(this.apiKeyRef);
    if (!key) throw new AIError('API Key not found', 'auth', false);
    return key;
  }

  async *generateStream(params: TextGenerateParams): AsyncIterable<TextGenerateChunk> {
    const apiKey = await this.getApiKey();
    const baseUrl = this.baseUrl || 'https://api.anthropic.com';

    // 思考模式：开启时附加 thinking block
    // 注意：开启后 max_tokens 必须 > budget_tokens；temperature 强制 1
    const enableReasoning = params.enableReasoning ?? true;
    const maxTokens = params.maxTokens || 4096;
    const body: Record<string, unknown> = {
      model: params.model,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userPrompt }],
      max_tokens: enableReasoning ? Math.max(maxTokens, 8192) : maxTokens,
      top_p: params.topP,
      stream: true,
    };
    if (enableReasoning) {
      // 给思考预留 5000 token，剩余给正文
      const thinkingBudget = Math.min(5000, Math.max(1024, Math.floor(maxTokens * 0.4)));
      body.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
      // 思考模式要求 temperature = 1（不传或传 1）
      body.temperature = 1;
    } else {
      body.temperature = params.temperature;
    }

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 401) throw new AIError('API Key 无效', 'auth', false);
      if (response.status === 429) throw new AIError('请求过于频繁', 'rate_limit', true);
      throw new AIError(`API 错误: ${err}`, 'unknown', response.status >= 500);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        try {
          const json = JSON.parse(data);
          // 思考 block 的 delta（仅在开启思考模式时出现）
          if (json.type === 'content_block_delta' && json.delta?.type === 'thinking_delta' && json.delta?.thinking) {
            yield { type: 'reasoning', content: json.delta.thinking };
          } else if (json.type === 'content_block_delta' && json.delta?.text) {
            yield { type: 'text', content: json.delta.text };
          }
          if (json.type === 'message_start' && json.message?.usage) {
            inputTokens = json.message.usage.input_tokens;
          }
          if (json.type === 'message_delta' && json.usage) {
            outputTokens = json.usage.output_tokens;
          }
          if (json.type === 'message_stop') {
            yield { type: 'usage', usage: { inputTokens, outputTokens } };
            yield { type: 'done' };
            return;
          }
        } catch {}
      }
    }
    yield { type: 'done' };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: 'claude-opus-4-7', displayName: 'Claude Opus 4.7', type: 'text', contextWindow: 200000 },
      { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', type: 'text', contextWindow: 200000 },
      { id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5', type: 'text', contextWindow: 200000 },
    ];
  }
}