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

  async extractManhwaDetails(content: string): Promise<ManhwaDetails | null> {
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

      const rawResponse = response.data.choices[0].message.content;
      return JSON.parse(rawResponse) as ManhwaDetails;
    } catch (error) {
      console.error('Error extracting manhwa details with AI:', error);
      return null;
    }
  }
}
