import axios from 'axios';

const SCRAPING_SERVICE_URL = process.env.SCRAPING_SERVICE_URL || 'http://192.168.0.7:5002/scrape';

export async function getCloudflareBypassed(url: string) {
  try {
    const { data } = await axios.post(SCRAPING_SERVICE_URL, {
      url,
      timeout: 60000,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
    return data;
  } catch (error) {
    console.error(`Error getting Cloudflare bypassed for URL: ${url}`, error);
    throw error;
  }
}
