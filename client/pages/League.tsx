import { useEffect, useState } from "react";
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
  Play,
  Bot,
  Clock,
  AlertCircle,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getLeague, generateInviteCode, type League } from "@/lib/leagues";
import {
  getLeagueMockDrafts,
  type MockDraft,
} from "@/lib/mockDraft";
import { StartMockDraftDialog } from "@/components/StartMockDraftDialog";
import { supabase } from "@/lib/supabase";

interface Team {
  id: string;
  name: string;
  owner_id: string;
  is_bot: boolean;
}

export default function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [mockDrafts, setMockDrafts] = useState<MockDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mockDraftDialogOpen, setMockDraftDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isCommissioner = user && league?.commissioner_id === user.id;
  const userTeam = teams.find((t) => t.owner_id === user?.id);
  const canStartDraft =
    isCommissioner &&
    league?.draft_status === "pending" &&
    teams.length === league?.max_teams;

  useEffect(() => {
    if (leagueId) {
      loadLeagueData();
    }
  }, [leagueId]);

  const loadLeagueData = async () => {
    if (!leagueId) return;

    try {
      setLoading(true);
      setError(null);

      const [leagueData, teamsData, mockDraftsData] = await Promise.all([
        getLeague(leagueId),
        supabase
          .from("teams")
          .select("id, name, owner_id, is_bot")
          .eq("league_id", leagueId),
        getLeagueMockDrafts(leagueId),
      ]);

      setLeague(leagueData);
      setTeams(teamsData.data || []);
      setMockDrafts(mockDraftsData);
    } catch (err: any) {
      setError(err.message || "Failed to load league");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!league?.invite_code) return;

    await navigator.clipboard.writeText(league.invite_code);
    setCopiedCode(true);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleGenerateInviteCode = async () => {
    if (!leagueId) return;

    try {
      const code = await generateInviteCode(leagueId);
      await navigator.clipboard.writeText(code);
      toast({
        title: "Invite code generated!",
        description: `Code ${code} copied to clipboard`,
      });
      loadLeagueData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to generate invite code",
        variant: "destructive",
      });
    }
  };

  const handleStartDraft = () => {
    if (!leagueId) return;
    navigate(`/draft?league=${leagueId}`);
  };

  const handleMockDraftCreated = (mockDraftId: string) => {
    navigate(`/mock-draft/${mockDraftId}`);
  };

  const handleContinueMockDraft = (mockDraftId: string) => {
    navigate(`/mock-draft/${mockDraftId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading league...</p>
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error Loading League
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error || "League not found"}</p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {league.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {league.description || "Fantasy League"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCommissioner && (
                <Badge variant="secondary">Commissioner</Badge>
              )}
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
                  ? "Draft In Progress"
                  : "Draft Complete"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - League Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* League Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  League Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {teams.length}
                    </div>
                    <div className="text-sm text-gray-600">/ {league.max_teams} Teams</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold capitalize">
                      {league.draft_status}
                    </div>
                    <div className="text-sm text-gray-600">Draft Status</div>
                  </div>
                  {league.draft_date && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg col-span-2">
                      <div className="text-lg font-bold">
                        {new Date(league.draft_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">Draft Date</div>
                    </div>
                  )}
                </div>

                {/* Draft Actions */}
                <div className="mt-6 space-y-3">
                  {league.draft_status === "in_progress" && (
                    <Button onClick={handleStartDraft} className="w-full">
                      <Play className="mr-2 h-4 w-4" />
                      Continue Draft
                    </Button>
                  )}

                  {canStartDraft && (
                    <Button onClick={handleStartDraft} className="w-full">
                      <Play className="mr-2 h-4 w-4" />
                      Start Draft
                    </Button>
                  )}

                  {league.draft_status === "pending" &&
                    teams.length < league.max_teams && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Waiting for {league.max_teams - teams.length}{" "}
                          more team{league.max_teams - teams.length !== 1 ? "s" : ""} to join
                          before the draft can start.
                        </AlertDescription>
                      </Alert>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Teams Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Teams ({teams.length}/{league.max_teams})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No teams have joined yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className={`p-3 rounded-lg border ${
                          team.owner_id === user?.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{team.name}</span>
                          {team.owner_id === user?.id && (
                            <Badge variant="secondary">Your Team</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mock Drafts Section */}
            {userTeam && league.draft_status === "pending" && (
              <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Mock Drafts
                  </CardTitle>
                  <CardDescription>
                    Practice your draft strategy against bot opponents while
                    waiting for the real draft
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => setMockDraftDialogOpen(true)}
                    className="w-full"
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    Start New Mock Draft
                  </Button>

                  {/* Previous Mock Drafts */}
                  {mockDrafts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        Your Mock Drafts
                      </h4>
                      {mockDrafts.slice(0, 5).map((mockDraft) => (
                        <div
                          key={mockDraft.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                mockDraft.status === "completed"
                                  ? "default"
                                  : mockDraft.status === "in_progress"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {mockDraft.status === "in_progress"
                                ? "In Progress"
                                : mockDraft.status === "completed"
                                ? "Completed"
                                : "Cancelled"}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(
                                mockDraft.created_at
                              ).toLocaleDateString()}{" "}
                              - Round {mockDraft.current_round}/
                              {mockDraft.total_rounds}
                            </span>
                          </div>
                          {mockDraft.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleContinueMockDraft(mockDraft.id)
                              }
                            >
                              Continue
                            </Button>
                          )}
                          {mockDraft.status === "completed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleContinueMockDraft(mockDraft.id)
                              }
                            >
                              View Results
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Invite & Info */}
          <div className="space-y-6">
            {/* Invite Card */}
            {isCommissioner && teams.length < league.max_teams && (
              <Card>
                <CardHeader>
                  <CardTitle>Invite Players</CardTitle>
                  <CardDescription>
                    Share this code with friends to join your league
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {league.invite_code ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                        <code className="flex-1 text-lg font-mono font-bold text-center">
                          {league.invite_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyInviteCode}
                        >
                          {copiedCode ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleGenerateInviteCode}
                      >
                        Generate New Code
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleGenerateInviteCode}
                      className="w-full"
                    >
                      Generate Invite Code
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Your Team Card */}
            {userTeam && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-bold text-lg">{userTeam.name}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Join Team Card - if user doesn't have a team */}
            {!userTeam && teams.length < league.max_teams && (
              <Card>
                <CardHeader>
                  <CardTitle>Join This League</CardTitle>
                  <CardDescription>
                    Create your team to participate in this league
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => navigate(`/draft?league=${leagueId}`)}
                    className="w-full"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Register Team
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Mock Draft Dialog */}
      {leagueId && userTeam && (
        <StartMockDraftDialog
          open={mockDraftDialogOpen}
          onOpenChange={setMockDraftDialogOpen}
          leagueId={leagueId}
          userTeamName={userTeam.name}
          onMockDraftCreated={handleMockDraftCreated}
        />
      )}
    </div>
  );
}
