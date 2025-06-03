import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, GetQueueUrlCommand, CreateQueueCommand, ChangeMessageVisibilityCommand } from '@aws-sdk/client-sqs';
import { QueueName, QUEUE_CONFIGS } from '../config/queues';

export class QueueService {
  private sqs: SQSClient;
  private queueUrls: Map<QueueName, string>;

  constructor(
    endpoint?: string,
    region?: string,
    accessKeyId?: string,
    secretAccessKey?: string
  ) {
    this.sqs = new SQSClient({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKeyId || 'root',
        secretAccessKey: secretAccessKey || 'root'
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
      const command = new GetQueueUrlCommand({ QueueName: queueName });
      const { QueueUrl } = await this.sqs.send(command);
      return QueueUrl!;
    } catch (error) {
      const command = new CreateQueueCommand({
        QueueName: queueName,
        Attributes: {
          VisibilityTimeout: QUEUE_CONFIGS[queueName].visibilityTimeout.toString(),
          MessageRetentionPeriod: '1209600', // 14 days
          ReceiveMessageWaitTimeSeconds: '20' // Enable long polling
        }
      });
      const { QueueUrl } = await this.sqs.send(command);
      return QueueUrl!;
    }
  }

  async sendMessage<T>(queueName: QueueName, message: T): Promise<string> {
    const queueUrl = this.queueUrls.get(queueName);
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message)
    });

    const { MessageId } = await this.sqs.send(command);
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

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 20 // Enable long polling
    });

    const { Messages } = await this.sqs.send(command);

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

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    });

    await this.sqs.send(command);
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

    const command = new ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: visibilityTimeout
    });

    await this.sqs.send(command);
  }
} 