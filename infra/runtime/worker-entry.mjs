import { Repository } from './repository.mjs';
import { createService } from './service.mjs';
import { privateAssets } from './aws-assets.mjs';
import { bedrockProvider } from './aws-provider.mjs';
import { workerHandler } from './handlers.mjs';
const enabled = process.env.CLOUD_BACKEND_READY === 'true' && process.env.BEDROCK_USAGE_APPROVED === 'true';
const service = createService({ repo: new Repository({ table: process.env.TABLE_NAME }), assets: privateAssets(process.env.ASSETS_BUCKET), provider: bedrockProvider(), enabled });
export const handler = workerHandler({ service, owner: process.env.OWNER_SUBJECT, enabled });
