import { App, Validations } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { FoundationStack } from '../lib/foundation-stack.mjs';
const app = new App();
new FoundationStack(app, 'TechCanvasFoundation', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-southeast-2' } });
Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));
app.synth();
