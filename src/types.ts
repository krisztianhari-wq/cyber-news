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
  /** Original headline when `title` is an English translation */
  originalTitle?: string;
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

export type RadarSignal = "kev" | "euvd" | "itw" | "zero";

export interface RadarItem {
  cve: string;
  title: string;
  vendor?: string;
  product?: string;
  summary?: string;
  mitigation?: string;
  cvss?: number;
  epss?: number;
  epssPct?: number;
  kevAdded?: string;
  ransomware?: boolean;
  euvdId?: string;
  euvdExploited?: string;
  knownExploited?: string;
  zeroExploit?: string;
  signals: RadarSignal[];
  links: { cve: string; euvd?: string; zero?: string };
}

export interface RadarSource { key: string; name: string; url: string; license: string; ok: boolean; items?: number; error?: string }

export interface Radar { since: string; generatedAt: string; total: number; sources: RadarSource[]; items: RadarItem[] }

export interface DayFile {
  date: string;
  generatedAt: string;
  model: string | null;
  itemCount: number;
  feeds: FeedStatus[];
  items: NewsItem[];
  radar?: Radar;
}

export interface IndexFile {
  builtAt: string;
  days: { date: string; itemCount: number }[];
  items: NewsItem[];
}
