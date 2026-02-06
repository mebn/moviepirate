import { List, ActionPanel, Action, Icon, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchMovieStreams, fetchEpisodeStreams, parseStream } from "../lib/torrentio";
import { resolveStream } from "../lib/realdebrid";
import { ParsedStream } from "../lib/types";

interface StreamPickerProps {
  imdbId: string;
  type: "movie" | "series";
  title: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
}

export function StreamPicker({ imdbId, type, title, season, episode, episodeTitle }: StreamPickerProps) {
  const [streams, setStreams] = useState<ParsedStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const raw =
          type === "series" && season !== undefined && episode !== undefined
            ? await fetchEpisodeStreams(imdbId, season, episode)
            : await fetchMovieStreams(imdbId);

        const parsed = raw.map(parseStream);
        // Sort by quality preference, then seeders
        const qualityOrder: Record<string, number> = {
          "4k": 0,
          "2160p": 0,
          "4k HDR": 0,
          "4k DV | HDR": 0,
          "4k DV": 0,
          "1080p": 1,
          "720p": 2,
          "480p": 3,
          BDRip: 4,
          Unknown: 5,
        };
        parsed.sort((a, b) => {
          const qa = qualityOrder[a.quality] ?? 4;
          const qb = qualityOrder[b.quality] ?? 4;
          if (qa !== qb) return qa - qb;
          return b.seeders - a.seeders;
        });
        setStreams(parsed);
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load streams", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [imdbId, type, season, episode]);

  const navTitle =
    type === "series" && episodeTitle
      ? `${title} - S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")} - ${episodeTitle}`
      : title;

  return (
    <List isLoading={isLoading} navigationTitle={navTitle} searchBarPlaceholder="Filter streams...">
      {streams.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Streams Found"
          description="No torrents available for this title."
          icon={Icon.XMarkCircle}
        />
      )}
      {streams.map((stream, idx) => (
        <List.Item
          key={`${stream.infoHash}-${idx}`}
          icon={qualityIcon(stream.quality)}
          title={stream.title}
          subtitle={stream.source}
          accessories={[
            { tag: stream.quality },
            stream.size ? { text: stream.size } : {},
            { text: `${stream.seeders} seeders`, icon: Icon.TwoPeople },
          ]}
          actions={
            <ActionPanel>
              <Action title="Play in VLC" icon={Icon.Play} onAction={() => playStream(stream)} />
              <Action.CopyToClipboard
                title="Copy Magnet Link"
                content={`magnet:?xt=urn:btih:${stream.infoHash}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function qualityIcon(quality: string): Icon {
  if (quality.includes("4k") || quality.includes("2160")) return Icon.Stars;
  if (quality.includes("1080")) return Icon.Star;
  if (quality.includes("720")) return Icon.CircleProgress75;
  return Icon.Circle;
}

async function playStream(stream: ParsedStream) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Resolving via Real-Debrid...",
    message: stream.title,
  });

  try {
    const downloadUrl = await resolveStream(stream.infoHash, stream.fileIdx, stream.filename);

    toast.style = Toast.Style.Animated;
    toast.title = "Opening VLC...";

    await open(downloadUrl, "org.videolan.vlc");

    toast.style = Toast.Style.Success;
    toast.title = "Playing in VLC";
    toast.message = stream.filename ?? stream.title;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to resolve stream";
    toast.message = String(err);
  }
}
