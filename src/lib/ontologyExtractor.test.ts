import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanJsonContent,
  resolveChatCompletionsUrl,
  extractOntologyFromText,
} from './ontologyExtractor';

describe('ontologyExtractor', () => {
  describe('cleanJsonContent', () => {
    it('returns raw json string when no markdown code block is present', () => {
      const input = '{"name":"Coffee Shop","entityTypes":[],"relationships":[]}';
      expect(cleanJsonContent(input)).toBe(input);
    });

    it('strips ```json ... ``` markdown code fences', () => {
      const json = '{\n  "name": "Coffee Shop",\n  "entityTypes": [],\n  "relationships": []\n}';
      const input = `\`\`\`json\n${json}\n\`\`\``;
      expect(cleanJsonContent(input)).toBe(json);
    });

    it('strips generic ``` ... ``` markdown fences', () => {
      const json = '{"name":"Hospital","entityTypes":[],"relationships":[]}';
      const input = `\`\`\`\n${json}\n\`\`\``;
      expect(cleanJsonContent(input)).toBe(json);
    });

    it('handles surrounding whitespace gracefully', () => {
      const json = '{"name":"School"}';
      const input = `   \n\`\`\`json\n${json}\n\`\`\`   \n`;
      expect(cleanJsonContent(input)).toBe(json);
    });
  });

  describe('resolveChatCompletionsUrl', () => {
    it('appends /chat/completions when not present', () => {
      expect(resolveChatCompletionsUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1/chat/completions');
      expect(resolveChatCompletionsUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1/chat/completions');
      expect(resolveChatCompletionsUrl('https://api.deepseek.com')).toBe('https://api.deepseek.com/chat/completions');
    });

    it('keeps url untouched if it already ends with /chat/completions', () => {
      expect(resolveChatCompletionsUrl('https://api.openai.com/v1/chat/completions')).toBe('https://api.openai.com/v1/chat/completions');
      expect(resolveChatCompletionsUrl('https://api.openai.com/v1/chat/completions/')).toBe('https://api.openai.com/v1/chat/completions');
    });
  });

  describe('extractOntologyFromText', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('throws error when description or apiKey is missing', async () => {
      await expect(extractOntologyFromText('', { apiKey: 'key' })).rejects.toThrow("Missing or empty 'description'");
      await expect(extractOntologyFromText('A store scenario', { apiKey: '' })).rejects.toThrow('API Key is required');
    });

    it('successfully calls OpenAI-compatible API and extracts ontology', async () => {
      const mockResult = {
        name: 'Coffee Store',
        entityTypes: [
          {
            id: 'customer',
            name: 'Customer',
            description: 'A customer who buys coffee',
            properties: [{ name: 'id', type: 'string', isIdentifier: true }],
            icon: '👤',
            color: '#0078D4',
          },
        ],
        relationships: [],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `\`\`\`json\n${JSON.stringify(mockResult)}\n\`\`\``,
              },
            },
          ],
        }),
      } as Response);

      const result = await extractOntologyFromText('A coffee shop with customers', {
        apiKey: 'test-key-123',
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
      });

      expect(result).toEqual(mockResult);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe('https://api.deepseek.com/v1/chat/completions');
      expect((calledOptions?.headers as Record<string, string>)?.['Authorization']).toBe('Bearer test-key-123');
      
      const parsedBody = JSON.parse(calledOptions?.body as string);
      expect(parsedBody.model).toBe('deepseek-chat');
      expect(parsedBody.response_format).toEqual({ type: 'json_object' });
    });

    it('supports Azure OpenAI protocol when isAzure is true', async () => {
      const mockResult = {
        name: 'Azure Logistics',
        entityTypes: [],
        relationships: [],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResult) } }],
        }),
      } as Response);

      const result = await extractOntologyFromText('Logistics supply chain', {
        apiKey: 'azure-key-xyz',
        baseURL: 'https://my-azure-resource.openai.azure.com',
        isAzure: true,
        azureDeployment: 'gpt-4o-mini',
      });

      expect(result).toEqual(mockResult);
      const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
      expect(calledUrl).toContain('openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-02-15-preview');
      expect((calledOptions?.headers as Record<string, string>)?.['api-key']).toBe('azure-key-xyz');
    });

    it('throws descriptive error on bad LLM response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized API key',
      } as Response);

      await expect(
        extractOntologyFromText('Scenario', { apiKey: 'invalid-key' })
      ).rejects.toThrow('LLM API returned status 401: Unauthorized API key');
    });

    it('successfully extracts ontology with computed properties and validation rules', async () => {
      const mockRichResult = {
        name: 'Advanced Coffee Shop',
        entityTypes: [
          {
            id: 'customer',
            name: 'Customer',
            description: 'A customer who orders coffee',
            properties: [
              {
                name: 'customerId',
                type: 'string',
                isIdentifier: true,
                isRequired: true,
                constraints: [
                  {
                    type: 'regex',
                    pattern: '^CUST-\\d{3}$',
                    description: 'Customer ID format CUST-XXX',
                    severity: 'error',
                  },
                ],
              },
              {
                name: 'totalSpend',
                type: 'decimal',
                isIdentifier: false,
                isComputed: true,
                expression: {
                  type: 'aggregation',
                  relationshipId: 'customer_places_order',
                  targetProperty: 'totalAmount',
                  aggregationFn: 'sum',
                },
              },
            ],
            icon: '👤',
            color: '#0078D4',
          },
        ],
        relationships: [
          {
            id: 'customer_places_order',
            name: 'places',
            from: 'customer',
            to: 'order',
            cardinality: 'one-to-many',
            constraints: [
              {
                type: 'cardinality',
                min: 0,
                description: 'Customer can have 0 or more orders',
                severity: 'info',
              },
            ],
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockRichResult) } }],
        }),
      } as Response);

      const result = await extractOntologyFromText(
        'Customers have totalSpend summed from orders and customerId matching regex',
        {
          apiKey: 'test-key',
        }
      );

      expect(result.name).toBe('Advanced Coffee Shop');
      const custProps = result.entityTypes[0].properties;
      expect(custProps[0].isRequired).toBe(true);
      expect(custProps[0].constraints?.[0].type).toBe('regex');
      expect(custProps[1].isComputed).toBe(true);
      expect(custProps[1].expression?.aggregationFn).toBe('sum');
      expect(result.relationships[0].constraints?.[0].type).toBe('cardinality');
    });
  });
});
