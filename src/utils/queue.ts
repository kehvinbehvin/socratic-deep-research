import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({
  endpoint: process.env.QUEUE_ENDPOINT,
  region: process.env.QUEUE_REGION || 'elasticmq',
  credentials: {
    accessKeyId: process.env.QUEUE_ACCESS_KEY_ID || 'x',
    secretAccessKey: process.env.QUEUE_SECRET_ACCESS_KEY || 'x'
  }
});

export const queueUrl = `${process.env.QUEUE_ENDPOINT}/queue/message-queue`;

export const sendMessage = async (message: any) => {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
  });

  try {
    const response = await sqsClient.send(command);
    console.log('Message sent successfully:', response.MessageId);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const receiveMessages = async (maxMessages: number = 1) => {
  const command = new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: 20, // Long polling
  });

  try {
    const response = await sqsClient.send(command);
    return response.Messages || [];
  } catch (error) {
    console.error('Error receiving messages:', error);
    throw error;
  }
};

export const deleteMessage = async (receiptHandle: string) => {
  const command = new DeleteMessageCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  });

  try {
    await sqsClient.send(command);
    console.log('Message deleted successfully');
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};