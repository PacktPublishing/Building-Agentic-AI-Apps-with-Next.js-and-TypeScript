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
  currency?: 'EUR';
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
  /** False when the structured request could not be safely validated. */
  valid?: boolean;
  error?: string;
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
      modelName: parserConfig.model || config.model_name,
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
        semanticQuery: typeof parsed.semanticQuery === 'string' ? parsed.semanticQuery.trim() : '',
        filters: this.validateFilters(parsed.filters || {}),
        confidence: typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
        originalQuery: query,
        valid: true,
      };
      if (!result.semanticQuery) throw new Error('Self-query response has no semantic query');

      // Cache result
      if (this.useCache) {
        this.cache.set(normalizedQuery, result);
      }

      console.log(`✅ SelfQueryParser: Extracted filters:`, result.filters);
      return result;
    } catch (error) {
      console.error('❌ SelfQueryParser: Parse failed', error);
      // Fail closed: constrained requests must not silently broaden to an
      // unrestricted search after malformed model output or provider failure.
      return {
        semanticQuery: '',
        filters: {},
        confidence: 0,
        originalQuery: query,
        valid: false,
        error: 'Unable to validate search constraints',
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
    const supported = new Set(['currency', 'destination', 'budget_min', 'budget_max', 'budget_category', 'min_duration', 'max_duration', 'departure_city', 'num_people']);
    for (const key of Object.keys(filters)) {
      if (!supported.has(key)) throw new Error(`Unsupported search constraint: ${key}`);
    }
    const validated: ExtractedFilters = {};
    if (filters.currency !== undefined && filters.currency !== 'EUR') throw new Error('Only EUR budgets are supported');
    if (filters.currency === 'EUR') validated.currency = 'EUR';
    for (const key of ['budget_min', 'budget_max', 'min_duration', 'max_duration']) {
      const value = (filters as Record<string, unknown>)[key];
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(`Invalid numeric constraint: ${key}`);
    }
    for (const key of ['min_duration', 'max_duration']) {
      const value = (filters as Record<string, unknown>)[key];
      if (value !== undefined && !Number.isInteger(value)) throw new Error(`Duration must be an integer: ${key}`);
    }

    if (filters.destination !== undefined && typeof filters.destination !== 'string') throw new Error('Invalid destination constraint');
    if (filters.destination) {
      validated.destination = filters.destination.trim();
    }

    if (typeof filters.budget_min === 'number' && Number.isFinite(filters.budget_min) && filters.budget_min >= 0) {
      validated.budget_min = filters.budget_min;
    }

    if (typeof filters.budget_max === 'number' && Number.isFinite(filters.budget_max) && filters.budget_max >= 0) {
      validated.budget_max = filters.budget_max;
    }

    if (filters.budget_category !== undefined && !['economy', 'standard', 'premium'].includes(filters.budget_category as string)) throw new Error('Invalid budget category');
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

    if (validated.budget_min !== undefined && validated.budget_max !== undefined && validated.budget_min > validated.budget_max) {
      throw new Error('Invalid budget range');
    }
    if (validated.min_duration !== undefined && validated.max_duration !== undefined && validated.min_duration > validated.max_duration) {
      throw new Error('Invalid duration range');
    }

    if (filters.departure_city && typeof filters.departure_city === 'string') {
      validated.departure_city = filters.departure_city.trim();
    }

    if (typeof filters.num_people === 'number' && Number.isInteger(filters.num_people) && filters.num_people > 0) {
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
