import { z } from "zod";

// Schema for API requests
export const StudyRequestSchema = z.object({
  content: z.string().min(1, 'Topic content is required')
});

export type StudyInput = z.infer<typeof StudyRequestSchema>;

export class StudyHandler {
   // Implement a BaseHandler for API requests that push into a queue 
} 