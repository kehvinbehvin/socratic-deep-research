"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hello = void 0;
const db_1 = require("./utils/db");
const Message_1 = require("./entities/Message");
const hello = async (event) => {
    try {
        const dataSource = await (0, db_1.initializeDatabase)();
        const messageRepository = dataSource.getRepository(Message_1.Message);
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
