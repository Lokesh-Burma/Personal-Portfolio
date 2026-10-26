import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Repository } from './repository.mjs';
import { createService } from './service.mjs';
import { generationQueue } from './aws-queue.mjs';
import { dispatcherHandler } from './handlers.mjs';
const service = createService({ repo: new Repository({ table: process.env.TABLE_NAME }), queue: generationQueue(process.env.QUEUE_URL) });
export const handler = dispatcherHandler({ service, owner: process.env.OWNER_SUBJECT, enabled: process.env.CLOUD_BACKEND_READY === 'true' && process.env.BEDROCK_USAGE_APPROVED === 'true', decode: unmarshall });
