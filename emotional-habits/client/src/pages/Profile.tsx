import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";

export default function Profile() {
  return (
    <DashboardLayout>
      <ProfileContent />
    </DashboardLayout>
  );
}

function ProfileContent() {
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile]);

  const updateName = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      utils.profile.get.invalidate();
    },
    onError: (err) => toast.error("Failed to update", { description: err.message }),
  });

  return (
    <div className="max-w-lg mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account details.</p>
      </div>

      {isLoading ? (
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); updateName.mutate({ name }); }}
          className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{profile?.name || "No name set"}</p>
              <p className="text-sm text-muted-foreground capitalize">{profile?.role ?? "user"}</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <p className="text-sm text-muted-foreground py-2">{profile?.email ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={100}
            />
          </div>
          <Button type="submit" disabled={updateName.isPending || !name.trim()}>
            {updateName.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      )}
    </div>
  );
}
