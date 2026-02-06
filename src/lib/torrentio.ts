import { TorrentioStream, ParsedStream } from "./types";

const BASE_URL = "https://torrentio.strem.fun";

export async function fetchMovieStreams(imdbId: string): Promise<TorrentioStream[]> {
  const url = `${BASE_URL}/stream/movie/${imdbId}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Torrentio error: ${res.status}`);
  const data = (await res.json()) as { streams: TorrentioStream[] };
  return data.streams ?? [];
}

export async function fetchEpisodeStreams(imdbId: string, season: number, episode: number): Promise<TorrentioStream[]> {
  const url = `${BASE_URL}/stream/series/${imdbId}:${season}:${episode}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Torrentio error: ${res.status}`);
  const data = (await res.json()) as { streams: TorrentioStream[] };
  return data.streams ?? [];
}

export function parseStream(stream: TorrentioStream): ParsedStream {
  // Parse quality from name: "Torrentio\n1080p" → "1080p"
  const nameParts = stream.name.split("\n");
  const quality = nameParts.length > 1 ? nameParts[1].trim() : "Unknown";

  // Parse title: multi-line with release name + metadata line
  const titleLines = stream.title.split("\n");
  const title = titleLines[0].trim();

  // Parse metadata from last line: "👤 100 💾 6.91 GB ⚙️ YTS"
  const metaLine = titleLines[titleLines.length - 1];

  let seeders = 0;
  const seederMatch = metaLine.match(/👤\s*(\d+)/);
  if (seederMatch) seeders = parseInt(seederMatch[1], 10);

  let size = "";
  const sizeMatch = metaLine.match(/💾\s*([\d.]+\s*[KMGT]?B)/i);
  if (sizeMatch) size = sizeMatch[1];

  let source = "";
  const sourceMatch = metaLine.match(/⚙️\s*(.+?)$/);
  if (sourceMatch) source = sourceMatch[1].trim();

  return {
    quality,
    title,
    seeders,
    size,
    source,
    infoHash: stream.infoHash,
    fileIdx: stream.fileIdx,
    filename: stream.behaviorHints?.filename,
  };
}

export function buildMagnet(infoHash: string, filename?: string): string {
  let magnet = `magnet:?xt=urn:btih:${infoHash}`;
  if (filename) {
    magnet += `&dn=${encodeURIComponent(filename)}`;
  }
  // Add common trackers for better peer discovery
  const trackers = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.stealth.si:80/announce",
    "udp://tracker.torrent.eu.org:451/announce",
    "udp://open.demonii.com:1337/announce",
    "udp://explodie.org:6969/announce",
    "udp://tracker.openbittorrent.com:6969/announce",
  ];
  for (const tr of trackers) {
    magnet += `&tr=${encodeURIComponent(tr)}`;
  }
  return magnet;
}
