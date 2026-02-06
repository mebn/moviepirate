// ── Cinemeta Types ──

export interface CinemetaMeta {
  id: string; // IMDb ID (tt-prefixed)
  imdb_id: string;
  type: "movie" | "series";
  name: string;
  poster?: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  year?: string;
  genres?: string[];
  imdbRating?: string;
  runtime?: string;
  cast?: string[];
  director?: string[];
  videos?: CinemetaVideo[];
  behaviorHints?: {
    defaultVideoId?: string | null;
    hasScheduledVideos?: boolean;
  };
}

export interface CinemetaVideo {
  id: string; // Format: {imdbId}:{season}:{episode}
  name: string;
  season: number;
  number: number;
  episode: number;
  released?: string;
  firstAired?: string;
  overview?: string;
  description?: string;
  thumbnail?: string;
  rating?: string;
}

export interface Season {
  number: number;
  episodes: CinemetaVideo[];
}

// ── Torrentio Types ──

export interface TorrentioStream {
  name: string; // "Torrentio\n{quality}"
  title: string; // Release name + metadata
  infoHash: string;
  fileIdx?: number;
  sources?: string[];
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
  };
}

export interface ParsedStream {
  quality: string;
  title: string;
  seeders: number;
  size: string;
  source: string;
  infoHash: string;
  fileIdx?: number;
  filename?: string;
}

// ── Real-Debrid Types ──

export interface RDAddMagnetResponse {
  id: string;
  uri: string;
}

export interface RDTorrentFile {
  id: number;
  path: string;
  bytes: number;
  selected: number;
}

export interface RDTorrentInfo {
  id: string;
  filename: string;
  hash: string;
  bytes: number;
  progress: number;
  status: string;
  files: RDTorrentFile[];
  links: string[];
  speed?: number;
  seeders?: number;
}

export interface RDUnrestrictResponse {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  download: string;
  streamable: number;
}
