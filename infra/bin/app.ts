#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { resolveDeploymentConfig } from '../lib/config';
import { InteractiveBusinessCardStack } from '../lib/interactive-business-card-stack';

const deploymentConfig = resolveDeploymentConfig(process.env);

const app = new App();

new InteractiveBusinessCardStack(app, `${deploymentConfig.appName}-${deploymentConfig.stage}`, {
  env: {
    account: deploymentConfig.account,
    region: deploymentConfig.region,
  },
  description: 'Lambda-based deployment for the interactive business card Next.js app.',
  deploymentConfig,
});
