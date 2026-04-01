import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Shield } from "lucide-react";

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

  const updateRole = trpc.admin.updateRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); utils.admin.listUsers.invalidate(); },
    onError: (err) => toast.error("Failed to update role", { description: err.message }),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { toast.success("User deleted"); utils.admin.listUsers.invalidate(); },
    onError: (err) => toast.error("Failed to delete user", { description: err.message }),
  });

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
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users?.map(user => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {user.name ?? <span className="text-muted-foreground italic">No name</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === "admin" ? "default" : "outline"} className="capitalize">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updateRole.isPending || user.id === profile.id}
                        onClick={() => updateRole.mutate({ userId: user.id, role: user.role === "admin" ? "user" : "admin" })}
                      >
                        {user.role === "admin" ? "Demote" : "Promote"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleteUser.isPending || user.id === profile.id}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
