import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchSeriesMeta, groupBySeasons } from "../lib/cinemeta";
import { Season } from "../lib/types";
import { EpisodeList } from "./EpisodeList";

interface SeasonListProps {
  imdbId: string;
  title: string;
  poster?: string;
}

export function SeasonList({ imdbId, title, poster }: SeasonListProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState<string>("");
  const [metadata, setMetadata] = useState<{ genres?: string[]; imdbRating?: string; releaseInfo?: string }>({});

  useEffect(() => {
    async function load() {
      try {
        const meta = await fetchSeriesMeta(imdbId);
        setDescription(meta.description ?? "");
        setMetadata({
          genres: meta.genres,
          imdbRating: meta.imdbRating,
          releaseInfo: meta.releaseInfo,
        });
        if (meta.videos) {
          setSeasons(groupBySeasons(meta.videos));
        }
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load series", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [imdbId]);

  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Filter seasons...">
      {/* Series info section */}
      {description && (
        <List.Section title="About">
          <List.Item
            icon={Icon.Info}
            title={title}
            subtitle={description.length > 100 ? description.substring(0, 100) + "..." : description}
            accessories={[
              metadata.imdbRating ? { tag: { value: `IMDb ${metadata.imdbRating}` } } : {},
              metadata.releaseInfo ? { text: metadata.releaseInfo } : {},
            ]}
          />
        </List.Section>
      )}

      {/* Seasons section */}
      <List.Section title="Seasons">
        {seasons.map((season) => (
          <List.Item
            key={season.number}
            icon={Icon.List}
            title={`Season ${season.number}`}
            subtitle={`${season.episodes.length} episode${season.episodes.length !== 1 ? "s" : ""}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Episodes"
                  icon={Icon.ArrowRight}
                  target={<EpisodeList imdbId={imdbId} seriesTitle={title} season={season} poster={poster} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {seasons.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Seasons Found"
          description="Could not find season data for this series."
          icon={Icon.XMarkCircle}
        />
      )}
    </List>
  );
}
