import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinLeagueByCode, getLeagueByInviteCode, type League } from "@/lib/leagues";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface JoinLeagueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeagueJoined?: (league: League) => void;
}

interface JoinFormData {
  inviteCode: string;
  teamName: string;
}

export function JoinLeagueDialog({
  open,
  onOpenChange,
  onLeagueJoined,
}: JoinLeagueDialogProps) {
  const [loading, setLoading] = useState(false);
  const [leaguePreview, setLeaguePreview] = useState<League | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<JoinFormData>({
    defaultValues: {
      inviteCode: "",
      teamName: "",
    },
  });

  const inviteCode = watch("inviteCode");

  // Preview league when invite code is entered
  useEffect(() => {
    const previewLeague = async () => {
      if (inviteCode && inviteCode.length === 6) {
        try {
          const league = await getLeagueByInviteCode(inviteCode.toUpperCase());
          setLeaguePreview(league);
        } catch (error) {
          setLeaguePreview(null);
        }
      } else {
        setLeaguePreview(null);
      }
    };

    previewLeague();
  }, [inviteCode]);

  const onSubmit = async (data: JoinFormData) => {
    try {
      setLoading(true);
      const result = await joinLeagueByCode(data.inviteCode.toUpperCase(), data.teamName);
      toast({
        title: "Success!",
        description: `You've joined the league!`,
      });
      reset();
      setLeaguePreview(null);
      onOpenChange(false);
      
      // Navigate to draft page or refresh
      if (onLeagueJoined) {
        const league = await getLeagueByInviteCode(data.inviteCode.toUpperCase());
        onLeagueJoined(league);
      } else {
        navigate(`/draft?league=${result.league_id}`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join league",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a League</DialogTitle>
          <DialogDescription>
            Enter the invite code to join a league and create your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite Code *</Label>
            <Input
              id="inviteCode"
              {...register("inviteCode", {
                required: "Invite code is required",
                minLength: { value: 6, message: "Invite code must be 6 characters" },
                maxLength: { value: 6, message: "Invite code must be 6 characters" },
              })}
              placeholder="ABC123"
              maxLength={6}
              className="uppercase"
              style={{ textTransform: "uppercase" }}
            />
            {errors.inviteCode && (
              <p className="text-sm text-destructive">{errors.inviteCode.message}</p>
            )}
            {leaguePreview && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="font-semibold text-sm">{leaguePreview.name}</p>
                {leaguePreview.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {leaguePreview.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {leaguePreview.current_teams} / {leaguePreview.max_teams} teams
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamName">Your Team Name *</Label>
            <Input
              id="teamName"
              {...register("teamName", { required: "Team name is required" })}
              placeholder="My Team"
            />
            {errors.teamName && (
              <p className="text-sm text-destructive">{errors.teamName.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
                setLeaguePreview(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !leaguePreview}>
              {loading ? "Joining..." : "Join League"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
