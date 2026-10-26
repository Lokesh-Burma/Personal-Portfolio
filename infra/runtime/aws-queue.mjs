import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
export function generationQueue(url, client = new SQSClient({ region: 'ap-southeast-2', maxAttempts: 1 })) {
  return { async send(message, deduplicationId) {
    await client.send(new SendMessageCommand({ QueueUrl: url, MessageBody: JSON.stringify(message), MessageGroupId: 'owner', MessageDeduplicationId: deduplicationId }), { abortSignal: AbortSignal.timeout(5000) });
  } };
}
