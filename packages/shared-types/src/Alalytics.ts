export type CrawlerAgent = {
  id: string;
  name: string;
  crawler: Crawler;
};
export type Crawler = {
  id: string;
  name: string;
  type: 'web' | 'api' | 'database';
  version: string;
  settings: WebCrawlerSettings | APICrawlerSettings | DatabaseCrawlerSettings;
  status: 'idle' | 'running' | 'stopped' | 'error';
};
export type WebCrawlerSettings = {
  userAgent: Record<string, string> | string;
  websiteUrl: string;
  request: Record<string, string | number | boolean>;
  crawlDelay: number;
  maxDepth: number;
  maxPages: number;
};

export type APICrawlerSettings = {
  userAgent: Record<string, string> | string;
  websiteUrl: string;
  request: Record<string, string | number | boolean>;
  crawlDelay: number;
  maxDepth: number;
  maxPages: number;
};

export type DatabaseCrawlerSettings = {
  userAgent: Record<string, string> | string;
  websiteUrl: string;
  request: Record<string, string | number | boolean>;
  crawlDelay: number;
  maxDepth: number;
  maxPages: number;
};
