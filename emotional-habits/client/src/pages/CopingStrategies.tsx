import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Bot, PlusCircle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CopingStrategies() {
  return (
    <DashboardLayout>
      <CopingStrategiesContent />
    </DashboardLayout>
  );
}

function CopingStrategiesContent() {
  const utils = trpc.useUtils();
  const { data: strategies, isLoading } = trpc.coping.list.useQuery();
  const [breakingInput, setBreakingInput] = useState("");
  const [buildingInput, setBuildingInput] = useState("");

  const breaking = strategies?.filter(s => s.type === "breaking") ?? [];
  const building = strategies?.filter(s => s.type === "building") ?? [];

  const addMutation = trpc.coping.add.useMutation({
    onSuccess: () => utils.coping.list.invalidate(),
    onError: (err) => toast.error("Could not add strategy", { description: err.message }),
  });

  const generate = trpc.coping.generate.useMutation({
    onSuccess: async (data) => {
      const allNew = [
        ...data.breaking.map(content => ({ type: "breaking" as const, content, source: "ai" as const })),
        ...data.building.map(content => ({ type: "building" as const, content, source: "ai" as const })),
      ];
      for (const s of allNew) {
        await addMutation.mutateAsync(s);
      }
      utils.coping.list.invalidate();
      toast.success("Strategies generated", {
        description: "AI has analysed your entries and created personalised strategies.",
      });
    },
    onError: (err) => toast.error("Could not generate strategies", { description: err.message }),
  });

  const deleteMutation = trpc.coping.delete.useMutation({
    onSuccess: () => utils.coping.list.invalidate(),
    onError: (err) => toast.error("Could not delete strategy", { description: err.message }),
  });

  const handleAdd = (type: "breaking" | "building") => {
    const content = type === "breaking" ? breakingInput.trim() : buildingInput.trim();
    if (!content) return;
    addMutation.mutate({ type, content, source: "user" });
    if (type === "breaking") setBreakingInput("");
    else setBuildingInput("");
  };

  const isGenerating = generate.isPending || addMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Coping Strategist</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-lg">
            AI-personalised strategies grounded in neuroscience, CBT, and NVC — based on your emotional habit patterns.
          </p>
        </div>
        <Button
          className="gap-2 shrink-0"
          onClick={() => generate.mutate()}
          disabled={isGenerating}
        >
          {isGenerating
            ? <><Bot className="w-4 h-4 animate-pulse" /> Generating…</>
            : <><Sparkles className="w-4 h-4" /> Generate AI Strategies</>
          }
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border border-border bg-accent/20 shadow-none">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Click <strong>Generate AI Strategies</strong> to have the AI analyse your last 10 entries and suggest
            strategies for breaking old habits and building new ones. You can also add your own strategies to either column.
            Hover any strategy to reveal the delete button.
          </p>
        </CardContent>
      </Card>

      {/* Two columns */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Breaking Old Habits */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span className="text-xl">🔓</span>
                Breaking Old Habits
                <span className="ml-auto text-xs font-normal text-muted-foreground">{breaking.length} {breaking.length === 1 ? "strategy" : "strategies"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-1 min-h-[80px] mb-4">
                {breaking.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    No strategies yet. Generate AI suggestions or add your own below.
                  </p>
                ) : (
                  breaking.map(s => (
                    <div key={s.id} className="flex items-start gap-2 group py-2.5 border-b border-border/40 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{s.content}</p>
                        {s.source === "ai" && (
                          <span className="text-[10px] font-semibold text-primary/50 uppercase tracking-wider">AI Generated</span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate({ id: s.id })}
                        disabled={deleteMutation.isPending}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        aria-label="Remove strategy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add your own strategy…"
                  value={breakingInput}
                  onChange={e => setBreakingInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd("breaking")}
                  className="text-sm h-9"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-9 px-3"
                  onClick={() => handleAdd("breaking")}
                  disabled={!breakingInput.trim() || addMutation.isPending}
                >
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Building New Habits */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span className="text-xl">🌱</span>
                Building New Habits
                <span className="ml-auto text-xs font-normal text-muted-foreground">{building.length} {building.length === 1 ? "strategy" : "strategies"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-1 min-h-[80px] mb-4">
                {building.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    No strategies yet. Generate AI suggestions or add your own below.
                  </p>
                ) : (
                  building.map(s => (
                    <div key={s.id} className="flex items-start gap-2 group py-2.5 border-b border-border/40 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{s.content}</p>
                        {s.source === "ai" && (
                          <span className="text-[10px] font-semibold text-primary/50 uppercase tracking-wider">AI Generated</span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate({ id: s.id })}
                        disabled={deleteMutation.isPending}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        aria-label="Remove strategy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add your own strategy…"
                  value={buildingInput}
                  onChange={e => setBuildingInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd("building")}
                  className="text-sm h-9"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-9 px-3"
                  onClick={() => handleAdd("building")}
                  disabled={!buildingInput.trim() || addMutation.isPending}
                >
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
