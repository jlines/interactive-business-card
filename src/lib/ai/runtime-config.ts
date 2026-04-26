export type ProviderRuntimeConfig = {
  provider: 'openrouter' | 'bedrock';
  openRouterApiKey?: string;
  openRouterModel?: string;
  bedrockRegion?: string;
  bedrockModelId?: string;
  canCallProvider: boolean;
};

export function getProviderRuntimeConfig(source: Record<string, string | undefined>): ProviderRuntimeConfig {
  const provider = source.MODEL_PROVIDER === 'bedrock' ? 'bedrock' : 'openrouter';
  const openRouterApiKey = source.OPENROUTER_API_KEY?.trim() || undefined;
  const openRouterModel = source.OPENROUTER_MODEL?.trim() || 'openai/gpt-4.1-mini';
  const bedrockRegion = source.BEDROCK_REGION?.trim() || undefined;
  const bedrockModelId = source.BEDROCK_MODEL_ID?.trim() || undefined;

  const canCallProvider = provider === 'openrouter'
    ? Boolean(openRouterApiKey)
    : Boolean(bedrockRegion && bedrockModelId);

  return {
    provider,
    openRouterApiKey,
    openRouterModel,
    bedrockRegion,
    bedrockModelId,
    canCallProvider,
  };
}
