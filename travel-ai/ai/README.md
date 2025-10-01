# AI Layer

This directory contains all AI-related logic for the Travel AI App.

## Structure

- **rag/**: Retrieval-Augmented Generation pipeline
  - Embeddings generation
  - Vector store integration (Qdrant)
  - Document retrieval

- **agents/**: LangGraph agents
  - `travel-planner/`: Main travel planning agent
  - `booking-assistant/`: Booking and reservation agent
  - `recommendation-agent/`: Personalized recommendations

- **prompts/**: Prompt templates
  - System prompts
  - Agent-specific prompts

- **tools/**: LangChain tools
  - Flight search
  - Hotel search
  - Weather information

- **config/**: AI configuration
  - LLM model configurations
  - Chain configurations

## Principles

1. **Isolation**: AI logic is completely isolated from UI and database layers
2. **Testability**: Each component can be tested independently
3. **Replaceability**: Easy to swap LLM providers or orchestration frameworks
4. **Type Safety**: Full TypeScript support with Zod validation
