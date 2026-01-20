import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Trophy,
  Users,
  ArrowLeft,
  Bot,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getMockDraftState,
  getMockDraftAvailablePlayers,
  makeMockDraftPick,
  makeMockDraftBotPick,
  isNextPickBot,
  type MockDraftState,
} from "@/lib/mockDraft";
import { getLeague, type League } from "@/lib/leagues";
import { DraftOrderTable } from "@/components/DraftOrderTable";
import {
  AvailablePlayersTable,
  type Player as AvailablePlayer,
} from "@/components/AvailablePlayersTable";

export default function MockDraftPage() {
  const { mockDraftId } = useParams<{ mockDraftId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [league, setLeague] = useState<League | null>(null);
  const [draftState, setDraftState] = useState<MockDraftState | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [makingPick, setMakingPick] = useState(false);
  const [botProcessing, setBotProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's team name in this mock draft
  const myTeam = draftState?.teams.find((t) => t.owner_id === user?.id);
  const myTeamName = myTeam?.name;
  const isMyTurn = draftState?.next_team === myTeamName;
  const isDraftComplete = draftState?.status === "completed";

  // Load mock draft data
  const loadDraftData = useCallback(async () => {
    if (!mockDraftId) return;

    try {
      const [state, players] = await Promise.all([
        getMockDraftState(mockDraftId),
        getMockDraftAvailablePlayers(mockDraftId),
      ]);

      setDraftState(state);
      setAvailablePlayers(players);

      // Load league info if not already loaded
      if (!league && state.league_id) {
        const leagueData = await getLeague(state.league_id);
        setLeague(leagueData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load mock draft");
    } finally {
      setLoading(false);
    }
  }, [mockDraftId, league]);

  useEffect(() => {
    loadDraftData();
  }, [loadDraftData]);

  // Process bot picks automatically
  useEffect(() => {
    if (!draftState || draftState.status !== "in_progress" || botProcessing) {
      return;
    }

    const processBotPicks = async () => {
      if (!isNextPickBot(draftState)) {
        return;
      }

      setBotProcessing(true);

      try {
        const result = await makeMockDraftBotPick(mockDraftId!, {
          botPickDelay: 1500,
        });

        if (result.success && result.message) {
          toast({
            title: "Bot Pick",
            description: result.message,
          });
        }

        // Refresh data after bot pick
        await loadDraftData();
      } catch (err) {
        console.error("Bot pick error:", err);
      } finally {
        setBotProcessing(false);
      }
    };

    processBotPicks();
  }, [draftState, botProcessing, mockDraftId, toast, loadDraftData]);

  const handleMakePick = async (playerId: string, playerName: string) => {
    if (!myTeamName || !mockDraftId) return;

    try {
      setMakingPick(true);
      setError(null);

      const result = await makeMockDraftPick(mockDraftId, myTeamName, playerId);

      if (result.success) {
        toast({
          title: "Pick Made!",
          description: result.message,
        });
        await loadDraftData();
      } else {
        throw new Error(result.message || "Failed to make pick");
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to make pick",
        variant: "destructive",
      });
    } finally {
      setMakingPick(false);
    }
  };

  const handleBackToLeague = () => {
    if (league) {
      navigate(`/league/${league.id}`);
    } else {
      navigate("/dashboard");
    }
  };

  // Group picks by team
  const picksByTeam =
    draftState?.picks.reduce((acc, pick) => {
      if (!acc[pick.team_name]) acc[pick.team_name] = [];
      acc[pick.team_name].push(pick);
      return acc;
    }, {} as Record<string, typeof draftState.picks>) || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading mock draft...</p>
        </div>
      </div>
    );
  }

  if (error && !draftState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error Loading Mock Draft
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!draftState) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBackToLeague}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-primary" />
                  <h1 className="text-3xl font-bold text-gray-900">
                    Mock Draft
                  </h1>
                </div>
                <p className="text-gray-600">
                  {league?.name || "Practice Draft"} - Practice against bots
                </p>
              </div>
            </div>
            <Badge
              variant={
                isDraftComplete
                  ? "default"
                  : draftState.status === "in_progress"
                  ? "destructive"
                  : "secondary"
              }
            >
              {isDraftComplete
                ? "Complete"
                : draftState.status === "in_progress"
                ? "In Progress"
                : draftState.status}
            </Badge>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Draft Status Bar */}
        {!isDraftComplete && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-sm text-gray-600">Round</div>
                  <div className="text-2xl font-bold">
                    {draftState.current_round} / {draftState.total_rounds}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Pick</div>
                  <div className="text-2xl font-bold">
                    {draftState.current_pick + 1} / {draftState.total_picks}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">Current Turn</div>
                  <div className="flex items-center gap-2">
                    {draftState.next_team ? (
                      <>
                        <Badge
                          variant={isMyTurn ? "default" : "secondary"}
                          className={cn(
                            isMyTurn && "bg-green-500 hover:bg-green-600",
                            botProcessing && "animate-pulse"
                          )}
                        >
                          {isMyTurn ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : botProcessing ? (
                            <Bot className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {draftState.next_team}
                        </Badge>
                        {isMyTurn ? (
                          <span className="text-sm text-green-600 font-semibold">
                            Your turn!
                          </span>
                        ) : (
                          botProcessing && (
                            <span className="text-sm text-blue-600 font-semibold">
                              Bot is thinking...
                            </span>
                          )
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500">Calculating...</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Draft Complete Banner */}
        {isDraftComplete && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Mock Draft Complete!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Great practice! Review your picks below, then try another mock
                draft or prepare for the real thing.
              </p>
              <Button onClick={handleBackToLeague}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to League
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Available Players - Full width, primary focus (only show if draft not complete) */}
        {!isDraftComplete && (
          <div className="mb-6">
            <AvailablePlayersTable
              players={availablePlayers}
              onDraft={handleMakePick}
              disabled={makingPick || botProcessing}
              isMyTurn={isMyTurn}
            />
          </div>
        )}

        {/* Bottom row: Draft Board (larger) + Draft Order (smaller) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Draft Board - takes 2/3 width */}
          <Card className={isDraftComplete ? "lg:col-span-3" : "lg:col-span-2"}>
            <CardHeader>
              <CardTitle>Draft Board</CardTitle>
              <CardDescription>All picks by team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {draftState.teams.map((team) => {
                  const teamPicks = picksByTeam[team.name] || [];
                  const isUserTeam = team.owner_id === user?.id;

                  return (
                    <div
                      key={team.id}
                      className={cn(
                        "border rounded-lg p-4",
                        isUserTeam && "border-blue-500 bg-blue-50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {team.is_bot ? (
                          <Bot className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                        <span className="font-semibold">{team.name}</span>
                        {isUserTeam && (
                          <Badge variant="secondary">You</Badge>
                        )}
                        {team.is_bot && (
                          <Badge variant="outline" className="text-xs">
                            Bot
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {teamPicks.length === 0 ? (
                          <p className="text-sm text-gray-500">No picks yet</p>
                        ) : (
                          teamPicks
                            .sort((a, b) => a.pick_number - b.pick_number)
                            .map((pick) => (
                              <div
                                key={pick.id}
                                className="text-sm flex items-center gap-2"
                              >
                                <Badge variant="outline" className="text-xs">
                                  R{pick.round} P{pick.pick_number}
                                </Badge>
                                {pick.player_name}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Draft Order - Compact, takes 1/3 width */}
          {!isDraftComplete && draftState.draft_order && draftState.draft_order.length > 0 && (
            <DraftOrderTable
              teams={draftState.teams}
              draftOrder={draftState.draft_order}
              currentPick={draftState.current_pick}
              currentRound={draftState.current_round}
              totalRounds={draftState.total_rounds}
              myTeamName={myTeamName}
              userId={user?.id}
              picks={draftState.picks.map((pick) => ({
                pick_number: pick.pick_number,
                round: pick.round,
                team_name: pick.team_name,
                player_name: pick.player_name,
              }))}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
