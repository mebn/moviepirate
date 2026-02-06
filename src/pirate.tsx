import { Grid, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState, useRef, useCallback } from "react";
import { fetchPopularMovies, fetchPopularSeries, searchMovies, searchSeries } from "./lib/cinemeta";
import { CinemetaMeta } from "./lib/types";
import { StreamPicker } from "./components/StreamPicker";
import { SeasonList } from "./components/SeasonList";

export default function Command() {
  const [movies, setMovies] = useState<CinemetaMeta[]>([]);
  const [series, setSeries] = useState<CinemetaMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load popular content on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [m, s] = await Promise.all([fetchPopularMovies(), fetchPopularSeries()]);
        setMovies(m);
        setSeries(s);
      } catch {
        // silently fail, grid will be empty
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Debounced search
  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!text.trim()) {
      // Reload popular when search is cleared
      setIsLoading(true);
      Promise.all([fetchPopularMovies(), fetchPopularSeries()])
        .then(([m, s]) => {
          setMovies(m);
          setSeries(s);
        })
        .finally(() => setIsLoading(false));
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [m, s] = await Promise.all([searchMovies(text), searchSeries(text)]);
        setMovies(m);
        setSeries(s);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }, 400);
  }, []);

  return (
    <Grid
      columns={5}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      searchBarPlaceholder="Search movies & TV shows..."
      onSearchTextChange={handleSearch}
      throttle
    >
      {/* Movies Section */}
      {movies.length > 0 && (
        <Grid.Section title={searchText ? "Movies" : "Popular Movies"} subtitle={`${movies.length} titles`}>
          {movies.map((item) => (
            <Grid.Item
              key={item.id}
              content={item.poster ?? ""}
              title={item.name}
              subtitle={formatSubtitle(item)}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Find Streams"
                    icon={Icon.MagnifyingGlass}
                    target={<StreamPicker imdbId={item.id} type="movie" title={item.name} />}
                  />
                  <Action.OpenInBrowser
                    title="View on IMDb"
                    url={`https://www.imdb.com/title/${item.id}`}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}

      {/* Series Section */}
      {series.length > 0 && (
        <Grid.Section title={searchText ? "TV Shows" : "Popular TV Shows"} subtitle={`${series.length} titles`}>
          {series.map((item) => (
            <Grid.Item
              key={item.id}
              content={item.poster ?? ""}
              title={item.name}
              subtitle={formatSubtitle(item)}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Seasons"
                    icon={Icon.List}
                    target={<SeasonList imdbId={item.id} title={item.name} poster={item.poster} />}
                  />
                  <Action.OpenInBrowser
                    title="View on IMDb"
                    url={`https://www.imdb.com/title/${item.id}`}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}

function formatSubtitle(item: CinemetaMeta): string {
  const parts: string[] = [];
  if (item.releaseInfo) parts.push(item.releaseInfo);
  if (item.imdbRating) parts.push(`IMDb ${item.imdbRating}`);
  return parts.join(" | ");
}
