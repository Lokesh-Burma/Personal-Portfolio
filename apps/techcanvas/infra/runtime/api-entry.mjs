import { Repository } from './repository.mjs';
import { createService } from './service.mjs';
import { privateAssets } from './aws-assets.mjs';
import { apiHandler } from './handlers.mjs';
const assets = privateAssets(process.env.ASSETS_BUCKET);
const service = createService({ repo: new Repository({ table: process.env.TABLE_NAME }) });
export const handler = apiHandler({ service, assets, owner: process.env.OWNER_SUBJECT, backendReady: process.env.CLOUD_BACKEND_READY === 'true', inferenceEnabled: process.env.BEDROCK_USAGE_APPROVED === 'true' });
