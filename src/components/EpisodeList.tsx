import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Season } from "../lib/types";
import { StreamPicker } from "./StreamPicker";

interface EpisodeListProps {
  imdbId: string;
  seriesTitle: string;
  season: Season;
  poster?: string;
}

export function EpisodeList({ imdbId, seriesTitle, season, poster }: EpisodeListProps) {
  return (
    <List navigationTitle={`${seriesTitle} - Season ${season.number}`} searchBarPlaceholder="Filter episodes...">
      {season.episodes.map((ep) => {
        const epNum = String(ep.number).padStart(2, "0");
        const airDate = ep.released ? new Date(ep.released).toLocaleDateString() : undefined;

        return (
          <List.Item
            key={ep.id}
            icon={Icon.Play}
            title={`E${epNum} - ${ep.name || "Untitled"}`}
            subtitle={
              ep.overview ? (ep.overview.length > 80 ? ep.overview.substring(0, 80) + "..." : ep.overview) : undefined
            }
            accessories={[ep.rating ? { tag: { value: `${ep.rating}` } } : {}, airDate ? { text: airDate } : {}]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Find Streams"
                  icon={Icon.MagnifyingGlass}
                  target={
                    <StreamPicker
                      imdbId={imdbId}
                      type="series"
                      title={seriesTitle}
                      season={season.number}
                      episode={ep.number}
                      episodeTitle={ep.name}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}

      {season.episodes.length === 0 && (
        <List.EmptyView title="No Episodes" description="No episodes found for this season." icon={Icon.XMarkCircle} />
      )}
    </List>
  );
}
