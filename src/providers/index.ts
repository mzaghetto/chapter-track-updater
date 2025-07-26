import { Provider } from './types';

export const providers: Provider[] = [
  {
    name: 'seitacelestial',
    url: 'https://neoxscans.net',
    selector: 'div.main-info > div.info-right > div.bixbox.bxcl.epcheck > div.lastend > div:nth-child(2) > a > span.epcur.epcurlast',
    useProxy: false,
  },
  {
    name: 'mgeko',
    url: 'https://www.mgeko.cc',
    selector: '.chapter-list li:first-child',
    useProxy: false,
  },
];