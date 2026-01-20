import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createLeagueMockDraft, type MockDraftConfig } from "@/lib/mockDraft";
import { Bot, Loader2, Users } from "lucide-react";

interface StartMockDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  userTeamName: string;
  onMockDraftCreated: (mockDraftId: string) => void;
}

export function StartMockDraftDialog({
  open,
  onOpenChange,
  leagueId,
  userTeamName,
  onMockDraftCreated,
}: StartMockDraftDialogProps) {
  const { toast } = useToast();
  const [numBots, setNumBots] = useState("3");
  const [loading, setLoading] = useState(false);

  const handleStartMockDraft = async () => {
    try {
      setLoading(true);
      const config: Partial<MockDraftConfig> = {
        numBots: parseInt(numBots, 10),
      };

      const result = await createLeagueMockDraft(
        leagueId,
        userTeamName,
        config
      );

      toast({
        title: "Mock Draft Started!",
        description: "Good luck! Draft order has been randomized.",
      });

      onOpenChange(false);

      // Navigate to the mock draft page
      onMockDraftCreated(result.mockDraftId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start mock draft",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Start Mock Draft
          </DialogTitle>
          <DialogDescription>
            Practice your draft skills against bot opponents. The draft will
            start immediately after setup.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Show user's team */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">Your Team</p>
              <p className="font-semibold">{userTeamName}</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="numBots">Number of Bot Opponents</Label>
            <Select value={numBots} onValueChange={setNumBots}>
              <SelectTrigger id="numBots">
                <SelectValue placeholder="Select number of bots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Bot (2 teams total)</SelectItem>
                <SelectItem value="2">2 Bots (3 teams total)</SelectItem>
                <SelectItem value="3">3 Bots (4 teams total)</SelectItem>
                <SelectItem value="5">5 Bots (6 teams total)</SelectItem>
                <SelectItem value="7">7 Bots (8 teams total)</SelectItem>
                <SelectItem value="11">11 Bots (12 teams total)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Bots will automatically make picks when it's their turn</li>
              <li>Snake draft format (order reverses each round)</li>
              <li>5 rounds total, pick the best players!</li>
              <li>This won't affect your real league draft</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStartMockDraft} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Start Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
