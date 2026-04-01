import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Camera, User } from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const updateAvatar = trpc.profile.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success("Profile picture updated");
      utils.profile.get.invalidate();
    },
    onError: (err) => toast.error("Failed to update picture", { description: err.message }),
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum size is 2MB." });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateAvatar.mutateAsync({ avatarUrl: `${data.publicUrl}?t=${Date.now()}` });
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account details.</p>
      </div>

      {isLoading ? (
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      ) : (
        <div className="space-y-4">
          {/* Avatar card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-border">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-lg">{profile?.name || "No name set"}</p>
              <p className="text-sm text-muted-foreground">{profile?.email ?? "—"}</p>
              <Badge variant={profile?.role === "admin" ? "default" : "secondary"} className="capitalize mt-1">
                {profile?.role ?? "user"}
              </Badge>
            </div>
          </div>

          {/* Edit form */}
          <form
            onSubmit={(e) => { e.preventDefault(); updateName.mutate({ name }); }}
            className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-semibold text-foreground">Account Details</h2>
            <div className="space-y-1">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground py-1">{profile?.email ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <Label>Account Role</Label>
              <p className="text-sm text-muted-foreground py-1 capitalize">{profile?.role ?? "user"}</p>
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
        </div>
      )}
    </div>
  );
}
