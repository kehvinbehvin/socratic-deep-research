import { APIGatewayProxyHandler, SQSHandler } from 'aws-lambda';
import { initializeDatabase } from './utils/db';
import { Message } from './entities/Message';
import { sendMessage } from './utils/queue';

export const hello: APIGatewayProxyHandler = async (event) => {
  try {
    const dataSource = await initializeDatabase();
    const messageRepository = dataSource.getRepository(Message);

    // Create a new message
    const newMessage = messageRepository.create({
      message: 'Hello from TypeORM!'
    });
    await messageRepository.save(newMessage);

    // Send message to queue
    await sendMessage({
      type: 'message_created',
      data: newMessage
    });

    // Get recent messages
    const recentMessages = await messageRepository.find({
      order: {
        createdAt: 'DESC'
      },
      take: 5
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Hello from Serverless with TypeScript and TypeORM!",
        lastInserted: newMessage,
        recentMessages: recentMessages
      })
    };
  } catch (error) {
    console.error('Error in hello handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

export const testQueue: APIGatewayProxyHandler = async (event) => {
  try {
    const dataSource = await initializeDatabase();
    const messageRepository = dataSource.getRepository(Message);

    // Parse the message from request body
    const body = event.body ? JSON.parse(event.body) : { message: 'Test message' };

    // Create a new message
    const newMessage = messageRepository.create({
      message: body.message
    });
    await messageRepository.save(newMessage);
    console.log('Created message:', newMessage);

    // Send to queue
    await sendMessage({
      type: 'message_created',
      data: newMessage
    });
    console.log('Message sent to queue');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Test flow completed successfully',
        originalMessage: newMessage,
        note: 'Check pgAdmin to see the message, it will be updated once processed by the queue'
      })
    };
  } catch (error) {
    console.error('Error in test handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

export const processMessage: SQSHandler = async (event) => {
  try {
    const dataSource = await initializeDatabase();
    const messageRepository = dataSource.getRepository(Message);

    for (const record of event.Records) {
      const body = JSON.parse(record.body);
      console.log('Processing message:', body);

      if (body.type === 'message_created') {
        // Example: Update the message to mark it as processed
        const message = await messageRepository.findOne({ where: { id: body.data.id } });
        if (message) {
          message.message = `${message.message} (Processed at ${new Date().toISOString()})`;
          await messageRepository.save(message);
          console.log('Message processed successfully:', message.id);
        }
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
    throw error; // Rethrowing will cause the message to be retried
  }
}; 