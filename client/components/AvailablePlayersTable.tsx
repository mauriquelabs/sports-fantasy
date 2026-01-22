import { useRef, useState, useMemo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface Player {
  id: string;
  name: string;
  position?: string;
  stats?: {
    avg: number;
    hr: number;
    rbi: number;
  };
}

interface AvailablePlayersTableProps {
  players: Player[];
  onDraft: (playerId: string, playerName: string) => void;
  disabled?: boolean;
  isMyTurn?: boolean;
}

// Row height for virtualization
const ROW_HEIGHT = 48;
const ROW_HEIGHT_MOBILE = 80;
// Container height for the scrollable area
const CONTAINER_HEIGHT = 450;
// Debounce delay for search input
const SEARCH_DEBOUNCE_MS = 300;

export function AvailablePlayersTable({
  players,
  onDraft,
  disabled = false,
  isMyTurn = false,
}: AvailablePlayersTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const rowHeight = isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Extract unique positions from players for dynamic filter buttons
  const positions = useMemo(() => {
    const posSet = new Set<string>();
    players.forEach((p) => {
      if (p.position) {
        posSet.add(p.position);
      }
    });
    return Array.from(posSet).sort();
  }, [players]);

  // Filter players based on search and position
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const matchesPosition =
        !positionFilter || p.position === positionFilter;
      return matchesSearch && matchesPosition;
    });
  }, [players, debouncedSearch, positionFilter]);

  // Set up virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredPlayers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5, // Render 5 extra items above/below visible area for smoother scrolling
  });

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setPositionFilter(null);
  };

  const hasFilters = searchInput || positionFilter;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Players</CardTitle>
        <CardDescription>
          {filteredPlayers.length === players.length
            ? `${players.length} players remaining`
            : `${filteredPlayers.length} of ${players.length} players shown`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="space-y-3 mb-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search players by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Position Filter Buttons */}
          {positions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={positionFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setPositionFilter(null)}
              >
                All
              </Button>
              {positions.map((pos) => (
                <Button
                  key={pos}
                  variant={positionFilter === pos ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setPositionFilter(positionFilter === pos ? null : pos)
                  }
                >
                  {pos}
                </Button>
              ))}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Table Header */}
        <div className="border-b">
          {isMobile ? (
            <div className="flex items-center py-2 px-2 text-sm font-medium text-gray-600">
              <div className="flex-1 min-w-0">Player</div>
              <div className="w-16 text-right">Action</div>
            </div>
          ) : (
            <div className="flex items-center py-2 px-2 text-sm font-medium text-gray-600">
              <div className="flex-1 min-w-0">Player</div>
              <div className="w-16 text-center">Pos</div>
              <div className="w-14 text-center">AVG</div>
              <div className="w-12 text-center">HR</div>
              <div className="w-12 text-center">RBI</div>
              <div className="w-20 text-right">Action</div>
            </div>
          )}
        </div>

        {/* Virtualized Table Body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: CONTAINER_HEIGHT }}
        >
          {filteredPlayers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              {players.length === 0
                ? "No players available"
                : "No players match your filters"}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const player = filteredPlayers[virtualRow.index];
                const stats = player.stats || { avg: 0, hr: 0, rbi: 0 };
                
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "absolute top-0 left-0 w-full px-2 border-b hover:bg-gray-50",
                      virtualRow.index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    )}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {isMobile ? (
                      <div className="flex flex-col justify-center h-full py-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm leading-tight">{player.name}</div>
                            {player.position && (
                              <Badge variant="secondary" className="text-xs mt-0.5">
                                {player.position}
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => onDraft(player.id, player.name)}
                            disabled={disabled || !isMyTurn}
                            className="ml-2 shrink-0"
                          >
                            Draft
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <span>AVG: <span className="font-medium">{stats.avg.toFixed(3)}</span></span>
                          <span>HR: <span className="font-medium">{stats.hr}</span></span>
                          <span>RBI: <span className="font-medium">{stats.rbi}</span></span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center h-full">
                        <div className="flex-1 min-w-0 truncate">
                          <span className="font-medium">{player.name}</span>
                        </div>
                        <div className="w-16 text-center">
                          {player.position && (
                            <Badge variant="secondary" className="text-xs">
                              {player.position}
                            </Badge>
                          )}
                        </div>
                        <div className="w-14 text-center text-sm text-gray-600">
                          {stats.avg.toFixed(3)}
                        </div>
                        <div className="w-12 text-center text-sm text-gray-600">
                          {stats.hr}
                        </div>
                        <div className="w-12 text-center text-sm text-gray-600">
                          {stats.rbi}
                        </div>
                        <div className="w-20 text-right">
                          <Button
                            size="sm"
                            onClick={() => onDraft(player.id, player.name)}
                            disabled={disabled || !isMyTurn}
                          >
                            Draft
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        {filteredPlayers.length > 0 && (
          <div className="pt-3 border-t mt-2 text-xs text-gray-500 text-center">
            Showing {Math.min(Math.ceil(CONTAINER_HEIGHT / rowHeight), filteredPlayers.length)} of{" "}
            {filteredPlayers.length} players • Scroll to see more
          </div>
        )}
      </CardContent>
    </Card>
  );
}
