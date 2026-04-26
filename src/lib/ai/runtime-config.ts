export type ProviderRuntimeConfig = {
  provider: 'openrouter' | 'bedrock' | 'ollama';
  openRouterApiKey?: string;
  openRouterModel?: string;
  bedrockRegion?: string;
  bedrockModelId?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  canCallProvider: boolean;
};

export function getProviderRuntimeConfig(source: Record<string, string | undefined>): ProviderRuntimeConfig {
  const modelProvider = source.MODEL_PROVIDER?.trim();
  const provider = modelProvider === 'bedrock' || modelProvider === 'ollama' ? modelProvider : 'openrouter';
  const openRouterApiKey = source.OPENROUTER_API_KEY?.trim() || undefined;
  const openRouterModel = source.OPENROUTER_MODEL?.trim() || 'openai/gpt-4.1-mini';
  const bedrockRegion = source.BEDROCK_REGION?.trim() || undefined;
  const bedrockModelId = source.BEDROCK_MODEL_ID?.trim() || undefined;
  const ollamaBaseUrl = source.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434';
  const ollamaModel = source.OLLAMA_MODEL?.trim() || 'llama3.1:8b';

  const canCallProvider = provider === 'openrouter'
    ? Boolean(openRouterApiKey)
    : provider === 'bedrock'
      ? Boolean(bedrockRegion && bedrockModelId)
      : Boolean(ollamaBaseUrl && ollamaModel);

  return {
    provider,
    openRouterApiKey,
    openRouterModel,
    bedrockRegion,
    bedrockModelId,
    ollamaBaseUrl,
    ollamaModel,
    canCallProvider,
  };
}
