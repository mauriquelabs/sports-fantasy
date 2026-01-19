import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  fetchDraftState, 
  registerTeam, 
  startDraft, 
  makePick, 
  getNextTeam,
  subscribeToChanges,
  type DraftData,
  type DraftTeam,
  type DraftPlayer,
  type DraftPick
} from "@/lib/draft";
import { getLeague, type League } from "@/lib/leagues";
import { Users, Play, Trophy, AlertCircle, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type ViewState = "registration" | "waiting" | "draft";

export default function Draft() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const leagueId = searchParams.get("league");
  const [league, setLeague] = useState<League | null>(null);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [teamName, setTeamName] = useState("");
  const [myTeamName, setMyTeamName] = useState<string | null>(null);
  const [nextTeam, setNextTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>("registration");
  const { toast } = useToast();

  // Load league and initial state
  useEffect(() => {
    if (!leagueId) {
      setError("No league specified. Please select a league from the dashboard.");
      return;
    }
    loadLeague();
    loadDraftState();
  }, [leagueId]);

  const loadLeague = async () => {
    if (!leagueId) return;
    try {
      const leagueData = await getLeague(leagueId);
      setLeague(leagueData);
    } catch (err: any) {
      setError(err.message || "Failed to load league");
    }
  };

  // Subscribe to real-time changes
  useEffect(() => {
    if (!draftData) return;

    const unsubscribe = subscribeToChanges((data) => {
      setDraftData(data);
      updateViewState(data);
      updateNextTeam(data);
    });

    return unsubscribe;
  }, [draftData]);

  // Update next team when draft state changes
  useEffect(() => {
    if (draftData?.state?.started) {
      updateNextTeam(draftData);
    }
  }, [draftData?.state?.current_pick, draftData?.state?.current_round]);

  const loadDraftState = async () => {
    if (!leagueId) return;
    try {
      setLoading(true);
      const data = await fetchDraftState(leagueId);
      setDraftData(data);
      updateViewState(data);
      updateNextTeam(data);
    } catch (err: any) {
      setError(err.message || "Failed to load draft state");
      toast({
        title: "Error",
        description: err.message || "Failed to load draft state",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateViewState = (data: DraftData) => {
    if (!data.state) {
      setViewState("registration");
      return;
    }

    if (data.state.started) {
      setViewState("draft");
    } else if (data.teams.length >= 4) {
      setViewState("waiting");
    } else {
      setViewState("registration");
    }
  };

  const updateNextTeam = async (data: DraftData) => {
    if (!data.state?.started) {
      setNextTeam(null);
      return;
    }

    try {
      const next = await getNextTeam();
      setNextTeam(next);
    } catch (err) {
      console.error("Failed to get next team:", err);
    }
  };

  const handleRegisterTeam = async () => {
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }
    if (!leagueId) {
      setError("No league selected");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const team = await registerTeam(teamName.trim(), leagueId);
      setMyTeamName(team.name);
      setTeamName("");
      toast({
        title: "Success",
        description: `Team "${team.name}" registered!`,
      });
      await loadDraftState();
      await loadLeague(); // Refresh league to update team count
    } catch (err: any) {
      const errorMsg = err.message || "Failed to register team";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartDraft = async () => {
    if (!leagueId) {
      setError("No league selected");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await startDraft(leagueId);
      toast({
        title: "Draft Started!",
        description: `Draft order: ${result.order.join(", ")}`,
      });
      await loadDraftState();
      await loadLeague(); // Refresh league to update draft status
    } catch (err: any) {
      const errorMsg = err.message || "Failed to start draft";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMakePick = async (playerName: string) => {
    if (!myTeamName) {
      setError("You must register a team first");
      return;
    }

    if (nextTeam !== myTeamName) {
      setError("It's not your turn!");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await makePick(myTeamName, playerName);
      toast({
        title: "Pick Made!",
        description: result.message,
      });
      // State will update via subscription
    } catch (err: any) {
      const errorMsg = err.message || "Failed to make pick";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !draftData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading draft...</p>
        </div>
      </div>
    );
  }

  if (!draftData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load draft data</AlertDescription>
        </Alert>
      </div>
    );
  }

  const availablePlayers = draftData.players.filter((p) => p.is_available !== false);
  const isMyTurn = nextTeam === myTeamName;
  const isDraftComplete = draftData.state?.started && 
    (draftData.state.current_round > draftData.state.total_rounds ||
     draftData.picks.length >= (draftData.state.max_teams * draftData.state.total_rounds));

  // Helper to get player display name
  const getPlayerName = (player: DraftPlayer): string => {
    if (player.name) return player.name;
    if (player.first_name && player.last_name) return `${player.first_name} ${player.last_name}`;
    return player.first_name || player.last_name || "Unknown";
  };

  // Group picks by team
  const picksByTeam = draftData.picks.reduce((acc, pick) => {
    const team = draftData.teams.find((t) => t.id === pick.team_id);
    if (!team) return acc;
    if (!acc[team.name]) acc[team.name] = [];
    const player = draftData.players.find((p) => p.id === pick.player_id);
    acc[team.name].push({ ...pick, playerName: player ? getPlayerName(player) : "Unknown" });
    return acc;
  }, {} as Record<string, Array<DraftPick & { playerName: string }>>);

  if (!leagueId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No League Selected</CardTitle>
            <CardDescription>
              Please select a league from the dashboard to start a draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {league?.name || "Fantasy Draft"}
              </h1>
              <p className="text-gray-600">
                {league?.description || "Real-time snake draft system"}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Registration View */}
        {viewState === "registration" && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Register Your Team</CardTitle>
              <CardDescription>
                Enter your team name to join the draft (max 4 teams)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Team Name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegisterTeam()}
                  disabled={loading || draftData.teams.length >= 4}
                />
                <Button
                  onClick={handleRegisterTeam}
                  disabled={loading || draftData.teams.length >= 4 || !teamName.trim()}
                >
                  Register
                </Button>
              </div>
              {draftData.teams.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">
                    Registered Teams ({draftData.teams.length}/4):
                  </p>
                  <div className="space-y-1">
                    {draftData.teams.map((team) => (
                      <div
                        key={team.id}
                        className={cn(
                          "flex items-center gap-2 text-sm",
                          team.name === myTeamName && "font-semibold text-blue-600"
                        )}
                      >
                        <Users className="h-4 w-4" />
                        {team.name}
                        {team.name === myTeamName && (
                          <Badge variant="secondary">You</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Waiting Room View */}
        {viewState === "waiting" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Waiting Room</CardTitle>
              <CardDescription>
                All teams registered! Ready to start the draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {draftData.teams.map((team) => (
                  <div
                    key={team.id}
                    className={cn(
                      "p-4 border rounded-lg",
                      team.name === myTeamName && "border-blue-500 bg-blue-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <span className="font-semibold">{team.name}</span>
                      {team.name === myTeamName && (
                        <Badge variant="secondary">You</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleStartDraft}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Draft
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Draft View */}
        {viewState === "draft" && draftData.state && (
          <div className="space-y-6">
            {/* Draft Status Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Round</div>
                    <div className="text-2xl font-bold">
                      {draftData.state.current_round} / {draftData.state.total_rounds}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Pick</div>
                    <div className="text-2xl font-bold">
                      {draftData.state.current_pick + 1} / {draftData.state.max_teams * draftData.state.total_rounds}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-2">Current Turn</div>
                    <div className="flex items-center gap-2">
                      {nextTeam ? (
                        <>
                          <Badge
                            variant={isMyTurn ? "default" : "secondary"}
                            className={cn(
                              isMyTurn && "bg-green-500 hover:bg-green-600"
                            )}
                          >
                            {isMyTurn ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {nextTeam}
                          </Badge>
                          {isMyTurn && (
                            <span className="text-sm text-green-600 font-semibold">
                              Your turn!
                            </span>
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

            {isDraftComplete ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Draft Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    All picks have been made. Check the draft board below.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Available Players */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Available Players</CardTitle>
                    <CardDescription>
                      {availablePlayers.length} players remaining
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availablePlayers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No players available
                        </p>
                      ) : (
                        availablePlayers.map((player) => {
                          const playerName = getPlayerName(player);
                          return (
                            <Button
                              key={player.id}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => handleMakePick(playerName)}
                              disabled={!isMyTurn || loading}
                            >
                              {playerName}
                            </Button>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Draft Board */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Draft Board</CardTitle>
                    <CardDescription>All picks by team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {draftData.teams.map((team) => {
                        const teamPicks = picksByTeam[team.name] || [];
                        return (
                          <div
                            key={team.id}
                            className={cn(
                              "border rounded-lg p-4",
                              team.name === myTeamName && "border-blue-500 bg-blue-50"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="h-4 w-4" />
                              <span className="font-semibold">{team.name}</span>
                              {team.name === myTeamName && (
                                <Badge variant="secondary">You</Badge>
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
                                      {pick.playerName}
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
