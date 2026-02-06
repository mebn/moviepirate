import { CinemetaMeta, CinemetaVideo, Season } from "./types";

const BASE_URL = "https://v3-cinemeta.strem.io";

export async function fetchPopularMovies(skip = 0): Promise<CinemetaMeta[]> {
  const url = skip > 0 ? `${BASE_URL}/catalog/movie/top/skip=${skip}.json` : `${BASE_URL}/catalog/movie/top.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cinemeta error: ${res.status}`);
  const data = (await res.json()) as { metas: CinemetaMeta[] };
  return data.metas ?? [];
}

export async function fetchPopularSeries(skip = 0): Promise<CinemetaMeta[]> {
  const url = skip > 0 ? `${BASE_URL}/catalog/series/top/skip=${skip}.json` : `${BASE_URL}/catalog/series/top.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cinemeta error: ${res.status}`);
  const data = (await res.json()) as { metas: CinemetaMeta[] };
  return data.metas ?? [];
}

export async function searchMovies(query: string): Promise<CinemetaMeta[]> {
  if (!query.trim()) return [];
  const url = `${BASE_URL}/catalog/movie/top/search=${encodeURIComponent(query)}.json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { metas: CinemetaMeta[] };
  return data.metas ?? [];
}

export async function searchSeries(query: string): Promise<CinemetaMeta[]> {
  if (!query.trim()) return [];
  const url = `${BASE_URL}/catalog/series/top/search=${encodeURIComponent(query)}.json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { metas: CinemetaMeta[] };
  return data.metas ?? [];
}

export async function fetchSeriesMeta(imdbId: string): Promise<CinemetaMeta> {
  const url = `${BASE_URL}/meta/series/${imdbId}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cinemeta meta error: ${res.status}`);
  const data = (await res.json()) as { meta: CinemetaMeta };
  return data.meta;
}

export function groupBySeasons(videos: CinemetaVideo[]): Season[] {
  const map = new Map<number, CinemetaVideo[]>();
  for (const v of videos) {
    if (v.season === 0) continue; // skip specials
    const eps = map.get(v.season) ?? [];
    eps.push(v);
    map.set(v.season, eps);
  }

  const seasons: Season[] = [];
  for (const [number, episodes] of map.entries()) {
    episodes.sort((a, b) => a.number - b.number);
    seasons.push({ number, episodes });
  }
  seasons.sort((a, b) => a.number - b.number);
  return seasons;
}
