# Socratic Learning Platform

A modern learning platform that uses AI-driven Socratic questioning to deepen understanding and facilitate learning through structured dialogue.

## Demo
![Start](./assets/Start.png "Start")
![Questions](./assets/Questions.png "Questions")
![Reflecting](./assets/Reflecting.png "Reflecting")
![Clarifications](./assets/Clarifications.png "Clarifications")
![Metrics](./assets/Metrics.png "Metrics")

## Tech Stack

- **Runtime**: Node.js 18.x
- **Language**: TypeScript
- **Framework**: Serverless Framework v4
- **Database**: PostgreSQL 15
- **ORM**: TypeORM
- **AI**: LangChain with OpenAI
- **Search**: SerpApi for web search
- **Web Interface**: Express with EJS templates
- **Queue**: ElasticMQ (SQS compatible)
- **Monitoring**: Custom metrics dashboard
- **Type Safety**: Zod schemas
- **Storage**: AWS S3 for search results

## Project Structure

```
├── src/
│   ├── entities/        # TypeORM entities
│   │   ├── Topic.ts
│   │   ├── Question.ts
│   │   ├── Reflection.ts
│   │   ├── Clarification.ts
│   │   ├── QueryPreparation.ts
│   │   ├── SearchResult.ts
│   │   └── CrawlRequest.ts
│   ├── handlers/       # Queue handlers
│   │   ├── TopicHandler.ts
│   │   ├── QuestionHandler.ts
│   │   ├── ReflectionHandler.ts
│   │   ├── ClarificationHandler.ts
│   │   ├── QueryPreparationHandler.ts
│   │   └── SearchHandler.ts
│   ├── services/       # Core services
│   │   ├── OpenAIService.ts
│   │   ├── QueueService.ts
│   │   ├── LoggerService.ts
│   │   ├── MonitoringService.ts
│   │   ├── SerpApiService.ts
│   │   └── FireCrawlService.ts
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

### Web Search & Content Analysis
- Intelligent web search using SerpApi
- Content crawling and analysis
- S3 storage for search results
- Webhook integration for async processing

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
6. **Search**: Web content discovery
7. **Crawl**: Deep content analysis

### Type Safety
- Zod schemas for AI responses
- TypeScript throughout
- Runtime validation
- Structured data flow

## Evaluation Framework

The platform includes a custom automated evaluation framework for Socratic question generation using OpenAI Evals. This framework ensures reproducible, version-controlled evaluations of AI-generated questions.

### Directory Structure

The evaluation system is located in the `/evals` directory:

```
├── evals/
│   ├── evaluations.json       # Defines evaluations (criteria, schema, test data, prompts)
│   ├── evaluation_hashes.json # Tracks changes to evaluation components
│   ├── evaluations_metadata.json # Stores metadata (UUIDs, file IDs, run IDs)
│   ├── index.ts               # Entry point
│   ├── MetaDataConfigManager.ts # Manages evaluation metadata and hashes
│   ├── EvaluationManager.ts   # Handles evaluation creation and runs
│   ├── evaluator.ts           # Runs evaluations
│   ├── EvaluationSyncer.ts    # Syncs changes and triggers updates
│   ├── JSONFileStorage.ts     # Manages file storage
│   ├── EvaluationSystem.ts    # Orchestrates the evaluation process
│   └── EvaluationLogger.ts    # Logs evaluation events
```

### How It Works

1. **Define Evaluations:**  
   Edit `evaluations.json` to define your evaluation criteria, schema, test data, and prompts.

2. **Track Changes:**  
   The framework hashes each component (criteria, test data, schema, prompts) and tracks changes in `evaluation_hashes.json`.

3. **Upload Test Data:**  
   Test data is converted to JSONL and uploaded to OpenAI as a file. The file ID is stored in `evaluations_metadata.json`.

4. **Create/Update Evaluations:**  
   The framework calls the OpenAI Evals API to create or update evaluations based on changes detected.

5. **Run Evaluations:**  
   Evaluation runs are triggered, and results are tracked in `evaluations_metadata.json`.

6. **Version Control:**  
   All UUIDs, file IDs, and hashes are versioned for reproducibility. Do use DVC for large files.

### How to Set Up

#### Prerequisites

- Node.js 18.x or 20.x (required for file uploads)
- OpenAI API key

#### Environment Variables

Add the following to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key
```

#### Initial Setup

1. **Define Evaluations:**  
   Edit `evals/evaluations.json` to define your evaluations. Example:

   ```json
   {
     "question_generation": {
       "criteria": [...],
       "schema": {...},
       "testData": [...],
       "targetPrompt": {...}
     }
   }
   ```

2. **Run the Evaluation System:**  
   Execute the following command to sync and run evaluations:

   ```bash
   npx ts-node ./evals/index.ts
   ```

3. **Monitor Results:**  
   Check `evaluations_metadata.json` for evaluation results and logs.

#### Version Control

- DVC as an option 
- Commit `evaluations.json`, `evaluation_hashes.json`, and `evaluations_metadata.json` to version control.

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
# API Keys
OPENAI_API_KEY=your_openai_api_key
SERP_API_KEY=your_serpapi_key
FIRECRAWL_API_KEY=your_firecrawl_key

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=myapp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# AWS Configuration
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name

# Queue Configuration
QUEUE_ENDPOINT=http://localhost:9324
QUEUE_REGION=elasticmq
QUEUE_ACCESS_KEY_ID=root
QUEUE_SECRET_ACCESS_KEY=root

# Webhook Configuration
FC_WEBHOOK=your_webhook_url
```

3. **Start Services**
```bash
# Start core services
npm run dev

# Expose webhook endpoint (in a separate terminal)
npm run expose:webhook
```

4. **Run Evaluations**
```bash
npx ts-node ./evals/index.ts
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

- **Webhook Development**
  - `npm run expose:webhook` - Expose local webhook endpoint via ngrok

## Webhook Setup

The platform uses webhooks for asynchronous processing of crawled content. To set up webhooks:

1. Start your local server:
```bash
npm run dev
```

2. In a separate terminal, expose your webhook endpoint:
```bash
npm run expose:webhook
```

3. Use the generated ngrok URL as your webhook endpoint in the SerpApi dashboard

The webhook endpoint will receive crawl results and process them automatically.

## Monitoring

The platform includes a web-based monitoring dashboard at `/metrics` showing:
- Queue depths and processing rates
- Error rates and types
- Processing times
- Learning progress metrics
- Search and crawl statistics

## Production Deployment

Before deploying:
1. Configure proper AWS credentials
2. Set up production database
3. Configure API keys (OpenAI, SerpApi, FireCrawl)
4. Review resource allocations
5. Set up monitoring alerts
6. Configure production webhook endpoints

## WIP
1. Setting up evaluations all system prompts

## Setting up evaluations with OpenAI
1. Templatise all prompts to OpenAI
2. Create schemas for test data set
3. Choose testing criteria for each eval
4. Send request to evals API to create eval
5. Save returned uuid for created Eval
6. Create test data set as a JSON file according to defined schema
7. Upload files via files API
8. Save returned uuid for uploaded files
9. Use File uuid and Eval uuid to create an Eval Run via the evals api
10. Save returned uuid for eval run
11. View results on OPENAI
12. Use a metadata file to save all the uuids.
13. Version Control metadata file
14. Use DVC to store test data set (Do not commit test data to git)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC License 