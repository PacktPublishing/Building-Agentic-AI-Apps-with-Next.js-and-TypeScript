/**
 * LLM Model Configurations
 * Centralized configuration for all AI models used in the application
 */

export const AI_MODELS = {
  // OpenAI models
  OPENAI_GPT4: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 4096,
  },
  OPENAI_GPT35: {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
  },
  
  // Embedding models
  OPENAI_EMBEDDING: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
} as const;

export type AIModelConfig = typeof AI_MODELS[keyof typeof AI_MODELS];

/**
 * Get model configuration by name
 */
export function getModelConfig(modelName: keyof typeof AI_MODELS): AIModelConfig {
  return AI_MODELS[modelName];
}

/**
 * Default model for general tasks
 */
export const DEFAULT_MODEL = AI_MODELS.OPENAI_GPT4;

/**
 * Default embedding model
 */
export const DEFAULT_EMBEDDING_MODEL = AI_MODELS.OPENAI_EMBEDDING;
