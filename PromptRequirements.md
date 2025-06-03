Ok for the next phase i need you to create the application code. 

It is a socratic learning AI system. 

Socratic learning flow.
Topic -> Question -> Reflection -> Clarification -> QueryPreparation -> Search -> Crawl -> Review -> Complete

Eventually we will integrate ai into it. but now i want to setup the queues and ensure messages are passed successfully.

I want a queue and handler for each stage.

StudyHandler pushes a topic from the api payload into the topic queue

TopicHandler handler will pull a topic off the topic queue, use an llm and break it down into socratic questions. All of this info is stored into a DTO and passed into the questions queue. 

QuestionHandler handler will pull a Question DTO from the question queue, use an llm and RAG and try to answer those questions. It will append its answers/reflectiosn to the existing data and push it as a new DTO into the Reflection queue.

ReflectionHandler handler will pull a Reflection DTO off the reflection queue, use an llm to try identify gaps, assumptions, overgeneralisation, simplification or a new concept/topic. It will append its insights to the existing data and push it as a new DTO into the Clarifications queue.

ClarificationHandler will pull a Clarification DTO off the Clairification queue and prepare smart google search queries and append these queries to the DTO and push them into the query queue.

QueryPreparationHandler will pull a query of the queue and use serp ai to get the top k results. We will take those top k results, append it to the DTO and push it into the searchResultsQueue

SearchHandler will pull a result of the searchResultsQueue and use firecrawl to crawl the website. We will store the data as a file in s3. Append the links to the files in the DTO and push it into the crawlResultsQueue.

CrawlHandler will pull a crawl result from the crawlResultsQueue and use an LLM to Review the reliability of the source of the information and append the data to the results.

ReviewHandler will split up the data into chunks and score each chunk on its relevance to answering the topic/reflection/clairication. It will then store those chunks into a vector database.

CompletedHandler will pull a review from the reviewQueue and set the study to completed. Then it will run any cleanup or side
effects

Once completed handlers ends with success, the process ends.
At anytime, the process can fail.

I also intend to have a table for each stage. Only after each stage completes its application logic, we will create a record of its results in the database and set up fk to its related steps. 

Walk me through your approach before starting