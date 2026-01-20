import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Plus, LogOut, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { CreateLeagueDialog } from "@/components/CreateLeagueDialog";
import { JoinLeagueDialog } from "@/components/JoinLeagueDialog";
import { getUserLeagues, getUserTeams, generateInviteCode, type League, type Team } from "@/lib/leagues";
import { getActiveMockDraftsCount } from "@/lib/mockDraft";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// League with computed team count
interface LeagueWithTeamCount extends League {
  team_count: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leagues, setLeagues] = useState<LeagueWithTeamCount[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeMockDrafts, setActiveMockDrafts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [userLeagues, userTeams, mockDraftsCount] = await Promise.all([
        getUserLeagues(),
        getUserTeams(),
        getActiveMockDraftsCount(),
      ]);
      
      setActiveMockDrafts(mockDraftsCount);
      
      // Filter out mock leagues from the old system
      const realLeagues = userLeagues.filter(l => !l.is_mock);
      
      // Fetch team counts for each league
      const leagueIds = realLeagues.map(l => l.id);
      const { data: teamCounts } = await supabase
        .from("teams")
        .select("league_id")
        .in("league_id", leagueIds)
        .or("is_bot.is.null,is_bot.eq.false");
      
      // Count teams per league
      const countMap = new Map<string, number>();
      teamCounts?.forEach(t => {
        countMap.set(t.league_id, (countMap.get(t.league_id) || 0) + 1);
      });
      
      // Add team counts to leagues
      const leaguesWithCounts: LeagueWithTeamCount[] = realLeagues.map(l => ({
        ...l,
        team_count: countMap.get(l.id) || 0,
      }));
      
      setLeagues(leaguesWithCounts);
      setTeams(userTeams);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLeagues = async () => {
    if (!user) return;
    try {
      const userLeagues = await getUserLeagues();
      const realLeagues = userLeagues.filter(l => !l.is_mock);
      
      // Fetch team counts
      const leagueIds = realLeagues.map(l => l.id);
      const { data: teamCounts } = await supabase
        .from("teams")
        .select("league_id")
        .in("league_id", leagueIds)
        .or("is_bot.is.null,is_bot.eq.false");
      
      const countMap = new Map<string, number>();
      teamCounts?.forEach(t => {
        countMap.set(t.league_id, (countMap.get(t.league_id) || 0) + 1);
      });
      
      const leaguesWithCounts: LeagueWithTeamCount[] = realLeagues.map(l => ({
        ...l,
        team_count: countMap.get(l.id) || 0,
      }));
      
      setLeagues(leaguesWithCounts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load leagues",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleLeagueCreated = (league: League) => {
    setLeagues([league, ...leagues]);
  };

  const handleLeagueJoined = (league: League) => {
    loadData(); // Refresh to show the new league and team
  };

  const handleGenerateInviteCode = async (leagueId: string) => {
    try {
      const code = await generateInviteCode(leagueId);
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: "Invite code copied!",
        description: `Invite code ${code} has been copied to clipboard.`,
      });
      setTimeout(() => setCopiedCode(null), 3000);
      loadLeagues(); // Refresh to show updated code
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-gray-900">YourLeague</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.user_metadata?.full_name || user?.email}!
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-2">Manage your leagues and teams</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Leagues</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leagues.length}</div>
              <p className="text-xs text-muted-foreground">
                {leagues.length === 0 ? "No leagues yet" : `${leagues.length} league${leagues.length !== 1 ? 's' : ''}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams.length}</div>
              <p className="text-xs text-muted-foreground">
                {teams.length === 0 ? "No teams yet" : `${teams.length} team${teams.length !== 1 ? 's' : ''}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Drafts</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {(() => {
                const leagueDrafts = leagues.filter((l) => l.draft_status === "in_progress").length;
                const totalActive = leagueDrafts + activeMockDrafts;
                return (
                  <>
                    <div className="text-2xl font-bold">{totalActive}</div>
                    <p className="text-xs text-muted-foreground">
                      {totalActive === 0
                        ? "No active drafts"
                        : `${leagueDrafts > 0 ? `${leagueDrafts} league` : ''}${leagueDrafts > 0 && activeMockDrafts > 0 ? ', ' : ''}${activeMockDrafts > 0 ? `${activeMockDrafts} mock` : ''}`}
                    </p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create a League</CardTitle>
              <CardDescription>
                Start a new fantasy league and invite your friends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create League
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join a League</CardTitle>
              <CardDescription>
                Enter an invite code to join an existing league
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setJoinDialogOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Join League
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* My Leagues Section */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">My Leagues</h3>
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 py-8">Loading leagues...</p>
              </CardContent>
            </Card>
          ) : leagues.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 py-8">
                  You haven't joined any leagues yet. Create or join a league to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leagues.map((league) => (
                <Card key={league.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {league.name}
                      {league.commissioner_id === user?.id && (
                        <Badge variant="secondary">Commissioner</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {league.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Teams:</span>
                        <span className="font-medium">
                          {league.team_count} / {league.max_teams}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge 
                          variant={
                            league.draft_status === "completed" 
                              ? "default" 
                              : league.draft_status === "in_progress" 
                              ? "destructive" 
                              : "outline"
                          }
                        >
                          {league.draft_status === "pending" 
                            ? "Draft Pending" 
                            : league.draft_status === "in_progress" 
                            ? "Drafting" 
                            : "Complete"}
                        </Badge>
                      </div>
                      {league.invite_code && league.commissioner_id === user?.id && (
                        <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div>
                            <p className="text-xs text-muted-foreground">Invite Code</p>
                            <p className="font-mono font-semibold">{league.invite_code}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateInviteCode(league.id);
                            }}
                            className="h-8"
                          >
                            {copiedCode === league.invite_code ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                      )}
                      {!league.invite_code && league.commissioner_id === user?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateInviteCode(league.id);
                          }}
                        >
                          Generate Invite Code
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => navigate(`/league/${league.id}`)}
                    >
                      View League
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <CreateLeagueDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onLeagueCreated={handleLeagueCreated}
        />
        <JoinLeagueDialog
          open={joinDialogOpen}
          onOpenChange={setJoinDialogOpen}
          onLeagueJoined={handleLeagueJoined}
        />
      </main>
    </div>
  );
}
