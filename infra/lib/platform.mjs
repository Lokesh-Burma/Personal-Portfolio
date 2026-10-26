import { Stack, RemovalPolicy, Duration, CfnParameter, CfnOutput, ArnFormat, aws_dynamodb as ddb, aws_s3 as s3, aws_lambda as lambda, aws_logs as logs, aws_iam as iam, Validations } from 'aws-cdk-lib';
const names={portfolio:'lokesh-portfolio',api:'lokesh-content-api'};
function region(props){if(props.env?.region!=='ap-southeast-2')throw new Error('Only Sydney is supported.');return {...props,terminationProtection:true};}
export class PlatformData extends Stack {
 constructor(scope,id,props={}){
  super(scope,id,region(props));
  this.table=new ddb.Table(this,'BlogTable',{partitionKey:{name:'pk',type:ddb.AttributeType.STRING},sortKey:{name:'sk',type:ddb.AttributeType.STRING},billingMode:ddb.BillingMode.PAY_PER_REQUEST,encryption:ddb.TableEncryption.AWS_MANAGED,pointInTimeRecoverySpecification:{pointInTimeRecoveryEnabled:true},deletionProtection:true,removalPolicy:RemovalPolicy.RETAIN});
  const access=new s3.Bucket(this,'ArtifactAccessLogs',{blockPublicAccess:s3.BlockPublicAccess.BLOCK_ALL,encryption:s3.BucketEncryption.S3_MANAGED,enforceSSL:true,removalPolicy:RemovalPolicy.RETAIN,lifecycleRules:[{expiration:Duration.days(7)}]});
  Validations.of(access).acknowledge({id:'AwsSolutions-S1',reason:'Dedicated access-log destination does not recursively log itself.'});
  this.artifacts=new s3.Bucket(this,'BuildArtifacts',{blockPublicAccess:s3.BlockPublicAccess.BLOCK_ALL,encryption:s3.BucketEncryption.S3_MANAGED,enforceSSL:true,versioned:true,serverAccessLogsBucket:access,removalPolicy:RemovalPolicy.RETAIN,lifecycleRules:[{noncurrentVersionExpiration:Duration.days(30),abortIncompleteMultipartUploadAfter:Duration.days(1)}]});
  this.artifacts.addToResourcePolicy(new iam.PolicyStatement({principals:[new iam.ServicePrincipal('lambda.amazonaws.com')],actions:['s3:GetObject','s3:GetObjectVersion'],resources:[this.artifacts.arnForObjects('portfolio/*'),this.artifacts.arnForObjects('api/*')],conditions:{StringEquals:{'aws:SourceAccount':this.account},ArnLike:{'aws:SourceArn':Object.values(names).map(n=>this.formatArn({service:'lambda',resource:'web-function',resourceName:n+'/revision/*',arnFormat:ArnFormat.SLASH_RESOURCE_NAME}))}}}));
  new CfnOutput(this,'BlogTableName',{value:this.table.tableName});new CfnOutput(this,'ArtifactBucket',{value:this.artifacts.bucketName});
 }
}
export class PlatformPreview extends Stack {
 constructor(scope,id,props={}){
  const {data,...stackProps}=props;super(scope,id,region(stackProps));
  const siteOrigin=new CfnParameter(this,'SiteOrigin',{default:'https://lokeshburma.com',allowedPattern:'https://[^/]+',description:'Exact frontend origin. Set to the native preview URL before owner preview writes; set to custom domain only at approved cutover.'});
  const email=new CfnParameter(this,'AdminEmail',{noEcho:true,description:'Existing portfolio owner email; never put values in source.'});
  const password=new CfnParameter(this,'AdminPasswordHash',{noEcho:true,allowedPattern:'pbkdf2:[0-9]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+',description:'PBKDF2 owner password hash, not a plaintext password.'});
  const secret=new CfnParameter(this,'SessionSecret',{noEcho:true,minLength:32,description:'Server-only random session signing key.'});
  const common = this.node.tryGetContext('commonApp') === 'true' || this.node.tryGetContext('commonApp') === true;
  const protectLegacyApi = ['true',true].includes(this.node.tryGetContext('protectLegacyApi'));
  const closeCommonPreview = ['true',true].includes(this.node.tryGetContext('closeCommonPreview'));
  if((protectLegacyApi || closeCommonPreview) && !common)throw new Error('Endpoint protection is only valid after common-app cutover.');
  const commonParams = common ? {
    site: new CfnParameter(this,'CommonSiteOrigin',{allowedPattern:'https://[^/]+',description:'Exact origin for this staged or promoted common revision.'}),
    email: new CfnParameter(this,'CommonOwnerEmail',{noEcho:true,description:'Verified Cognito owner email for the common app; legacy API identity is preserved.'}),
    owner: new CfnParameter(this,'TechCanvasOwnerSubject',{allowedPattern:'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'}),
    table: new CfnParameter(this,'TechCanvasTableName',{allowedPattern:'[A-Za-z0-9_.-]{3,255}'}),
    bucket: new CfnParameter(this,'TechCanvasAssetsBucket',{allowedPattern:'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]'}),
    pool: new CfnParameter(this,'CognitoUserPoolId',{allowedPattern:'ap-southeast-2_[A-Za-z0-9]+'}),
    client: new CfnParameter(this,'CognitoClientId',{allowedPattern:'[a-z0-9]+'}),
    login: new CfnParameter(this,'CognitoLoginDomain',{allowedPattern:'https://[a-z0-9-]+\\.auth\\.ap-southeast-2\\.amazoncognito\\.com'}),
  } : undefined;
  const studioTable = commonParams ? ddb.Table.fromTableName(this,'CommonStudioTable',commonParams.table.valueAsString) : undefined;
  const studioAssets = commonParams ? s3.Bucket.fromBucketName(this,'CommonStudioAssets',commonParams.bucket.valueAsString) : undefined;
  const make=(name,environment)=>{
    const key=new CfnParameter(this,name+'CodeKey',{default:name+'/app.zip',allowedPattern:name+'/.*\\.zip'});
    const version=new CfnParameter(this,name+'CodeVersion',{minLength:1,description:'Exact immutable object version of the reviewed Linux/ARM64 ZIP.'});
    const log=new logs.LogGroup(this,name+'Logs',{logGroupName:'/aws/lambda/web/'+names[name],retention:logs.RetentionDays.ONE_WEEK,removalPolicy:RemovalPolicy.DESTROY});
    const localLog=new logs.LogGroup(this,name+'LocalLogs',{logGroupName:'/aws/lambda/web/'+names[name]+'.local',retention:logs.RetentionDays.ONE_WEEK,removalPolicy:RemovalPolicy.DESTROY});
    const role=new iam.Role(this,name+'Role',{assumedBy:new iam.ServicePrincipal('lambda.amazonaws.com')});log.grantWrite(role);localLog.grantWrite(role);
    if(name==='api' || (name==='portfolio' && common))data.table.grantReadWriteData(role);
    if(name==='portfolio' && commonParams){
      studioTable.grantReadData(role);
      studioAssets.grantRead(role,`owners/${commonParams.owner.valueAsString}/jobs/*`);
      for(const [id,reason] of [
        ['AwsSolutions-IAM5[Action::s3:GetObject*]','CDK private asset read/version actions, scoped to the configured owner job prefix.'],
        ['AwsSolutions-IAM5[Action::s3:GetBucket*]','CDK metadata reads are scoped to the existing generated-assets bucket.'],
        ['AwsSolutions-IAM5[Action::s3:List*]','CDK listing is confined to the existing generated-assets bucket; object reads are owner scoped.'],
        ['AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:s3:::<TechCanvasAssetsBucket>/owners/<TechCanvasOwnerSubject>/jobs/*]','The wildcard is limited to generated files of the exact configured owner in the existing private asset bucket.'],
      ])Validations.of(role).acknowledge({id,reason});
    }
    const fn=new lambda.CfnWebFunction(this,name+'Function',{functionName:names[name]});
    const revision=new lambda.CfnWebFunctionRevision(this,name+'Revision',{functionName:names[name],buildConfig:{runtimeConfig:{runtime:'nodejs24.x'},codeConfig:{s3Object:{bucket:data.artifacts.bucketName,key:key.valueAsString,versionId:version.valueAsString}}},serviceConfig:{executionRoleArn:role.roleArn,environmentVariables:{NODE_ENV:'production',...environment},timeoutSeconds:30,maxConcurrencyPerEnvironment:10,telemetryConfig:{loggingConfig:{logGroup:log.logGroupName,applicationLogLevel:'INFO',systemLogLevel:'WARN'}}}});
    for (const resource of [fn, revision]) Validations.of(resource).acknowledge({id:'CloudFormation-Validate::F3006',reason:'Bundled validator registry predates Lambda Web Functions. Native CDK L1 properties checked against the live Sydney CloudFormation resource schema; deployment validation remains required.'});
    revision.addResourceDependency(fn);revision.applyRemovalPolicy(RemovalPolicy.RETAIN);
    const endpoint=new lambda.CfnWebFunctionEndpoint(this,name+'Endpoint',{functionName:names[name],endpointName:'preview',endpointType:'HomeRegion',authType:((name==='api' && protectLegacyApi) || (name==='portfolio' && closeCommonPreview))?'IamAuth':'ApplicationManaged',revisionWeights:[{revisionId:revision.getAtt('RevisionId').toString(),weight:100}],scalingConfig:{maxEnvironments:2},throttleConfig:{rateLimit:100}});
    Validations.of(endpoint).acknowledge({id:'CloudFormation-Validate::F3006',reason:'Bundled validator registry predates Lambda Web Functions. Native CDK L1 properties checked against live service documentation and schema; deployment validation remains required.'});
    endpoint.addResourceDependency(fn);
    return {endpoint,url:`https://${endpoint.getAtt('DomainName').toString()}`};
  };
  const api=make('api',{BLOG_STORAGE:'dynamodb',BLOG_TABLE_NAME:data.table.tableName,ADMIN_EMAIL:email.valueAsString,ADMIN_PASSWORD_HASH:password.valueAsString,SESSION_SECRET:secret.valueAsString,CORS_ORIGIN:siteOrigin.valueAsString,ENABLE_API_DOCS:'false'});
  const portfolio=make('portfolio',commonParams ? {
    BLOG_TABLE_NAME:data.table.tableName,ADMIN_EMAIL:commonParams.email.valueAsString,SESSION_SECRET:secret.valueAsString,
    SITE_ORIGIN:commonParams.site.valueAsString,TECHCANVAS_TABLE_NAME:commonParams.table.valueAsString,
    TECHCANVAS_ASSETS_BUCKET:commonParams.bucket.valueAsString,TECHCANVAS_OWNER_SUBJECT:commonParams.owner.valueAsString,
    COGNITO_USER_POOL_ID:commonParams.pool.valueAsString,COGNITO_CLIENT_ID:commonParams.client.valueAsString,COGNITO_LOGIN_DOMAIN:commonParams.login.valueAsString,
    BEDROCK_USAGE_APPROVED:'false',
  } : {PORTFOLIO_API_URL:api.url,SITE_ORIGIN:siteOrigin.valueAsString});
  new CfnOutput(this,'ApiPreviewUrl',{value:api.url});new CfnOutput(this,'PortfolioPreviewUrl',{value:portfolio.url});
 }
}
