import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Clock, Users, Bot } from "lucide-react";

interface Team {
  id: string;
  name: string;
  owner_id?: string;
  is_bot?: boolean;
}

interface DraftOrderTableProps {
  teams: Team[];
  draftOrder: string[]; // Array of team names in draft order
  currentPick: number; // 0-indexed current pick number
  currentRound: number;
  totalRounds: number;
  myTeamName?: string | null;
  userId?: string;
  picks?: Array<{
    pick_number: number;
    round: number;
    team_id?: string;
    team_name?: string;
    player_name?: string;
    playerName?: string;
  }>;
  compact?: boolean; // Compact mode for sidebar display
}

interface PickSlot {
  pickNumber: number; // 1-indexed for display
  round: number;
  teamName: string;
  teamId?: string;
  isCurrentPick: boolean;
  isPicked: boolean;
  playerName?: string;
  isMyTeam: boolean;
  isBot: boolean;
}

export function DraftOrderTable({
  teams,
  draftOrder,
  currentPick,
  currentRound,
  totalRounds,
  myTeamName,
  userId,
  picks = [],
  compact = false,
}: DraftOrderTableProps) {
  // Generate full draft schedule using snake draft logic
  const draftSchedule = useMemo(() => {
    const schedule: PickSlot[] = [];
    const numTeams = draftOrder.length;

    if (numTeams === 0) return schedule;

    for (let round = 1; round <= totalRounds; round++) {
      // Snake draft: odd rounds go forward, even rounds go backward
      const isReversed = round % 2 === 0;
      const roundOrder = isReversed ? [...draftOrder].reverse() : draftOrder;

      for (let i = 0; i < numTeams; i++) {
        const pickNumber = (round - 1) * numTeams + i + 1; // 1-indexed
        const teamName = roundOrder[i];
        const team = teams.find((t) => t.name === teamName);
        
        // Find if this pick has been made
        const pick = picks.find((p) => p.pick_number === pickNumber);
        const playerName = pick?.player_name || pick?.playerName;
        
        const isMyTeam = userId 
          ? team?.owner_id === userId
          : teamName === myTeamName;

        schedule.push({
          pickNumber,
          round,
          teamName,
          teamId: team?.id,
          isCurrentPick: pickNumber === currentPick + 1, // currentPick is 0-indexed
          isPicked: !!pick,
          playerName,
          isMyTeam,
          isBot: team?.is_bot ?? false,
        });
      }
    }

    return schedule;
  }, [teams, draftOrder, currentPick, totalRounds, myTeamName, userId, picks]);

  // Find next pick for user's team
  const myNextPick = useMemo(() => {
    return draftSchedule.find(
      (slot) => slot.isMyTeam && !slot.isPicked && slot.pickNumber > currentPick
    );
  }, [draftSchedule, currentPick]);

  // Group schedule by rounds for display
  const roundsData = useMemo(() => {
    const rounds: PickSlot[][] = [];
    for (let round = 1; round <= totalRounds; round++) {
      rounds.push(draftSchedule.filter((slot) => slot.round === round));
    }
    return rounds;
  }, [draftSchedule, totalRounds]);

  // Calculate picks until my turn
  const picksUntilMyTurn = myNextPick
    ? myNextPick.pickNumber - (currentPick + 1)
    : null;

  // For compact mode, show only upcoming picks (current + next few)
  const visibleSchedule = useMemo(() => {
    if (!compact) return draftSchedule;
    
    // Show current pick and next 8 picks (or all remaining)
    const currentIndex = draftSchedule.findIndex(
      (slot) => slot.pickNumber === currentPick + 1
    );
    const startIndex = Math.max(0, currentIndex);
    return draftSchedule.slice(startIndex, startIndex + 9);
  }, [draftSchedule, currentPick, compact]);

  return (
    <Card className={compact ? "h-fit" : ""}>
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className={compact ? "text-base" : "text-lg"}>Draft Order</CardTitle>
          {myNextPick && picksUntilMyTurn !== null && picksUntilMyTurn > 0 && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {picksUntilMyTurn === 1
                ? "You're up next!"
                : `${picksUntilMyTurn} picks`}
            </Badge>
          )}
          {picksUntilMyTurn === 0 && (
            <Badge className="bg-green-500 hover:bg-green-600 text-xs">
              <ArrowRight className="h-3 w-3 mr-1" />
              Your turn!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        {/* Compact mode: Simple list view */}
        {compact ? (
          <div className="space-y-1">
            {visibleSchedule.map((slot) => (
              <div
                key={slot.pickNumber}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-sm",
                  slot.isCurrentPick && "bg-yellow-100 border border-yellow-300",
                  slot.isMyTeam && !slot.isCurrentPick && "bg-blue-50",
                  slot.isPicked && "opacity-50"
                )}
              >
                <span className="font-mono text-xs text-gray-500 w-6">
                  {slot.pickNumber}
                </span>
                <span
                  className={cn(
                    "flex-1 truncate",
                    slot.isMyTeam && "font-medium text-blue-600",
                    slot.isCurrentPick && "font-medium"
                  )}
                >
                  {slot.teamName}
                </span>
                {slot.isMyTeam && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    You
                  </Badge>
                )}
                {slot.isBot && (
                  <Bot className="h-3 w-3 text-gray-400" />
                )}
                {slot.isCurrentPick && (
                  <Clock className="h-3 w-3 text-yellow-600 animate-pulse" />
                )}
                {slot.isPicked && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </div>
            ))}
            {draftSchedule.length > visibleSchedule.length && (
              <p className="text-xs text-gray-400 text-center pt-2">
                + {draftSchedule.length - visibleSchedule.length} more picks
              </p>
            )}
          </div>
        ) : (
          /* Full mode: Table view */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Pick</TableHead>
                  <TableHead className="w-16 text-center">Round</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Selection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftSchedule.map((slot) => (
                  <TableRow
                    key={slot.pickNumber}
                    className={cn(
                      slot.isCurrentPick && "bg-yellow-50 border-l-4 border-l-yellow-500",
                      slot.isMyTeam && !slot.isCurrentPick && "bg-blue-50/50",
                      slot.isPicked && "opacity-60"
                    )}
                  >
                    <TableCell className="text-center font-mono text-sm">
                      {slot.pickNumber}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        R{slot.round}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {slot.isBot ? (
                          <Bot className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Users className="h-4 w-4 text-gray-400" />
                        )}
                        <span
                          className={cn(
                            "font-medium",
                            slot.isMyTeam && "text-blue-600"
                          )}
                        >
                          {slot.teamName}
                        </span>
                        {slot.isMyTeam && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                        {slot.isBot && (
                          <Badge variant="outline" className="text-xs">
                            Bot
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {slot.isPicked ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {slot.playerName}
                        </div>
                      ) : slot.isCurrentPick ? (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">
                          <Clock className="h-3 w-3 mr-1 animate-pulse" />
                          On the clock
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary section showing draft order pattern */}
        <div className={cn("mt-4 pt-4 border-t", compact && "mt-3 pt-3")}>
          <div className="text-xs text-gray-500 mb-2">
            Snake Draft Order
          </div>
          <div className="flex flex-wrap gap-1">
            {draftOrder.map((teamName, index) => {
              const team = teams.find((t) => t.name === teamName);
              const isUserTeam = userId
                ? team?.owner_id === userId
                : teamName === myTeamName;
              return (
                <Badge
                  key={teamName}
                  variant={isUserTeam ? "default" : "outline"}
                  className={cn(
                    "text-xs",
                    isUserTeam && "bg-blue-500 hover:bg-blue-600"
                  )}
                >
                  {index + 1}. {compact ? teamName.substring(0, 8) + (teamName.length > 8 ? "…" : "") : teamName}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
