require('dotenv').config();

import './cron';

import express from 'express';
import { prisma } from './lib/prisma';
import { scrape, fetchHtml } from './scraper';
import { updateChaptersJob } from './jobs/updateChapters';
import { notifyUsersJob } from './jobs/notifyUsers';
import { healthCheckJob } from './jobs/healthCheck';
import { AIService } from './services/aiService';

const app = express();
app.use(express.json());

// Custom JSON serializer for BigInt
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

const aiService = new AIService();

app.post('/test-scrape', async (req, res) => {
  const { providerName, useProxy, selector } = req.body;

  if (!providerName || !selector) {
    return res.status(400).json({ message: 'providerName and selector are required' });
  }

  try {
    const manhwaProviders = await prisma.manhwaProvider.findMany({
      where: {
        provider: {
          name: providerName,
        },
      },
      include: {
        manhwa: true,
      },
    });

    const results = [];
    for (const manhwaProvider of manhwaProviders) {
      try {
        if (manhwaProvider.url) {
          const lastChapter = await scrape(manhwaProvider.url, selector, useProxy);
          if (lastChapter && lastChapter > (manhwaProvider.lastEpisodeReleased || 0)) {
            await prisma.manhwaProvider.update({
              where: { id: manhwaProvider.id },
              data: { lastEpisodeReleased: lastChapter },
            });
            results.push({ title: manhwaProvider.manhwa.name, lastChapter, updated: true });
          } else {
            results.push({ title: manhwaProvider.manhwa.name, lastChapter, updated: false });
          }
        }
      } catch (error: any) {
        results.push({ title: manhwaProvider.manhwa.name, error: error.message });
      }
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.post('/trigger-update', async (req, res) => {
  try {
    const updatedManhwas = await updateChaptersJob();
    res.json({ message: 'Chapter update job triggered successfully', updatedManhwas });
  } catch (error: any) {
    res.status(500).json({ message: 'Error triggering chapter update job', error: error.message });
  }
});

app.post('/trigger-notifications', async (req, res) => {
  try {
    const sentNotifications = await notifyUsersJob();
    res.json({ message: 'User notification job triggered successfully', sentNotifications });
  } catch (error: any) {
    res.status(500).json({ message: 'Error triggering user notification job', error: error.message });
  }
});

app.post('/create-manhwa-from-url', async (req, res) => {
  const { url, useProxy } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    const htmlContent = await fetchHtml(url, useProxy || false);
    const manhwaDetails = await aiService.extractManhwaDetails(htmlContent);

    if (!manhwaDetails || !manhwaDetails.name) {
      return res.status(400).json({ message: 'Could not extract manhwa details from URL' });
    }

    // Handle author as a single string
    const authorString = Array.isArray(manhwaDetails.author) ? manhwaDetails.author.join(', ') : manhwaDetails.author;

    const newManhwa = await prisma.manhwas.create({
      data: {
        name: manhwaDetails.name,
        author: authorString,
        genre: manhwaDetails.genre,
        coverImage: manhwaDetails.coverImage,
        description: manhwaDetails.description,
        status: manhwaDetails.status,
      },
    });

    res.json({ message: 'Manhwa created successfully', manhwa: newManhwa });
  } catch (error: any) {
    console.error('Error creating manhwa from URL:', error);
    res.status(500).json({ message: 'Error creating manhwa from URL', error: error.message });
  }
});

app.post('/trigger-health-check', async (req, res) => {
  try {
    await healthCheckJob();
    res.json({ message: 'API health check triggered successfully. Check logs for details.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error triggering API health check', error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});