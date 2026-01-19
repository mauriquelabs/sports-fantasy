import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Plus, LogOut, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { CreateLeagueDialog } from "@/components/CreateLeagueDialog";
import { JoinLeagueDialog } from "@/components/JoinLeagueDialog";
import { getUserLeagues, generateInviteCode, type League } from "@/lib/leagues";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadLeagues();
  }, [user]);

  const loadLeagues = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userLeagues = await getUserLeagues();
      setLeagues(userLeagues);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load leagues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    loadLeagues(); // Refresh to show the new league
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
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No teams yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Drafts</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No active drafts</p>
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
                          {league.current_teams} / {league.max_teams}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium capitalize">{league.draft_status}</span>
                      </div>
                      {league.invite_code && (
                        <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div>
                            <p className="text-xs text-muted-foreground">Invite Code</p>
                            <p className="font-mono font-semibold">{league.invite_code}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateInviteCode(league.id)}
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
                          onClick={() => handleGenerateInviteCode(league.id)}
                        >
                          Generate Invite Code
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/draft?league=${league.id}`)}
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
