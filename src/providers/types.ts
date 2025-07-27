export interface Provider {
  name: string;
  url: string;
  selector: string;
  useProxy: boolean;
}

export interface CreateManhwaFromUrlRequest {
  contentUrl: string;
  providerUrl: string;
  providerName: string;
  providerSelector?: string;
  useProxy?: boolean;
}
