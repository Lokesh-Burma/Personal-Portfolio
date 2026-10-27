import { Stack, Validations, Duration, RemovalPolicy, CfnParameter, CfnOutput, aws_s3 as s3, aws_cloudfront as cf, aws_cloudfront_origins as origins, aws_dynamodb as db, aws_sqs as sqs, aws_lambda as lambda, aws_lambda_event_sources as sources, aws_logs as logs, aws_iam as iam, aws_cognito as cognito, aws_apigatewayv2 as api } from 'aws-cdk-lib';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
export class FoundationStack extends Stack {
  constructor(scope, id, props = {}) {
    if (props.env?.region !== 'ap-southeast-2') throw new Error('Only the selected Sydney Region is supported');
    super(scope, id, { ...props, terminationProtection: true });
    const trialJob = this.node.tryGetContext('manualImageTrialJobId');
    if(trialJob && !/^[a-z0-9]{10}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(trialJob))throw new Error('Manual image trial requires one exact valid job ID.');
    const legacyDisabled = ['true',true].includes(this.node.tryGetContext('retireLegacyStudio'));
    const commonOrigin = this.node.tryGetContext('commonAppOrigin');
    if(legacyDisabled && !commonOrigin)throw new Error('Retiring the legacy studio requires the common app origin.');
    const owner = new CfnParameter(this, 'OwnerSubject', { default: 'UNCONFIGURED', allowedPattern: 'UNCONFIGURED|[0-9a-fA-F-]{36}', description: 'Exact Cognito owner sub; default denies every user.' });
    const audit = new s3.Bucket(this, 'AccessLogs', { blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, encryption: s3.BucketEncryption.S3_MANAGED, enforceSSL: true, objectOwnership: s3.ObjectOwnership.OBJECT_WRITER, removalPolicy: RemovalPolicy.RETAIN, lifecycleRules: [{ expiration: Duration.days(7) }] });
    const acknowledge = (node, id, reason) => Validations.of(node).acknowledge({ id, reason });
    acknowledge(audit, 'AwsSolutions-S1', 'Dedicated access-log destination; recursive self logging is intentionally disabled.');
    const bucketProps = { blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, encryption: s3.BucketEncryption.S3_MANAGED, enforceSSL: true, removalPolicy: RemovalPolicy.RETAIN, versioned: true, serverAccessLogsBucket: audit, lifecycleRules: [{ noncurrentVersionExpiration: Duration.days(30), abortIncompleteMultipartUploadAfter: Duration.days(1) }] };
    const site = new s3.Bucket(this, 'Frontend', bucketProps);
    const generated = new s3.Bucket(this, 'GeneratedAssets', bucketProps);
    const securityHeaders = new cf.ResponseHeadersPolicy(this, 'BrowserSecurityHeaders', { securityHeadersBehavior: { contentSecurityPolicy: { contentSecurityPolicy: "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: https://*.s3.ap-southeast-2.amazonaws.com; connect-src 'self' https://*.execute-api.ap-southeast-2.amazonaws.com https://*.auth.ap-southeast-2.amazoncognito.com https://*.s3.ap-southeast-2.amazonaws.com; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'", override: true }, contentTypeOptions: { override: true }, frameOptions: { frameOption: cf.HeadersFrameOption.DENY, override: true }, referrerPolicy: { referrerPolicy: cf.HeadersReferrerPolicy.NO_REFERRER, override: true }, strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true } } });
    const distribution = new cf.Distribution(this, 'FrontendDistribution', { enableLogging: true, logBucket: audit, logFilePrefix: 'cloudfront/', defaultRootObject: 'index.html', defaultBehavior: { origin: origins.S3BucketOrigin.withOriginAccessControl(site), viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, cachePolicy: cf.CachePolicy.CACHING_DISABLED, responseHeadersPolicy: securityHeaders, allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD }, priceClass: cf.PriceClass.PRICE_CLASS_200 });
    if(legacyDisabled)distribution.node.defaultChild.addPropertyOverride('DistributionConfig.Enabled',false);
    const frontendUrl = `https://${distribution.distributionDomainName}`;
    generated.addCorsRule({ allowedOrigins: [legacyDisabled ? commonOrigin : frontendUrl], allowedMethods: [s3.HttpMethods.GET], allowedHeaders: ['*'], maxAge: 300 });
    const table = new db.Table(this, 'JobsQuotaOutbox', { partitionKey: { name: 'pk', type: db.AttributeType.STRING }, sortKey: { name: 'sk', type: db.AttributeType.STRING }, billingMode: db.BillingMode.PAY_PER_REQUEST, encryption: db.TableEncryption.AWS_MANAGED, timeToLiveAttribute: 'expiresAt', stream: db.StreamViewType.NEW_IMAGE, pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }, removalPolicy: RemovalPolicy.RETAIN });
    const dead = new sqs.Queue(this, 'GenerationDeadLetter', { fifo: true, encryption: sqs.QueueEncryption.SQS_MANAGED, enforceSSL: true, retentionPeriod: Duration.days(14) });
    const queue = new sqs.Queue(this, 'GenerationQueue', { fifo: true, encryption: sqs.QueueEncryption.SQS_MANAGED, enforceSSL: true, visibilityTimeout: Duration.minutes(15), deadLetterQueue: { queue: dead, maxReceiveCount: 2 } });
    const streamDead = new sqs.Queue(this, 'DispatchDeadLetter', { encryption: sqs.QueueEncryption.SQS_MANAGED, enforceSSL: true, retentionPeriod: Duration.days(14) });
    const makeFunction = (name, handler) => {
      const useGo = name === 'GenerationWorker' && ['true',true].includes(this.node.tryGetContext('goWorker'));
      const goPath = useGo ? (this.node.tryGetContext('goWorkerAssetPath') || fileURLToPath(new URL('../../../worker/.build/aws', import.meta.url))) : undefined;
      if (useGo) {
        for (const file of readdirSync(goPath)) if (!['bootstrap','bootstrap.sha256','build-manifest.json'].includes(file) || !lstatSync(join(goPath,file)).isFile()) throw new Error('Go asset directory must contain only reviewed build outputs.');
        const binary=readFileSync(join(goPath,'bootstrap'));
        if(binary.length<64 || binary.subarray(0,4).toString('hex')!=='7f454c46' || binary[4]!==2 || binary[5]!==1 || binary.readUInt16LE(18)!==183)throw new Error('Build the Go worker for Linux ARM64 first.');
      }
      const logGroup = new logs.LogGroup(this, `${name}Logs`, { retention: logs.RetentionDays.ONE_WEEK, removalPolicy: RemovalPolicy.DESTROY });
      const role = new iam.Role(this, `${name}Role`, { assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com') });
      logGroup.grantWrite(role);
      return new lambda.Function(this, name, { runtime: useGo ? lambda.Runtime.PROVIDED_AL2023 : lambda.Runtime.NODEJS_24_X, architecture: lambda.Architecture.ARM_64, code: lambda.Code.fromAsset(useGo ? goPath : fileURLToPath(new URL('../build', import.meta.url))), handler: useGo ? 'bootstrap' : `${handler}-entry.handler`, timeout: Duration.seconds(120), memorySize: 512, logGroup, role, environment: { ...(useGo ? { TECHCANVAS_GO_WORKER_ENABLED: 'true' } : {}), CLOUD_BACKEND_READY: 'true', BEDROCK_USAGE_APPROVED: 'false', BEDROCK_IMAGE_USAGE_APPROVED: 'false', BEDROCK_IMAGE_REGION: '', OWNER_SUBJECT: owner.valueAsString, TABLE_NAME: table.tableName, ASSETS_BUCKET: generated.bucketName, QUEUE_URL: queue.queueUrl, MONTHLY_ATTEMPT_LIMIT: '300', DAILY_ATTEMPT_LIMIT: '20', MAX_INPUT_BYTES: '6000', MAX_OUTPUT_TOKENS: '1600' } });
    };
    const backend = makeFunction('ApiHandler', 'api');
    const dispatcher = makeFunction('OutboxDispatcher', 'dispatcher');
    const worker = makeFunction('GenerationWorker', 'worker');
    if(trialJob){
      if(!['true',true].includes(this.node.tryGetContext('goWorker')))throw new Error('Image trials require the Go worker.');
      worker.addEnvironment('BEDROCK_USAGE_APPROVED','true');
      worker.addEnvironment('BEDROCK_IMAGE_USAGE_APPROVED','true');
      worker.addEnvironment('BEDROCK_IMAGE_REGION','us-west-2');
      worker.addEnvironment('TECHCANVAS_TRIAL_JOB_ID',trialJob);
      dispatcher.addEnvironment('BEDROCK_USAGE_APPROVED','true');
      worker.addToRolePolicy(new iam.PolicyStatement({actions:['bedrock:InvokeModel'],resources:[
        this.formatArn({service:'bedrock',region:'ap-southeast-2',account:'',resource:'foundation-model',resourceName:'amazon.nova-lite-v1:0'}),
        this.formatArn({service:'bedrock',region:'us-west-2',account:'',resource:'foundation-model',resourceName:'stability.stable-image-core-v1:1'})
      ]}));
    }
    worker.addEventSource(new sources.SqsEventSource(queue, { enabled: false, batchSize: 1, maxConcurrency: 2, reportBatchItemFailures: true }));
    dispatcher.addEventSource(new sources.DynamoEventSource(table, { enabled: false, filters: [lambda.FilterCriteria.filter({ eventName: ['INSERT'], dynamodb: { NewImage: { kind: { S: ['outbox'] } }, Keys: { pk: { S: [{ prefix: 'OWNER#' }] } } } })], startingPosition: lambda.StartingPosition.LATEST, batchSize: 1, retryAttempts: 2, bisectBatchOnError: true, onFailure: new sources.SqsDlq(streamDead), reportBatchItemFailures: true }));
    queue.grantSendMessages(dispatcher);
    // CDK resource grants scope the SDK baseline to this table and owner asset prefix.
    // Default releases have no model permission; manual trials scope it to two exact models.
    for (const fn of [backend, dispatcher, worker]) table.grantReadWriteData(fn);
    generated.grantRead(backend, 'owners/*');
    generated.grantPut(worker, 'owners/*');
    acknowledge(backend.role, 'AwsSolutions-IAM5[Action::s3:GetObject*]', 'CDK private object reads include object-version read actions; resources are confined to the owners prefix.');
    acknowledge(backend.role, 'AwsSolutions-IAM5[Resource::<GeneratedAssets5E416C5B.Arn>/owners/*]', 'Object keys are generated per owner/job/revision within this private prefix.');
    acknowledge(backend.role, 'AwsSolutions-IAM5[Action::s3:GetBucket*]', 'CDK private read grant includes bucket metadata operations scoped to this generated-assets bucket.');
    acknowledge(backend.role, 'AwsSolutions-IAM5[Action::s3:List*]', 'CDK private read grant includes listing; this role is backend-only and confined to this bucket and prefix.');
    acknowledge(worker.role, 'AwsSolutions-IAM5[Action::s3:Abort*]', 'CDK object-write grant includes aborting incomplete uploads; confined to private generated owner objects.');
    acknowledge(worker.role, 'AwsSolutions-IAM5[Resource::<GeneratedAssets5E416C5B.Arn>/owners/*]', 'Worker writes only validated generated files under the private owners prefix.');
    const pool = new cognito.UserPool(this, 'OwnerPool', { selfSignUpEnabled: false, signInAliases: { email: true }, mfa: cognito.Mfa.REQUIRED, mfaSecondFactor: { sms: false, otp: true }, passwordPolicy: { minLength: 14, requireDigits: true, requireLowercase: true, requireUppercase: true, requireSymbols: true }, removalPolicy: RemovalPolicy.RETAIN });
    const resourceServer = pool.addResourceServer('ApiScope', { identifier: 'techcanvas', scopes: [new cognito.ResourceServerScope({ scopeName: 'access', scopeDescription: 'Access the owner API' })] });
    // Opt-in callback additions reuse the existing MFA-required pool and client.
    const commonOrigins = [...new Set([this.node.tryGetContext('commonAppOrigin'),this.node.tryGetContext('commonAppPreviewOrigin')].filter(Boolean))];
    for (const value of commonOrigins) {
      const url = new URL(value);
      if(url.protocol!=='https:' || url.username || url.password || url.port || url.pathname!=='/' || url.search || url.hash || url.origin!==value)throw new Error('commonAppOrigin must be an exact HTTPS origin without a trailing slash.');
    }
    const client = pool.addClient('BrowserClient', { generateSecret: false, preventUserExistenceErrors: true, enableTokenRevocation: true, oAuth: { flows: { authorizationCodeGrant: true }, scopes: [cognito.OAuthScope.OPENID, ...(commonOrigins.length ? [cognito.OAuthScope.EMAIL] : []), cognito.OAuthScope.resourceServer(resourceServer, new cognito.ResourceServerScope({ scopeName: 'access', scopeDescription: 'Access the owner API' }))], callbackUrls: [...(legacyDisabled ? [] : [frontendUrl]), ...commonOrigins.map(value=>value+'/api/auth/callback')], logoutUrls: [...(legacyDisabled ? [] : [frontendUrl]), ...commonOrigins.map(value=>value+'/')] } });
    const domain = pool.addDomain('HostedLogin', { cognitoDomain: { domainPrefix: `techcanvas-${this.account}-sydney` } });
    const http = new api.CfnApi(this, 'HttpApi', { name: 'TechCanvasOwnerApi', protocolType: 'HTTP', disableExecuteApiEndpoint: legacyDisabled, corsConfiguration: { allowOrigins: [legacyDisabled ? commonOrigin : frontendUrl], allowMethods: ['GET','POST'], allowHeaders: ['Authorization','Content-Type','Idempotency-Key'], maxAge: 300 } });
    const integration = new api.CfnIntegration(this, 'Integration', { apiId: http.ref, integrationType: 'AWS_PROXY', integrationUri: backend.functionArn, payloadFormatVersion: '2.0', timeoutInMillis: 29000 });
    const authorizer = new api.CfnAuthorizer(this, 'OwnerJwt', { apiId: http.ref, authorizerType: 'JWT', identitySource: ['$request.header.Authorization'], name: 'OwnerJwt', jwtConfiguration: { issuer: pool.userPoolProviderUrl, audience: [client.userPoolClientId] } });
    for (const [i, route] of ['GET /api/jobs', 'GET /api/jobs/{id}', 'POST /api/jobs', 'GET /api/jobs/{id}/assets/{name}', 'POST /api/jobs/{id}/retry', 'GET /api/config'].entries()) new api.CfnRoute(this, `Route${i}`, { apiId: http.ref, routeKey: route, target: `integrations/${integration.ref}`, authorizationType: 'JWT', authorizerId: authorizer.ref, authorizationScopes: ['techcanvas/access'] });
    const accessLogs = new logs.LogGroup(this, 'ApiAccessLogs', { retention: logs.RetentionDays.ONE_WEEK, removalPolicy: RemovalPolicy.DESTROY });
    new api.CfnStage(this, 'ApiStage', { apiId: http.ref, stageName: '$default', autoDeploy: true, defaultRouteSettings: { throttlingBurstLimit: 4, throttlingRateLimit: 2 }, accessLogSettings: { destinationArn: accessLogs.logGroupArn, format: JSON.stringify({ requestId: '$context.requestId', status: '$context.status', routeKey: '$context.routeKey' }) } });
    backend.addPermission('ApiInvoke', { principal: new iam.ServicePrincipal('apigateway.amazonaws.com'), sourceArn: this.formatArn({ service: 'execute-api', resource: http.ref, resourceName: '*/api/*' }), sourceAccount: this.account });
    acknowledge(distribution, 'AwsSolutions-CFR1', 'Public static frontend is accessible globally; sensitive API routes require owner authentication.');
    acknowledge(distribution, 'AwsSolutions-CFR2', 'Selected AWS experience prohibits CloudFront WAF association. No API origin is exposed through CloudFront.');
    acknowledge(distribution, 'AwsSolutions-CFR4', 'Default CloudFront hostname certificate has a fixed TLSv1 minimum. Custom-domain certificate would require out-of-region ACM; this limitation must be reviewed before launch.');
    acknowledge(streamDead, 'AwsSolutions-SQS3', 'This is the terminal DynamoDB stream delivery dead-letter destination, not an application source queue.');
    acknowledge(dispatcher.role, 'AwsSolutions-IAM5[Resource::*]', 'CDK DynamoDB event source grants dynamodb:ListStreams, whose discovery call requires wildcard resource. Other stream permissions are scoped.');
    acknowledge(pool, 'AwsSolutions-COG8', 'Plus tier advanced security is not enabled without paid-service approval; owner-only registration and required TOTP protect this foundation.');
    new CfnOutput(this, 'FrontendBucketName', { value: site.bucketName });
    new CfnOutput(this, 'AssetsBucketName', { value: generated.bucketName });
    new CfnOutput(this, 'TableName', { value: table.tableName });
    new CfnOutput(this, 'FrontendUrl', { value: frontendUrl });
    new CfnOutput(this, 'ApiUrl', { value: http.attrApiEndpoint });
    new CfnOutput(this, 'UserPoolId', { value: pool.userPoolId });
    new CfnOutput(this, 'ClientId', { value: client.userPoolClientId });
    new CfnOutput(this, 'LoginDomain', { value: domain.baseUrl() });
  }
}
