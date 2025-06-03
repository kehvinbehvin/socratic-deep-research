# Socratic Learning Platform

A modern learning platform that uses AI-driven Socratic questioning to deepen understanding and facilitate learning through structured dialogue.

## Tech Stack

- **Runtime**: Node.js 18.x
- **Language**: TypeScript
- **Framework**: Serverless Framework v4
- **Database**: PostgreSQL 15
- **ORM**: TypeORM
- **AI**: LangChain with OpenAI
- **Web Interface**: Express with EJS templates
- **Queue**: ElasticMQ (SQS compatible)
- **Monitoring**: Custom metrics dashboard
- **Type Safety**: Zod schemas

## Project Structure

```
├── src/
│   ├── entities/        # TypeORM entities
│   │   ├── Topic.ts
│   │   ├── Question.ts
│   │   ├── Reflection.ts
│   │   ├── Clarification.ts
│   │   ├── QueryPreparation.ts
│   │   └── SearchResult.ts
│   ├── handlers/       # Queue handlers
│   │   ├── TopicHandler.ts
│   │   ├── QuestionHandler.ts
│   │   ├── ReflectionHandler.ts
│   │   ├── ClarificationHandler.ts
│   │   └── QueryPreparationHandler.ts
│   ├── services/       # Core services
│   │   ├── OpenAIService.ts
│   │   ├── QueueService.ts
│   │   ├── LoggerService.ts
│   │   └── MonitoringService.ts
│   ├── web/           # Web interface
│   │   ├── routes/
│   │   ├── views/
│   │   └── public/
│   ├── config/        # Configuration
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── queue-config/      # Queue configuration
├── serverless.yml     # Serverless config
└── docker-compose.yml # Docker services
```

## Features

### AI-Driven Learning
- Structured Socratic questioning using OpenAI
- Type-safe AI responses with Zod schemas
- Progressive learning paths
- Automated follow-up questions

### Web Interface
- Real-time metrics dashboard
- Queue monitoring
- Learning progress visualization
- Interactive learning sessions

### Processing Pipeline
1. **Topic Creation**: Initial learning topics
2. **Question Generation**: AI-driven Socratic questions
3. **Reflection Analysis**: Understanding assessment
4. **Clarification**: Targeted follow-up questions
5. **Query Preparation**: Research guidance

### Type Safety
- Zod schemas for AI responses
- TypeScript throughout
- Runtime validation
- Structured data flow

## Getting Started

1. **Clone and Install**
```bash
git clone <repository-url>
cd <project-directory>
npm install
```

2. **Environment Setup**
Create a `.env` file:
```env
OPENAI_API_KEY=your_api_key
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=myapp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

3. **Start Services**
```bash
npm run dev
```

## Development Scripts

- **Core Commands**
  - `npm run dev` - Start all services
  - `npm run build` - Build TypeScript
  - `npm run start` - Start Serverless offline

- **Service Management**
  - `npm run services:up` - Start Docker services
  - `npm run services:down` - Stop services
  - `npm run services:clean` - Clean volumes

## Monitoring

The platform includes a web-based monitoring dashboard at `/metrics` showing:
- Queue depths and processing rates
- Error rates and types
- Processing times
- Learning progress metrics

## Production Deployment

Before deploying:
1. Configure proper AWS credentials
2. Set up production database
3. Configure OpenAI API keys
4. Review resource allocations
5. Set up monitoring alerts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC License 