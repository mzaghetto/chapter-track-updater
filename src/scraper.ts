import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCloudflareBypassed } from './lib/proxy';

export async function fetchHtml(url: string, useProxy: boolean): Promise<string> {
  if (useProxy) {
    const { data } = await getCloudflareBypassed(url);
    return data;
  }
  const { data } = await axios.get(url);
  return data;
}

export async function scrapeImage(url: string, selector: string, useProxy: boolean): Promise<string | null> {
  const html = await fetchHtml(url, useProxy);
  const $ = cheerio.load(html);
  const imgElement = $(selector).first();

  const candidates = [
    imgElement.attr('data-src'),
    imgElement.attr('data-lazy-src'),
    imgElement.attr('src'),
  ];

  const imageUrl = candidates.find(url => url?.trim() && !url.includes('placeholder'));

  return imageUrl?.trim() || null;
}

export async function scrape(url: string, selector: string, useProxy: boolean): Promise<number | null> {
  const html = await fetchHtml(url, useProxy);
  const $ = cheerio.load(html);
  const lastChapterRaw = $(selector).first().text().trim();

  if (lastChapterRaw) {
    const chapterNumber = lastChapterRaw.match(/\d+/);
    if (chapterNumber) {
      return parseInt(chapterNumber[0], 10);
    }
  }

  return null;
}
