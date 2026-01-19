import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { createLeague, type League } from "@/lib/leagues";
import { useToast } from "@/hooks/use-toast";

interface CreateLeagueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeagueCreated?: (league: League) => void;
}

interface LeagueFormData {
  name: string;
  description: string;
  maxTeams: number;
}

export function CreateLeagueDialog({
  open,
  onOpenChange,
  onLeagueCreated,
}: CreateLeagueDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeagueFormData>({
    defaultValues: {
      name: "",
      description: "",
      maxTeams: 12,
    },
  });

  const onSubmit = async (data: LeagueFormData) => {
    try {
      setLoading(true);
      const league = await createLeague(
        data.name,
        data.description || undefined,
        data.maxTeams
      );
      toast({
        title: "League Created",
        description: `${league.name} has been created successfully!`,
      });
      reset();
      onOpenChange(false);
      onLeagueCreated?.(league);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create league",
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
          <DialogTitle>Create a New League</DialogTitle>
          <DialogDescription>
            Start a new fantasy league and invite your friends to join.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">League Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "League name is required" })}
              placeholder="My Fantasy League"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Tell us about your league..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTeams">Max Teams</Label>
            <Input
              id="maxTeams"
              type="number"
              min="2"
              max="20"
              {...register("maxTeams", {
                required: true,
                valueAsNumber: true,
                min: { value: 2, message: "Minimum 2 teams" },
                max: { value: 20, message: "Maximum 20 teams" },
              })}
            />
            {errors.maxTeams && (
              <p className="text-sm text-destructive">
                {errors.maxTeams.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create League"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
