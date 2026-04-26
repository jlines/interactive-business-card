import { Duration, CfnOutput, Fn, Stack, StackProps, aws_certificatemanager as acm, aws_cloudfront as cloudfront, aws_cloudfront_origins as origins, aws_dynamodb as dynamodb, aws_iam as iam, aws_lambda as lambda, aws_route53 as route53, aws_secretsmanager as secretsmanager, aws_wafv2 as wafv2, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { DeploymentConfig } from './config';

const CLOUDFRONT_ZONE_ID = 'Z2FDTNDATAQYW2';
const ORIGIN_VERIFY_HEADER = 'X-Origin-Verify';

export interface InteractiveBusinessCardStackProps extends StackProps {
  deploymentConfig: DeploymentConfig;
}

export class InteractiveBusinessCardStack extends Stack {
  constructor(scope: Construct, id: string, props: InteractiveBusinessCardStackProps) {
    super(scope, id, props);

    const { deploymentConfig } = props;
    const runtimeSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'RuntimeConfigSecret',
      deploymentConfig.secretName,
    );

    const sessionTable = new dynamodb.Table(this, 'SessionTable', {
      tableName: deploymentConfig.sessionTableName,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAtEpoch',
      removalPolicy: deploymentConfig.stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    const tokenTable = new dynamodb.Table(this, 'TokenTable', {
      tableName: deploymentConfig.tokenTableName,
      partitionKey: { name: 'tokenHash', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: deploymentConfig.stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    const originVerificationSecret = new secretsmanager.Secret(this, 'OriginVerificationSecret', {
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    const configuredBaseUrl = deploymentConfig.domainName
      ? `https://${deploymentConfig.domainName}`
      : 'https://placeholder.local';

    const appFunction = new lambda.DockerImageFunction(this, 'AppFunction', {
      functionName: `${deploymentConfig.appName}-${deploymentConfig.stage}`,
      architecture: lambda.Architecture.X86_64,
      memorySize: deploymentConfig.memorySize,
      timeout: Duration.seconds(deploymentConfig.timeoutSeconds),
      code: lambda.DockerImageCode.fromImageAsset('.', {
        file: 'infra/docker/Dockerfile',
      }),
      environment: {
        MODEL_PROVIDER: deploymentConfig.modelProvider,
        OPENROUTER_MODEL: deploymentConfig.openRouterModel,
        BEDROCK_REGION: deploymentConfig.bedrockRegion ?? deploymentConfig.region,
        BEDROCK_MODEL_ID: deploymentConfig.bedrockModelId ?? '',
        SESSION_SECRET: runtimeSecret.secretValueFromJson('SESSION_SECRET').unsafeUnwrap(),
        TOKEN_PEPPER: runtimeSecret.secretValueFromJson('TOKEN_PEPPER').unsafeUnwrap(),
        OPENROUTER_API_KEY: runtimeSecret.secretValueFromJson('OPENROUTER_API_KEY').unsafeUnwrap(),
        SESSION_TABLE_NAME: sessionTable.tableName,
        TOKEN_TABLE_NAME: tokenTable.tableName,
        SESSION_TTL_HOURS: String(deploymentConfig.sessionTtlHours),
        ORIGIN_VERIFY_HEADER: deploymentConfig.originProtectionEnabled ? ORIGIN_VERIFY_HEADER.toLowerCase() : '',
        ORIGIN_VERIFY_TOKEN: deploymentConfig.originProtectionEnabled ? originVerificationSecret.secretValue.unsafeUnwrap() : '',
        AWS_LWA_PORT: '3000',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
        APP_BASE_URL: configuredBaseUrl,
      },
    });

    runtimeSecret.grantRead(appFunction);
    originVerificationSecret.grantRead(appFunction);
    sessionTable.grantReadWriteData(appFunction);
    tokenTable.grantReadWriteData(appFunction);

    appFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      }),
    );

    const functionUrl = appFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.BUFFERED,
    });

    const functionUrlDomainName = Fn.select(2, Fn.split('/', functionUrl.url));
    const certificate = deploymentConfig.certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'DistributionCertificate', deploymentConfig.certificateArn)
      : undefined;

    const webAcl = deploymentConfig.wafEnabled
      ? new wafv2.CfnWebACL(this, 'AppWebAcl', {
          defaultAction: { allow: {} },
          scope: 'CLOUDFRONT',
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${deploymentConfig.appName}-${deploymentConfig.stage}-webacl`,
            sampledRequestsEnabled: true,
          },
          rules: [
            {
              name: 'AWSManagedRulesCommonRuleSet',
              priority: 1,
              overrideAction: { none: {} },
              statement: {
                managedRuleGroupStatement: {
                  vendorName: 'AWS',
                  name: 'AWSManagedRulesCommonRuleSet',
                },
              },
              visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'common-rule-set',
                sampledRequestsEnabled: true,
              },
            },
            {
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
              priority: 2,
              overrideAction: { none: {} },
              statement: {
                managedRuleGroupStatement: {
                  vendorName: 'AWS',
                  name: 'AWSManagedRulesKnownBadInputsRuleSet',
                },
              },
              visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'known-bad-inputs',
                sampledRequestsEnabled: true,
              },
            },
          ],
        })
      : undefined;

    const distribution = new cloudfront.Distribution(this, 'AppDistribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(functionUrlDomainName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          customHeaders: deploymentConfig.originProtectionEnabled
            ? {
                [ORIGIN_VERIFY_HEADER]: originVerificationSecret.secretValue.unsafeUnwrap(),
              }
            : undefined,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: new cloudfront.CachePolicy(this, 'DynamicCachePolicy', {
          defaultTtl: Duration.seconds(0),
          minTtl: Duration.seconds(0),
          maxTtl: Duration.seconds(1),
          cookieBehavior: cloudfront.CacheCookieBehavior.all(),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
          headerBehavior: cloudfront.CacheHeaderBehavior.allowList('authorization', 'content-type'),
        }),
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        '/_next/static/*': {
          origin: new origins.HttpOrigin(functionUrlDomainName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            customHeaders: deploymentConfig.originProtectionEnabled
              ? {
                  [ORIGIN_VERIFY_HEADER]: originVerificationSecret.secretValue.unsafeUnwrap(),
                }
              : undefined,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
      },
      certificate,
      domainNames: deploymentConfig.domainName ? [deploymentConfig.domainName] : undefined,
      comment: `Edge distribution for ${deploymentConfig.appName}-${deploymentConfig.stage}`,
      defaultRootObject: '',
      webAclId: webAcl?.attrArn,
    });

    if (deploymentConfig.domainName && deploymentConfig.hostedZoneName) {
      new route53.CfnRecordSet(this, 'AppAliasRecord', {
        hostedZoneName: deploymentConfig.hostedZoneName.endsWith('.')
          ? deploymentConfig.hostedZoneName
          : `${deploymentConfig.hostedZoneName}.`,
        name: deploymentConfig.domainName,
        type: 'A',
        aliasTarget: {
          dnsName: distribution.distributionDomainName,
          hostedZoneId: CLOUDFRONT_ZONE_ID,
        },
      });
    }

    const appUrl = deploymentConfig.domainName
      ? `https://${deploymentConfig.domainName}`
      : `https://${distribution.distributionDomainName}`;

    new CfnOutput(this, 'FunctionUrl', {
      value: functionUrl.url,
      description: 'Direct Lambda Function URL for the app origin.',
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name in front of the Lambda app.',
    });

    new CfnOutput(this, 'AppUrl', {
      value: appUrl,
      description: 'Primary HTTPS URL for the deployed app.',
    });

    new CfnOutput(this, 'RuntimeSecretName', {
      value: runtimeSecret.secretName,
      description: 'Secrets Manager secret expected to contain runtime values.',
    });

    new CfnOutput(this, 'SessionTableName', {
      value: sessionTable.tableName,
      description: 'DynamoDB table that stores chat sessions.',
    });

    new CfnOutput(this, 'TokenTableName', {
      value: tokenTable.tableName,
      description: 'DynamoDB table that stores entry tokens.',
    });
  }
}
