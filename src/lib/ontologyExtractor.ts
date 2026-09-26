import type { ComputedExpression, PropertyConstraint, RelationshipConstraint } from '../data/ontology';

export const SYSTEM_PROMPT = `You are an expert ontology extraction system. Given a business scenario description, extract entities, relationships, properties, computed properties, and validation rules/constraints to create a complete production-grade ontology.

Output ONLY valid JSON matching this exact schema:
{
  "name": "string - Name for this ontology",
  "entityTypes": [
    {
      "id": "string - lowercase, snake_case identifier",
      "name": "string - Display name",
      "description": "string - Brief description",
      "properties": [
        {
          "name": "string - camelCase property name",
          "type": "string|integer|decimal|boolean|date|datetime|enum",
          "isIdentifier": boolean (true for primary key),
          "values": ["array of enum values if type is enum"],
          "unit": "string - optional unit like USD, kg, etc.",
          "isComputed": boolean (optional - true if calculated or derived),
          "expression": {
            "type": "aggregation|formula|conditional",
            "relationshipId": "string (optional - id of relationship to aggregate across)",
            "targetProperty": "string (optional - property on target entity to aggregate)",
            "aggregationFn": "sum|count|avg|min|max (optional)",
            "formula": "string (optional - math expression e.g. price * quantity)",
            "conditions": [
              {
                "when": "string - condition e.g. totalSpend >= 1000",
                "then": "string|number - resulting value e.g. Platinum"
              }
            ],
            "defaultVal": "string|number (optional - fallback value)"
          },
          "isRequired": boolean (optional - true if field is mandatory),
          "constraints": [
            {
              "type": "range|regex|length|custom",
              "min": number (optional),
              "max": number (optional),
              "pattern": "string (optional - regex pattern)",
              "description": "string - human readable validation rule description",
              "severity": "error|warning|info"
            }
          ]
        }
      ],
      "icon": "string - single emoji representing this entity",
      "color": "string - hex color code like #0078D4, #107C10, #5C2D91, #FFB900, #D83B01, #00A9E0"
    }
  ],
  "relationships": [
    {
      "id": "string - lowercase identifier like entity1_verb_entity2",
      "name": "string - verb describing the relationship",
      "from": "string - id of source entity",
      "to": "string - id of target entity",
      "cardinality": "one-to-one|one-to-many|many-to-one|many-to-many",
      "description": "string - optional description",
      "constraints": [
        {
          "type": "cardinality|mandatory",
          "min": number (optional),
          "max": number (optional),
          "description": "string - validation rule description",
          "severity": "error|warning|info"
        }
      ]
    }
  ]
}

Rules:
1. Extract nouns as entities, verbs as relationships
2. Each entity MUST have at least one property with isIdentifier: true
3. Include 3-6 meaningful properties per entity
4. Use appropriate cardinality based on business logic
5. Generate descriptive relationship names (verbs like "places", "contains", "manages")
6. Use relevant emojis for icons
7. Assign unique hex colors to each entity (use Microsoft palette: #0078D4, #107C10, #5C2D91, #FFB900, #D83B01, #00A9E0, #8764B8, #00B294)
8. COMPUTED PROPERTIES: If the description mentions metrics derived, aggregated, or calculated from other data (e.g. total spend sum, order count, profit formula, customer tier based on spend), set isComputed: true and populate the expression object accordingly.
9. DATA CONTRACTS & VALIDATION RULES: If the description mentions data constraints, requirements, or boundaries (e.g. required fields, non-negative amounts, email format regex, valid ranges), set isRequired: true and/or populate constraints with human-readable descriptions.
10. Output ONLY the JSON, no explanations`;

export interface ExtractorConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  isAzure?: boolean;
  azureDeployment?: string;
}

export interface ExtractedOntologyResult {
  name: string;
  entityTypes: Array<{
    id: string;
    name: string;
    description: string;
    properties: Array<{
      name: string;
      type: string;
      isIdentifier: boolean;
      values?: string[];
      unit?: string;
      isComputed?: boolean;
      expression?: ComputedExpression;
      isRequired?: boolean;
      constraints?: PropertyConstraint[];
    }>;
    icon: string;
    color: string;
  }>;
  relationships: Array<{
    id: string;
    name: string;
    from: string;
    to: string;
    cardinality: string;
    description?: string;
    constraints?: RelationshipConstraint[];
  }>;
}

/**
 * Clean markdown code fences from LLM responses if present
 */
export function cleanJsonContent(content: string): string {
  let cleaned = content.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    cleaned = match[1].trim();
  }
  return cleaned;
}

/**
 * Resolve standard OpenAI endpoint for chat completions
 */
export function resolveChatCompletionsUrl(baseURL: string): string {
  const trimmed = baseURL.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}

/**
 * Request ontology extraction from OpenAI-compatible or Azure OpenAI provider
 */
export async function extractOntologyFromText(
  description: string,
  config: ExtractorConfig
): Promise<ExtractedOntologyResult> {
  if (!description || typeof description !== 'string' || !description.trim()) {
    throw new Error("Missing or empty 'description'");
  }

  if (!config.apiKey) {
    throw new Error('API Key is required for ontology extraction');
  }

  let requestUrl: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const bodyPayload: Record<string, unknown> = {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: description.trim() },
    ],
    temperature: 0.3,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  };

  if (config.isAzure) {
    const endpoint = (config.baseURL || '').replace(/\/+$/, '');
    const deployment = config.azureDeployment || 'gpt-4o-mini';
    requestUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;
    headers['api-key'] = config.apiKey;
  } else {
    const rawBaseURL = config.baseURL || 'https://api.openai.com/v1';
    requestUrl = resolveChatCompletionsUrl(rawBaseURL);
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    bodyPayload.model = config.model || 'gpt-4o-mini';
  }

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('No content returned from LLM provider');
  }

  const cleaned = cleanJsonContent(rawContent);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse extracted JSON from LLM: ${err instanceof Error ? err.message : String(err)}`);
  }

  const ontology = parsed as ExtractedOntologyResult;
  if (!ontology.name || !Array.isArray(ontology.entityTypes) || !Array.isArray(ontology.relationships)) {
    throw new Error('Invalid ontology structure returned from LLM');
  }

  return ontology;
}
