# TypeScript Serverless Backend with PostgreSQL

A modern backend application built with TypeScript, Serverless Framework, and PostgreSQL, containerized with Docker for easy development and deployment.

## Tech Stack

- **Runtime**: Node.js 18.x
- **Language**: TypeScript
- **Framework**: Serverless Framework v4
- **Database**: PostgreSQL 15
- **ORM**: TypeORM
- **Container**: Docker & Docker Compose
- **API**: AWS Lambda & API Gateway (local development with serverless-offline)

## Prerequisites

- Node.js 18.x or later
- Docker and Docker Compose
- npm or yarn package manager

## Project Structure

```
├── src/
│   ├── entities/        # TypeORM entities
│   │   └── Message.ts
│   ├── utils/          # Utility functions
│   │   └── db.ts       # Database configuration
│   └── handler.ts      # Lambda function handlers
├── serverless.yml      # Serverless Framework configuration
├── tsconfig.json       # TypeScript configuration
├── package.json        # Project dependencies and scripts
├── Dockerfile         # Application container definition
└── docker-compose.yml # Multi-container Docker configuration
```

## Getting Started

1. **Clone the repository**

```bash
git clone <repository-url>
cd <project-directory>
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the application**

There are several ways to start the application:

- **Full Development Environment (with Docker)**
```bash
npm run dev
```

- **Fresh Start (clean database)**
```bash
npm run start:fresh
```

- **Local Development**
```bash
npm run start:local
```

## Available Scripts

- **Development Commands**
  - `npm run dev` - Start all services using Docker Compose
  - `npm run dev:build` - Rebuild and start all services
  - `npm run dev:clean` - Stop all services and remove volumes

- **Database Commands**
  - `npm run db:up` - Start PostgreSQL database in background
  - `npm run db:down` - Stop PostgreSQL database
  - `npm run db:clean` - Stop database and remove its volume

- **Build Commands**
  - `npm run build` - Compile TypeScript code
  - `npm run watch` - Watch for TypeScript changes and recompile

- **Application Commands**
  - `npm run start` - Start the Serverless offline server
  - `npm run start:local` - Start fresh database and application
  - `npm run start:fresh` - Clean start with rebuilt containers

## API Endpoints

### Hello World Endpoint
- **GET** `/hello`
- Returns a greeting message and demonstrates database connectivity
- Response includes:
  - Welcome message
  - Last inserted database record
  - Recent messages from the database

## Environment Variables

The application uses the following environment variables (configured in serverless.yml and docker-compose.yml):

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=myapp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

## Development Workflow

1. **Local Development with Hot Reload**
   ```bash
   # Terminal 1 - TypeScript compilation in watch mode
   npm run watch

   # Terminal 2 - Run the application
   npm run start:local
   ```

2. **Working with Database**
   - The database automatically initializes on first run
   - TypeORM's synchronize option is enabled for development
   - Data persists between runs unless cleaned

3. **Clean Start**
   - Use `npm run start:fresh` when you need a clean database
   - This removes all data and rebuilds containers

## Docker Configuration

- Application runs in development mode inside Docker
- PostgreSQL runs in a separate container
- Volumes persist database data
- Health checks ensure database availability
- Hot-reload enabled for local development

## Troubleshooting

1. **Database Connection Issues**
   - Ensure PostgreSQL container is running: `docker compose ps`
   - Check logs: `docker compose logs postgres`
   - Try cleaning database: `npm run db:clean`

2. **Application Errors**
   - Check TypeScript compilation: `npm run build`
   - Verify environment variables
   - Check application logs: `docker compose logs app`

## Production Considerations

Before deploying to production:

1. Disable TypeORM synchronize option
2. Set up proper database migrations
3. Configure secure database credentials
4. Review and adjust resource allocations
5. Set up proper AWS credentials and configurations 