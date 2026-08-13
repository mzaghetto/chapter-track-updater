import axios from 'axios';

interface ManhwaDetails {
  name: string;
  author: string | null;
  genre: string[];
  coverImage: string | null;
  description: string | null;
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | null;
}

export class AIService {
  private openRouterApiKey: string;
  private openRouterModelName: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelName = process.env.OPENROUTER_MODEL_NAME;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not found in environment variables');
    }
    if (!modelName) {
      throw new Error('OPENROUTER_MODEL_NAME not found in environment variables');
    }

    this.openRouterApiKey = apiKey;
    this.openRouterModelName = modelName;
  }

  async extractManhwaDetails(content: string): Promise<ManhwaDetails> {
    const prompt = `Given the following HTML content from a manhwa website, extract the following details in JSON format:\n- name: The title of the manhwa.\n- author: The author of the manhwa (if available, otherwise null).\n- genre: An array of strings representing the genres.\n- coverImage: The URL of the cover image (if available, otherwise null).\n- description: A brief description or synopsis of the manhwa (if available, otherwise null).\n- status: The current status of the manhwa (e.g., 'ONGOING', 'COMPLETED', 'HIATUS', otherwise null).\n\nEnsure the output is a valid JSON object. If a field is not found, use null or an empty array for genre.\n\nHTML Content:\n\`\`\`html\n${content}\n\`\`\`\n\nJSON Output:`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.openRouterModelName,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // OpenRouter answers 200 with an `error` payload (and no choices) on rate limits
      // and upstream provider failures — don't let that become a cryptic TypeError.
      const choice = response.data?.choices?.[0];

      if (!choice) {
        const apiError = response.data?.error;
        throw new Error(
          apiError?.message
            ? `the model "${this.openRouterModelName}" returned no completion: ${apiError.message}`
            : `the model "${this.openRouterModelName}" returned no completion: ${JSON.stringify(response.data).slice(0, 300)}`,
        );
      }

      const rawResponse: string = choice.message?.content ?? '';
      const cleaned = rawResponse.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      const jsonSlice = firstBrace !== -1 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

      let parsed: ManhwaDetails;
      try {
        parsed = JSON.parse(jsonSlice) as ManhwaDetails;
      } catch (parseError) {
        console.error('AI returned invalid JSON. Raw response:', rawResponse);
        throw new Error(
          `the model returned invalid JSON: ${rawResponse.slice(0, 200)}`,
        );
      }

      const normalizedStatus = typeof parsed.status === 'string' ? parsed.status.toUpperCase() : null;
      parsed.status = normalizedStatus === 'ONGOING' || normalizedStatus === 'COMPLETED' || normalizedStatus === 'HIATUS'
        ? normalizedStatus
        : null;

      return parsed;
    } catch (error) {
      console.error('Error extracting manhwa details with AI:', error);

      // Surface *why* it failed — the admin UI shows this message.
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 'no status';
        const detail =
          (error.response?.data as any)?.error?.message ??
          error.response?.statusText ??
          error.message;
        throw new Error(`OpenRouter request failed (${status}): ${detail}`);
      }

      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
