import { z } from 'zod';

const deploymentConfigSchema = z.object({
  CDK_DEFAULT_ACCOUNT: z.string().min(1, 'CDK_DEFAULT_ACCOUNT is required'),
  CDK_DEFAULT_REGION: z.string().min(1, 'CDK_DEFAULT_REGION is required'),
  APP_CONFIG_SECRET_NAME: z.string().min(1, 'APP_CONFIG_SECRET_NAME is required'),
  DEPLOYMENT_STAGE: z.string().min(1).default('dev'),
  APP_NAME: z.string().min(1).default('interactive-business-card'),
  MODEL_PROVIDER: z.enum(['openrouter', 'bedrock']).default('openrouter'),
  OPENROUTER_MODEL: z.string().min(1).default('openai/gpt-4.1-mini'),
  BEDROCK_REGION: z.string().min(1).optional(),
  BEDROCK_MODEL_ID: z.string().min(1).optional(),
  CUSTOM_DOMAIN_NAME: z.string().min(1).optional(),
  HOSTED_ZONE_NAME: z.string().min(1).optional(),
  ACM_CERTIFICATE_ARN: z.string().min(1).optional(),
  LAMBDA_MEMORY_SIZE: z.coerce.number().int().min(512).max(10240).default(1536),
  LAMBDA_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(900).default(30),
  SESSION_TABLE_NAME: z.string().min(1).optional(),
  TOKEN_TABLE_NAME: z.string().min(1).optional(),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(168),
  ENABLE_WAF: z.enum(['true', 'false']).default('true'),
  ENABLE_ORIGIN_PROTECTION: z.enum(['true', 'false']).default('true'),
});

export type DeploymentConfig = {
  account: string;
  region: string;
  stage: string;
  appName: string;
  secretName: string;
  modelProvider: 'openrouter' | 'bedrock';
  openRouterModel: string;
  bedrockRegion?: string;
  bedrockModelId?: string;
  memorySize: number;
  timeoutSeconds: number;
  domainName?: string;
  hostedZoneName?: string;
  certificateArn?: string;
  sessionTableName: string;
  tokenTableName: string;
  sessionTtlHours: number;
  wafEnabled: boolean;
  originProtectionEnabled: boolean;
};

export function resolveDeploymentConfig(source: Record<string, string | undefined>): DeploymentConfig {
  const parsed = deploymentConfigSchema.parse(source);
  const defaultPrefix = `${parsed.APP_NAME}-${parsed.DEPLOYMENT_STAGE}`;

  return {
    account: parsed.CDK_DEFAULT_ACCOUNT,
    region: parsed.CDK_DEFAULT_REGION,
    stage: parsed.DEPLOYMENT_STAGE,
    appName: parsed.APP_NAME,
    secretName: parsed.APP_CONFIG_SECRET_NAME,
    modelProvider: parsed.MODEL_PROVIDER,
    openRouterModel: parsed.OPENROUTER_MODEL,
    bedrockRegion: parsed.BEDROCK_REGION ?? parsed.CDK_DEFAULT_REGION,
    bedrockModelId: parsed.BEDROCK_MODEL_ID,
    memorySize: parsed.LAMBDA_MEMORY_SIZE,
    timeoutSeconds: parsed.LAMBDA_TIMEOUT_SECONDS,
    domainName: parsed.CUSTOM_DOMAIN_NAME,
    hostedZoneName: parsed.HOSTED_ZONE_NAME,
    certificateArn: parsed.ACM_CERTIFICATE_ARN,
    sessionTableName: parsed.SESSION_TABLE_NAME ?? `${defaultPrefix}-sessions`,
    tokenTableName: parsed.TOKEN_TABLE_NAME ?? `${defaultPrefix}-tokens`,
    sessionTtlHours: parsed.SESSION_TTL_HOURS,
    wafEnabled: parsed.ENABLE_WAF === 'true',
    originProtectionEnabled: parsed.ENABLE_ORIGIN_PROTECTION === 'true',
  };
}
