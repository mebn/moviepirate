import { getPreferenceValues } from "@raycast/api";
import { RDAddMagnetResponse, RDTorrentInfo, RDUnrestrictResponse } from "./types";
import { buildMagnet } from "./torrentio";

const BASE_URL = "https://api.real-debrid.com/rest/1.0";

function getApiKey(): string {
  const { realDebridApiKey } = getPreferenceValues<{ realDebridApiKey: string }>();
  return realDebridApiKey;
}

async function rdFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Real-Debrid error ${res.status}: ${text}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function addMagnet(magnet: string): Promise<RDAddMagnetResponse> {
  const body = new URLSearchParams({ magnet });
  return rdFetch<RDAddMagnetResponse>("/torrents/addMagnet", {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

async function getTorrentInfo(id: string): Promise<RDTorrentInfo> {
  return rdFetch<RDTorrentInfo>(`/torrents/info/${id}`);
}

async function selectFiles(id: string, fileIds: string): Promise<void> {
  const body = new URLSearchParams({ files: fileIds });
  await rdFetch<void>(`/torrents/selectFiles/${id}`, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

async function unrestrictLink(link: string): Promise<RDUnrestrictResponse> {
  const body = new URLSearchParams({ link });
  return rdFetch<RDUnrestrictResponse>("/unrestrict/link", {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

async function deleteTorrent(id: string): Promise<void> {
  await rdFetch<void>(`/torrents/delete/${id}`, { method: "DELETE" });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Full pipeline: infoHash → magnet → addMagnet → selectFiles → poll → unrestrict → stream URL
 */
export async function resolveStream(infoHash: string, fileIdx?: number, filename?: string): Promise<string> {
  const magnet = buildMagnet(infoHash, filename);

  // 1. Add magnet
  const { id } = await addMagnet(magnet);

  // 2. Get torrent info to see files
  let info = await getTorrentInfo(id);

  // 3. Select files
  if (info.status === "waiting_files_selection") {
    if (fileIdx !== undefined && info.files.length > 0) {
      // Find the file at the given index (Torrentio fileIdx is 0-based, RD file IDs are 1-based)
      // Try to match by index position among video files, or just select the largest video file
      const videoExtensions = [".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"];
      const videoFiles = info.files.filter((f) => videoExtensions.some((ext) => f.path.toLowerCase().endsWith(ext)));

      if (videoFiles.length > 0 && fileIdx < videoFiles.length) {
        await selectFiles(id, videoFiles[fileIdx].id.toString());
      } else if (videoFiles.length > 0) {
        // Select the largest video file
        const largest = videoFiles.reduce((a, b) => (a.bytes > b.bytes ? a : b));
        await selectFiles(id, largest.id.toString());
      } else {
        await selectFiles(id, "all");
      }
    } else {
      // No fileIdx hint - select the largest video file or all
      const videoExtensions = [".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"];
      const videoFiles = info.files.filter((f) => videoExtensions.some((ext) => f.path.toLowerCase().endsWith(ext)));
      if (videoFiles.length > 0) {
        const largest = videoFiles.reduce((a, b) => (a.bytes > b.bytes ? a : b));
        await selectFiles(id, largest.id.toString());
      } else {
        await selectFiles(id, "all");
      }
    }
  }

  // 4. Poll until downloaded (most cached torrents are instant)
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    info = await getTorrentInfo(id);

    if (info.status === "downloaded") break;
    if (
      info.status === "magnet_error" ||
      info.status === "error" ||
      info.status === "dead" ||
      info.status === "virus"
    ) {
      await deleteTorrent(id).catch(() => {});
      throw new Error(`Real-Debrid torrent failed: ${info.status}`);
    }

    await sleep(1000);
  }

  if (info.status !== "downloaded") {
    throw new Error(`Timed out waiting for Real-Debrid (status: ${info.status})`);
  }

  // 5. Get the first link and unrestrict it
  if (!info.links || info.links.length === 0) {
    throw new Error("No links available from Real-Debrid");
  }

  const unrestricted = await unrestrictLink(info.links[0]);
  return unrestricted.download;
}
