import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Shield, User, Pencil, X, Check } from "lucide-react";
import { useState } from "react";

export default function Admin() {
  return (
    <DashboardLayout>
      <AdminContent />
    </DashboardLayout>
  );
}

function AdminContent() {
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const { data: users, isLoading: usersLoading } = trpc.admin.listUsers.useQuery(
    undefined,
    { enabled: profile?.role === "admin" }
  );
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const updateRole = trpc.admin.updateRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); utils.admin.listUsers.invalidate(); },
    onError: (err) => toast.error("Failed to update role", { description: err.message }),
  });

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      utils.admin.listUsers.invalidate();
      setEditingId(null);
    },
    onError: (err) => toast.error("Failed to update profile", { description: err.message }),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { toast.success("User deleted"); utils.admin.listUsers.invalidate(); },
    onError: (err) => toast.error("Failed to delete user", { description: err.message }),
  });

  const startEdit = (userId: number, currentName: string | null) => {
    setEditingId(userId);
    setEditName(currentName ?? "");
  };

  if (profileLoading) return <div className="h-40 bg-muted rounded-xl animate-pulse" />;

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">{users?.length ?? 0} registered users</p>
      </div>

      {usersLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {users?.map(user => (
            <div key={user.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-border shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {editingId === user.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-8 text-sm max-w-48"
                        placeholder="Enter name"
                        maxLength={100}
                        autoFocus
                      />
                      <button
                        onClick={() => updateUser.mutate({ userId: user.id, name: editName })}
                        disabled={!editName.trim() || updateUser.isPending}
                        className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {user.name ?? <span className="text-muted-foreground italic font-normal">No name</span>}
                      </p>
                      {user.id !== profile.id && (
                        <button
                          onClick={() => startEdit(user.id, user.name ?? null)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground truncate">{user.email ?? "—"}</p>
                </div>

                {/* Role + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={user.role === "admin" ? "default" : "outline"} className="capitalize">
                    {user.role}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateRole.isPending || user.id === profile.id || user.isOwner}
                    title={user.isOwner ? "Owner role cannot be changed" : undefined}
                    onClick={() => updateRole.mutate({ userId: user.id, role: user.role === "admin" ? "user" : "admin" })}
                  >
                    {user.role === "admin" ? "Demote" : "Promote"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleteUser.isPending || user.id === profile.id || user.isOwner}
                    title={user.isOwner ? "Owner account cannot be deleted" : undefined}
                    className="text-destructive hover:text-destructive hover:border-destructive/50"
                    onClick={() => {
                      if (confirm(`Delete ${user.email ?? "this user"}? This removes all their entries.`)) {
                        deleteUser.mutate({ userId: user.id });
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
