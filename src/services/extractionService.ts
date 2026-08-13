import { providers } from '../providers';
import { Provider } from '../providers/types';
import { fetchHtml, scrape } from '../scraper';
import { AIService } from './aiService';

export interface ManhwaPreview {
  name: string;
  author: string | null;
  genre: string[];
  coverImage: string | null;
  description: string | null;
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | null;
}

export interface ExtractPreviewRequest {
  contentUrl: string;
  providerUrl?: string;
  providerName?: string;
  selector?: string;
  useProxy?: boolean;
}

export interface ExtractPreviewResult {
  manhwa: ManhwaPreview;
  lastChapter: number | null;
  selectorUsed: string | null;
  useProxyUsed: boolean;
  warnings: string[];
}

export class ExtractionError extends Error {
  constructor(message: string, public readonly statusCode = 422) {
    super(message);
    this.name = 'ExtractionError';
  }
}

let aiServiceInstance: AIService | null = null;

function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

export function findProviderConfig(name?: string): Provider | undefined {
  if (!name) return undefined;
  return providers.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
}

export function listProviderConfigs(): Provider[] {
  return providers;
}

function normalizeAuthor(author: unknown): string | null {
  if (Array.isArray(author)) {
    return author.filter(Boolean).join(', ').trim() || null;
  }
  if (typeof author === 'string') {
    return author.trim() || null;
  }
  return null;
}

/**
 * Fetches the content page, extracts the manhwa metadata with the AI and — when a provider
 * URL/selector is available — also scrapes the latest released chapter.
 *
 * Nothing is persisted here: this is the read-only step shared by the admin preview and the
 * create endpoints.
 */
export async function extractManhwaPreview({
  contentUrl,
  providerUrl,
  providerName,
  selector,
  useProxy,
}: ExtractPreviewRequest): Promise<ExtractPreviewResult> {
  const providerConfig = findProviderConfig(providerName);

  const selectorUsed = selector?.trim() || providerConfig?.selector || null;
  const useProxyUsed = useProxy ?? providerConfig?.useProxy ?? false;
  const warnings: string[] = [];

  if (providerName && !providerConfig && !selector?.trim()) {
    warnings.push(`No hardcoded config found for provider "${providerName}".`);
  }

  let htmlContent: string;
  try {
    htmlContent = await fetchHtml(contentUrl, useProxyUsed);
  } catch (error: any) {
    throw new ExtractionError(
      `Could not fetch the content page (${contentUrl}): ${error.message}`,
    );
  }

  let manhwaDetails;
  try {
    manhwaDetails = await getAIService().extractManhwaDetails(htmlContent);
  } catch (error: any) {
    throw new ExtractionError(`AI extraction failed: ${error.message}`);
  }

  if (!manhwaDetails?.name) {
    throw new ExtractionError(
      'The AI could not extract a manhwa name from this page. Check if the URL points to the manhwa detail page.',
    );
  }

  const manhwa: ManhwaPreview = {
    name: manhwaDetails.name.trim(),
    author: normalizeAuthor(manhwaDetails.author),
    genre: Array.isArray(manhwaDetails.genre) ? manhwaDetails.genre : [],
    coverImage: manhwaDetails.coverImage ?? null,
    description: manhwaDetails.description ?? null,
    status: manhwaDetails.status ?? null,
  };

  let lastChapter: number | null = null;
  const chapterUrl = providerUrl?.trim() || contentUrl;

  if (!selectorUsed) {
    warnings.push(
      'No selector available — the latest chapter was not scraped.',
    );
  } else {
    try {
      lastChapter = await scrape(chapterUrl, selectorUsed, useProxyUsed);
      if (lastChapter === null) {
        warnings.push(
          `The selector "${selectorUsed}" matched nothing (or no number) on ${chapterUrl}.`,
        );
      }
    } catch (error: any) {
      warnings.push(`Failed to scrape the latest chapter: ${error.message}`);
    }
  }

  return { manhwa, lastChapter, selectorUsed, useProxyUsed, warnings };
}
