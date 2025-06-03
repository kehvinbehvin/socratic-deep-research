import { SQS } from 'aws-sdk';
import { QueueName, QUEUE_CONFIGS } from '../config/queues';

export class QueueService {
  private sqs: SQS;
  private queueUrls: Map<QueueName, string>;

  constructor() {
    this.sqs = new SQS({
      endpoint: process.env.SQS_ENDPOINT || 'http://localhost:9324',
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
      }
    });
    this.queueUrls = new Map();
  }

  async initialize(): Promise<void> {
    for (const queueName of Object.values(QUEUE_CONFIGS)) {
      const queueUrl = await this.getOrCreateQueue(queueName.name);
      this.queueUrls.set(queueName.name, queueUrl);
    }
  }

  private async getOrCreateQueue(queueName: QueueName): Promise<string> {
    try {
      const { QueueUrl } = await this.sqs.getQueueUrl({ QueueName: queueName }).promise();
      return QueueUrl!;
    } catch (error) {
      const { QueueUrl } = await this.sqs.createQueue({
        QueueName: queueName,
        Attributes: {
          VisibilityTimeout: QUEUE_CONFIGS[queueName].visibilityTimeout.toString(),
          MessageRetentionPeriod: '1209600', // 14 days
          ReceiveMessageWaitTimeSeconds: '20' // Enable long polling
        }
      }).promise();
      return QueueUrl!;
    }
  }

  async sendMessage<T>(queueName: QueueName, message: T): Promise<string> {
    const queueUrl = this.queueUrls.get(queueName);
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    const { MessageId } = await this.sqs.sendMessage({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message)
    }).promise();

    return MessageId!;
  }

  async receiveMessages<T>(queueName: QueueName, maxMessages: number = 1): Promise<Array<{
    id: string;
    body: T;
    receiptHandle: string;
  }>> {
    const queueUrl = this.queueUrls.get(queueName);
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    const { Messages } = await this.sqs.receiveMessage({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 20 // Enable long polling
    }).promise();

    if (!Messages) {
      return [];
    }

    return Messages.map(message => ({
      id: message.MessageId!,
      body: JSON.parse(message.Body!) as T,
      receiptHandle: message.ReceiptHandle!
    }));
  }

  async deleteMessage(queueName: QueueName, receiptHandle: string): Promise<void> {
    const queueUrl = this.queueUrls.get(queueName);
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    await this.sqs.deleteMessage({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    }).promise();
  }

  async changeMessageVisibility(
    queueName: QueueName,
    receiptHandle: string,
    visibilityTimeout: number
  ): Promise<void> {
    const queueUrl = this.queueUrls.get(queueName);
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    await this.sqs.changeMessageVisibility({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: visibilityTimeout
    }).promise();
  }
} 