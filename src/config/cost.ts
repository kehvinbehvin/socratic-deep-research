export const costConfig = {
    openai: {
      api_calls: 0.0004,    // cost per API call
      tokens: 0.0001,       // cost per token
    },
    firecrawl: {
      api_calls: 0.001,
      bytes: 0.0000001,
    },
    serpai: {
      api_calls: 0.002,
    }
  } as const;
  
  export type ServiceName = keyof typeof costConfig;
  export type MetricType<T extends ServiceName> = keyof typeof costConfig[T];