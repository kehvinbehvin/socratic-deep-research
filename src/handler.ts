import { APIGatewayProxyHandler } from 'aws-lambda';
import { initializeDatabase } from './utils/db';
import { Message } from './entities/Message';

export const hello: APIGatewayProxyHandler = async (event) => {
  try {
    const dataSource = await initializeDatabase();
    const messageRepository = dataSource.getRepository(Message);

    // Create a new message
    const newMessage = messageRepository.create({
      message: 'Hello from TypeORM!'
    });
    await messageRepository.save(newMessage);

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