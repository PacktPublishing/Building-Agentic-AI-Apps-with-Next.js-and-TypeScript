/**
 * Self-Query Parser
 *
 * Uses LLM to extract structured filters from natural language queries.
 * This enables automatic metadata filtering without explicit user input.
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '@/config';
import {
  SELF_QUERY_SYSTEM_PROMPT,
  SELF_QUERY_USER_TEMPLATE,
} from './prompts/self-query.prompt';

/**
 * Extracted filters from a natural language query
 */
export interface ExtractedFilters {
  destination?: string;
  budget_min?: number;
  budget_max?: number;
  budget_category?: 'economy' | 'standard' | 'premium';
  min_duration?: number;
  max_duration?: number;
  departure_city?: string;
  num_people?: number;
}

/**
 * Result of self-query parsing
 */
export interface SelfQueryResult {
  /** The semantic query to use for vector search */
  semanticQuery: string;
  /** Extracted structured filters */
  filters: ExtractedFilters;
  /** Confidence score (0-1) */
  confidence: number;
  /** Original query for reference */
  originalQuery: string;
}

/**
 * Configuration for the self-query parser
 */
interface SelfQueryParserConfig {
  /** Model to use (default: claude-3-haiku for speed) */
  model?: string;
  /** Temperature (default: 0 for deterministic parsing) */
  temperature?: number;
  /** Whether to use cache for repeated queries */
  useCache?: boolean;
}

/**
 * Self-Query Parser
 *
 * Parses natural language queries to extract:
 * 1. Semantic query for vector search
 * 2. Structured filters for metadata filtering
 */
export class SelfQueryParser {
  private llm: ChatAnthropic;
  private cache: Map<string, SelfQueryResult> = new Map();
  private useCache: boolean;

  constructor(parserConfig: SelfQueryParserConfig = {}) {
    this.llm = new ChatAnthropic({
      modelName: parserConfig.model || 'claude-3-haiku-20240307',
      temperature: parserConfig.temperature ?? 0,
      anthropicApiKey: config.anthropic_api_key,
    });
    this.useCache = parserConfig.useCache ?? true;
  }

  /**
   * Parse a natural language query into semantic query and filters
   */
  async parse(query: string): Promise<SelfQueryResult> {
    const normalizedQuery = query.trim().toLowerCase();

    // Check cache
    if (this.useCache && this.cache.has(normalizedQuery)) {
      console.log('📦 SelfQueryParser: Cache hit');
      return this.cache.get(normalizedQuery)!;
    }

    console.log(`🔍 SelfQueryParser: Parsing "${query}"`);

    try {
      // Prepare prompt
      const userPrompt = SELF_QUERY_USER_TEMPLATE.replace('{query}', query);

      // Call LLM
      const response = await this.llm.invoke([
        new SystemMessage(SELF_QUERY_SYSTEM_PROMPT),
        new HumanMessage(userPrompt),
      ]);

      // Parse JSON response
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const parsed = this.parseJsonResponse(content);

      const result: SelfQueryResult = {
        semanticQuery: parsed.semanticQuery || query,
        filters: this.validateFilters(parsed.filters || {}),
        confidence: parsed.confidence ?? 0.8,
        originalQuery: query,
      };

      // Cache result
      if (this.useCache) {
        this.cache.set(normalizedQuery, result);
      }

      console.log(`✅ SelfQueryParser: Extracted filters:`, result.filters);
      return result;
    } catch (error) {
      console.error('❌ SelfQueryParser: Parse failed', error);
      // Return original query with no filters on failure
      return {
        semanticQuery: query,
        filters: {},
        confidence: 0,
        originalQuery: query,
      };
    }
  }

  /**
   * Parse JSON from LLM response, handling potential markdown code blocks
   */
  private parseJsonResponse(content: string): {
    semanticQuery?: string;
    filters?: Partial<ExtractedFilters>;
    confidence?: number;
  } {
    // Remove markdown code blocks if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }

    return JSON.parse(jsonStr.trim());
  }

  /**
   * Validate and clean extracted filters
   */
  private validateFilters(filters: Partial<ExtractedFilters>): ExtractedFilters {
    const validated: ExtractedFilters = {};

    if (filters.destination && typeof filters.destination === 'string') {
      validated.destination = filters.destination.trim();
    }

    if (filters.budget_min && typeof filters.budget_min === 'number' && filters.budget_min > 0) {
      validated.budget_min = filters.budget_min;
    }

    if (filters.budget_max && typeof filters.budget_max === 'number' && filters.budget_max > 0) {
      validated.budget_max = filters.budget_max;
    }

    if (
      filters.budget_category &&
      ['economy', 'standard', 'premium'].includes(filters.budget_category)
    ) {
      validated.budget_category = filters.budget_category;
    }

    if (
      filters.min_duration &&
      typeof filters.min_duration === 'number' &&
      filters.min_duration > 0
    ) {
      validated.min_duration = filters.min_duration;
    }

    if (
      filters.max_duration &&
      typeof filters.max_duration === 'number' &&
      filters.max_duration > 0
    ) {
      validated.max_duration = filters.max_duration;
    }

    if (filters.departure_city && typeof filters.departure_city === 'string') {
      validated.departure_city = filters.departure_city.trim();
    }

    if (filters.num_people && typeof filters.num_people === 'number' && filters.num_people > 0) {
      validated.num_people = filters.num_people;
    }

    return validated;
  }

  /**
   * Convert extracted filters to VectorSearchFilter format
   */
  toVectorSearchFilter(filters: ExtractedFilters): {
    destination?: string;
    budget_category?: 'economy' | 'standard' | 'premium';
  } {
    return {
      destination: filters.destination,
      budget_category: filters.budget_category,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instance for convenience
 */
let _parserInstance: SelfQueryParser | null = null;

export function getSelfQueryParser(): SelfQueryParser {
  if (!_parserInstance) {
    _parserInstance = new SelfQueryParser();
  }
  return _parserInstance;
}
