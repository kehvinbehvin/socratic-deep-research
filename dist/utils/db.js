"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const Message_1 = require("../entities/Message");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: true, // Be careful with this in production
    logging: true,
    entities: [Message_1.Message],
    subscribers: [],
    migrations: [],
    connectTimeoutMS: 10000
});
let initialized = false;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const initializeDatabase = async () => {
    if (!initialized) {
        let retries = 5;
        while (retries > 0) {
            try {
                await exports.AppDataSource.initialize();
                console.log('Database connection initialized successfully');
                initialized = true;
                break;
            }
            catch (error) {
                console.error(`Failed to initialize database connection. Retries left: ${retries}`, error);
                retries--;
                if (retries === 0) {
                    throw error;
                }
                await sleep(3000); // Wait 3 seconds before retrying
            }
        }
    }
    return exports.AppDataSource;
};
exports.initializeDatabase = initializeDatabase;
