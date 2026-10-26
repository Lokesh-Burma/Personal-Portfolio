import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assetNames } from './content.mjs';
const type = name => name.endsWith('.png') ? 'image/png' : name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8';
const objectKey = (owner,id,revision,name) => `owners/${owner}/jobs/${id}/${revision}/${name}`;
export function privateAssets(bucket, client = new S3Client({ region: 'ap-southeast-2', maxAttempts: 1 })) {
  return {
    async put(owner,id,revision,files) {
      await Promise.all(Object.entries(files).map(async ([name,body]) => {
        if (!assetNames.has(name)) throw new Error('Unknown asset');
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey(owner,id,revision,name), Body: body, ContentType: type(name), CacheControl: 'private, no-store', ServerSideEncryption: 'AES256' }), { abortSignal: AbortSignal.timeout(5000) });
      }));
    },
    async urls(owner,job) {
      if (job.status !== 'completed') return {};
      const urls = {};
      for (const name of [...assetNames,...(job.imageStatus==='completed' ? ['illustration.png'] : [])]) urls[name] = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: objectKey(owner,job.id,job.assetRevision,name), ResponseContentType: type(name), ResponseCacheControl: 'private, no-store' }), { expiresIn: 300 });
      return urls;
    }
  };
}
