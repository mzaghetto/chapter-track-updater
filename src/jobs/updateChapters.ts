import { prisma } from '../lib/prisma';
import { scrape } from '../scraper';
import { providers } from '../providers';

export async function updateChaptersJob() {
  console.log('Running chapter update job');
  const updatedManhwas: { title: string; provider: string; oldChapter: number | null; newChapter: number; }[] = [];
  const allManhwaProviders = await prisma.manhwaProvider.findMany({
    include: {
      manhwa: true,
      provider: true,
    },
  });

  for (const manhwaProvider of allManhwaProviders) {
    try {
      const providerConfig = providers.find(p => p.name === manhwaProvider.provider.name);

      if (providerConfig && manhwaProvider.url) {
        const lastChapter = await scrape(manhwaProvider.url, providerConfig.selector, providerConfig.useProxy);
        if (lastChapter && lastChapter > (manhwaProvider.lastEpisodeReleased || 0)) {
          await prisma.manhwaProvider.update({
            where: { id: manhwaProvider.id },
            data: { lastEpisodeReleased: lastChapter },
          });
          updatedManhwas.push({
            title: manhwaProvider.manhwa.name,
            provider: manhwaProvider.provider.name,
            oldChapter: manhwaProvider.lastEpisodeReleased,
            newChapter: lastChapter,
          });
          console.log(`Updated ${manhwaProvider.manhwa.name} from ${manhwaProvider.provider.name} to chapter ${lastChapter}`);
        }
      }
    } catch (error) {
      console.error(`Error updating ${manhwaProvider.manhwa.name} from ${manhwaProvider.provider.name}:`, error);
    }
  }
  return updatedManhwas;
}