import { prisma } from '../lib/prisma';
import { scrapeImage } from '../scraper';
import { providers } from '../providers';

interface CoverImageResult {
  manhwaId: bigint;
  title: string;
  coverImage: string | null;
  previousCoverImage: string | null;
  updated: boolean;
  error?: string;
}

export async function updateCoverImagesJob(
  providerName: string,
  imageSelectorOverride?: string,
  useProxyOverride?: boolean,
  manhwaNames?: string[],
): Promise<CoverImageResult[]> {
  console.log(`Running cover image update job for provider: ${providerName}`);

  const providerConfig = providers.find(p => p.name === providerName);
  const imageSelector = imageSelectorOverride || providerConfig?.imageSelector;

  if (!imageSelector) {
    throw new Error(`No imageSelector configured for provider "${providerName}" and no override provided`);
  }

  const useProxy = useProxyOverride ?? providerConfig?.useProxy ?? false;

  const manhwaProviders = await prisma.manhwaProvider.findMany({
    where: {
      provider: {
        name: providerName,
      },
      ...(manhwaNames?.length && {
        manhwa: {
          name: { in: manhwaNames },
        },
      }),
    },
    include: {
      manhwa: true,
      provider: true,
    },
  });

  const results: CoverImageResult[] = [];

  for (const manhwaProvider of manhwaProviders) {
    if (!manhwaProvider.url) {
      results.push({
        manhwaId: manhwaProvider.manhwaId,
        title: manhwaProvider.manhwa.name,
        coverImage: null,
        previousCoverImage: manhwaProvider.manhwa.coverImage,
        updated: false,
        error: 'No URL configured for this manhwa provider',
      });
      continue;
    }

    try {
      const coverImage = await scrapeImage(manhwaProvider.url, imageSelector, useProxy);

      if (coverImage) {
        const previousCoverImage = manhwaProvider.manhwa.coverImage;
        await prisma.manhwas.update({
          where: { id: manhwaProvider.manhwaId },
          data: { coverImage },
        });

        results.push({
          manhwaId: manhwaProvider.manhwaId,
          title: manhwaProvider.manhwa.name,
          coverImage,
          previousCoverImage,
          updated: true,
        });
        console.log(`Updated cover image for ${manhwaProvider.manhwa.name}`);
      } else {
        results.push({
          manhwaId: manhwaProvider.manhwaId,
          title: manhwaProvider.manhwa.name,
          coverImage: null,
          previousCoverImage: manhwaProvider.manhwa.coverImage,
          updated: false,
        });
      }
    } catch (error: any) {
      console.error(`Error scraping cover image for ${manhwaProvider.manhwa.name}:`, error);
      results.push({
        manhwaId: manhwaProvider.manhwaId,
        title: manhwaProvider.manhwa.name,
        coverImage: null,
        previousCoverImage: manhwaProvider.manhwa.coverImage,
        updated: false,
        error: error.message,
      });
    }
  }

  return results;
}
