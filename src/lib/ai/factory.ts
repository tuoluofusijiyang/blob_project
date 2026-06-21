import { OpenAICompatibleProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import type { TextProvider, ImageProvider } from './base';
import { getDb, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

export async function getTextProvider(providerId: number): Promise<TextProvider> {
  const db = getDb();
  const provider = db.select().from(schema.aiProviders).where(eq(schema.aiProviders.id, providerId)).get();
  if (!provider) throw new Error(`Provider ${providerId} not found`);

  switch (provider.type) {
    case 'openai':
      return new OpenAICompatibleProvider(provider.apiKeyRef, provider.baseUrl || undefined);
    case 'anthropic':
      return new AnthropicProvider(provider.apiKeyRef, provider.baseUrl || undefined);
    default:
      throw new Error(`Unsupported text provider type: ${provider.type}`);
  }
}

export async function getImageProvider(providerId: number): Promise<ImageProvider> {
  const db = getDb();
  const provider = db.select().from(schema.aiProviders).where(eq(schema.aiProviders.id, providerId)).get();
  if (!provider) throw new Error(`Provider ${providerId} not found`);

  if (provider.type !== 'openai') {
    throw new Error(`Provider type ${provider.type} does not support image generation`);
  }
  return new OpenAICompatibleProvider(provider.apiKeyRef, provider.baseUrl || undefined);
}

export async function getProviderForType(providerId: number, type: 'text' | 'image') {
  return type === 'text' ? getTextProvider(providerId) : getImageProvider(providerId);
}