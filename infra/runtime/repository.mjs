import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
export class Conflict extends Error {}
// Every write compares the revision read by this operation. Conditions outlive TTL.
export class Repository {
  constructor({ table, client, namespace = '' }) {
    this.table = table; this.namespace = namespace;
    this.client = client || DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-southeast-2', maxAttempts: 1 }), { marshallOptions: { removeUndefinedValues: true } });
  }
  key(pk, sk) { return { pk: this.namespace + pk, sk }; }
  async get(pk, sk) {
    return (await this.client.send(new GetCommand({ TableName: this.table, Key: this.key(pk, sk), ConsistentRead: true }))).Item;
  }
  async query(pk, prefix, cursor, limit = 25) {
    return this.client.send(new QueryCommand({ TableName: this.table, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': this.namespace + pk, ':prefix': prefix }, ConsistentRead: true, ScanIndexForward: false, Limit: limit,
      ...(cursor ? { ExclusiveStartKey: this.key(pk, cursor) } : {}) }));
  }
  async commit(changes) {
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: changes.map(({ pk, sk, before, value }) => ({ Put: {
        TableName: this.table, Item: { ...value, ...this.key(pk, sk), rev: (before?.rev || 0) + 1 },
        ConditionExpression: before ? '#revision = :previous' : 'attribute_not_exists(pk)',
        ...(before ? { ExpressionAttributeNames: { '#revision': 'rev' }, ExpressionAttributeValues: { ':previous': before.rev } } : {})
      } })) }));
    } catch (e) {
      // Transaction conflicts are safe to retry from a fresh consistent read, not blindly.
      if (e.name === 'TransactionCanceledException' && e.CancellationReasons?.some(r => ['ConditionalCheckFailed','TransactionConflict'].includes(r.Code))) throw new Conflict();
      throw e;
    }
  }
}
