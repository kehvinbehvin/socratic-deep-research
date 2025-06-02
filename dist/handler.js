"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMessage = exports.testQueue = exports.hello = void 0;
const db_1 = require("./utils/db");
const Message_1 = require("./entities/Message");
const queue_1 = require("./utils/queue");
const hello = async (event) => {
    try {
        const dataSource = await (0, db_1.initializeDatabase)();
        const messageRepository = dataSource.getRepository(Message_1.Message);
        // Create a new message
        const newMessage = messageRepository.create({
            message: 'Hello from TypeORM!'
        });
        await messageRepository.save(newMessage);
        // Send message to queue
        await (0, queue_1.sendMessage)({
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
    }
    catch (error) {
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
exports.hello = hello;
const testQueue = async (event) => {
    try {
        const dataSource = await (0, db_1.initializeDatabase)();
        const messageRepository = dataSource.getRepository(Message_1.Message);
        // Parse the message from request body
        const body = event.body ? JSON.parse(event.body) : { message: 'Test message' };
        // Create a new message
        const newMessage = messageRepository.create({
            message: body.message
        });
        await messageRepository.save(newMessage);
        console.log('Created message:', newMessage);
        // Send to queue
        await (0, queue_1.sendMessage)({
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
    }
    catch (error) {
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
exports.testQueue = testQueue;
const processMessage = async (event) => {
    try {
        const dataSource = await (0, db_1.initializeDatabase)();
        const messageRepository = dataSource.getRepository(Message_1.Message);
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
    }
    catch (error) {
        console.error('Error processing message:', error);
        throw error; // Rethrowing will cause the message to be retried
    }
};
exports.processMessage = processMessage;
