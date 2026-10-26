import { App, Validations } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { PlatformData, PlatformPreview } from '../lib/platform.mjs';
import { PortfolioDomain } from '../lib/domain.mjs';
const app=new App(),env={region:'ap-southeast-2',account:process.env.CDK_DEFAULT_ACCOUNT};
const data=new PlatformData(app,'LokeshPlatformData',{env});
new PlatformPreview(app,'LokeshPlatformPreview',{env,data});
new PortfolioDomain(app,'LokeshPortfolioDomain',{env});
Validations.of(app).addPlugins(new AwsSolutionsChecks(app,{verbose:true}));app.synth();
