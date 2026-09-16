export type CategoryId =
  | "ai-security"
  | "global-security"
  | "incidents-threats"
  | "vulns-malware-ttps"
  | "policy-regulation"
  | "eu-threat-landscape";

export interface Category { id: CategoryId; name: string; short: string }

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  published: string;
  category: CategoryId;
  summary: string;
  relevance: number;
  tags: string[];
  date?: string;
}

export interface FeedStatus { name: string; ok: boolean; items?: number; error?: string }

export interface DayFile {
  date: string;
  generatedAt: string;
  model: string | null;
  itemCount: number;
  feeds: FeedStatus[];
  items: NewsItem[];
}

export interface IndexFile {
  builtAt: string;
  days: { date: string; itemCount: number }[];
  items: NewsItem[];
}
