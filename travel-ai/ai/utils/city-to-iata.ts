import { ChatAnthropic } from "@langchain/anthropic";
import { config } from "@/config";

/**
 * Result of city to IATA conversion
 */
export interface CityToIATAResult {
    iataCode: string;
    cityFullName: string;
    country: string;
    ambiguity: boolean;
    alternatives?: Array<{ code: string; name: string; country: string }>;
}

/**
 * Convert a city name to its IATA airport code using LLM
 *
 * @param cityInput - City name (e.g., "Paris", "New York", "London")
 * @returns CityToIATAResult with IATA code and metadata
 *
 * @example
 * ```typescript
 * const result = await convertCityToIATA("Paris");
 * // { iataCode: "CDG", cityFullName: "Paris", country: "France", ambiguity: false }
 * ```
 */
export async function convertCityToIATA(cityInput: string): Promise<CityToIATAResult> {
    try {
        // Initialize LLM
        const model = new ChatAnthropic({
            model: config.model_name || "claude-sonnet-4-5",
            anthropicApiKey: config.anthropic_api_key,
            temperature: 0 // Deterministic for consistency
        });

        // Check if input is already a valid IATA code
        const iataRegex = /^[A-Z]{3}$/;
        const isAlreadyIATA = iataRegex.test(cityInput.trim().toUpperCase());

        // Craft prompt for city-to-IATA conversion
        const prompt = isAlreadyIATA
            ? `You are a travel assistant. The following is an IATA airport code. Return the full city name and country for this airport.

IATA Code: "${cityInput.toUpperCase()}"

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "iataCode": "${cityInput.toUpperCase()}",
  "cityFullName": "City Name",
  "country": "Country Name",
  "ambiguity": false
}

Example: For "CDG" return {"iataCode": "CDG", "cityFullName": "Paris", "country": "France", "ambiguity": false}`
            : `You are a travel assistant. Convert the following city name to its primary IATA airport code.

City: "${cityInput}"

IMPORTANT Instructions:
1. Return the PRIMARY/MAIN airport code for the city
2. For cities with multiple airports:
   - London → LHR (Heathrow, the primary international airport)
   - Paris → CDG (Charles de Gaulle, the primary international airport)
   - New York → JFK (Kennedy, the primary international airport)
   - Tokyo → NRT (Narita, the primary international airport)
3. If the city name is ambiguous (e.g., "Paris" could be Paris, France or Paris, Texas), choose the most popular/international one
4. Use the airport code that travelers would most commonly use for that city

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "iataCode": "XXX",
  "cityFullName": "City Name",
  "country": "Country Name",
  "ambiguity": false
}

Examples:
- Input: "London" → {"iataCode": "LHR", "cityFullName": "London", "country": "United Kingdom", "ambiguity": false}
- Input: "Paris" → {"iataCode": "CDG", "cityFullName": "Paris", "country": "France", "ambiguity": false}
- Input: "New York" → {"iataCode": "JFK", "cityFullName": "New York", "country": "United States", "ambiguity": false}`;

        const response = await model.invoke(prompt);

        // Parse LLM response
        const content = response.content.toString();

        // Clean up response (remove markdown code blocks if present)
        const jsonString = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const result: CityToIATAResult = JSON.parse(jsonString);

        console.log(`✅ City-to-IATA: "${cityInput}" → ${result.iataCode}`);

        return result;

    } catch (error) {
        console.error('❌ City-to-IATA conversion error:', error);

        // Fallback: Return input uppercased as IATA code
        const fallbackCode = cityInput.trim().toUpperCase().substring(0, 3);

        return {
            iataCode: fallbackCode,
            cityFullName: cityInput,
            country: 'Unknown',
            ambiguity: false
        };
    }
}

/**
 * Batch convert multiple cities to IATA codes
 */
export async function convertCitiesToIATA(cities: string[]): Promise<CityToIATAResult[]> {
    const results = await Promise.all(
        cities.map(city => convertCityToIATA(city))
    );
    return results;
}

/**
 * Validate if a string is a valid IATA code format
 */
export function isValidIATACode(code: string): boolean {
    return /^[A-Z]{3}$/.test(code.trim().toUpperCase());
}
