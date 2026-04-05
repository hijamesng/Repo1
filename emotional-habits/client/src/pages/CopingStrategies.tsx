import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bot, Check, Download, Pencil, PlusCircle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const { data: entriesData } = trpc.entries.list.useQuery({ limit: 100, offset: 0 });
  const entries = entriesData?.entries ?? [];

  const breaking = strategies?.filter(s => s.type === "breaking") ?? [];
  const building = strategies?.filter(s => s.type === "building") ?? [];

  const addMutation = trpc.coping.add.useMutation({
    onSuccess: () => utils.coping.list.invalidate(),
    onError: (err) => toast.error("Could not add strategy", { description: err.message }),
  });

  const generate = trpc.coping.generate.useMutation({
    onSuccess: async (data) => {
      const allNew = [
        ...data.breaking.map(s => ({ type: "breaking" as const, content: s.content, source: "ai" as const, entryRef: s.ref })),
        ...data.building.map(s => ({ type: "building" as const, content: s.content, source: "ai" as const, entryRef: s.ref })),
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

  const updateMutation = trpc.coping.update.useMutation({
    onSuccess: () => utils.coping.list.invalidate(),
    onError: (err) => toast.error("Could not update strategy", { description: err.message }),
  });

  const isGenerating = generate.isPending || addMutation.isPending;

  const exportPDF = async () => {
    try {
      const allStrategies = strategies ?? [];
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      let y = 24;

      // Header bar
      doc.setFillColor(139, 90, 43);
      doc.rect(0, 0, pageWidth, 16, "F");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("EmotiFlow  —  Coping Strategist Report", margin, 11);

      // Export date
      doc.setFontSize(9);
      doc.setTextColor(120, 100, 80);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Exported ${format(new Date(), "EEEE, MMMM d, yyyy")}  |  ${allStrategies.length} strategies`,
        margin, y
      );
      y += 12;

      const sections = [
        { title: "Building New Habits", items: allStrategies.filter(s => s.type === "building"), bg: [240, 248, 242] as const, color: [40, 120, 70] as const },
        { title: "Breaking Old Habits", items: allStrategies.filter(s => s.type === "breaking"), bg: [248, 244, 238] as const, color: [120, 80, 40] as const },
      ];

      for (const section of sections) {
        // Section heading
        if (y + 14 > pageHeight - 16) { doc.addPage(); y = 16; }
        doc.setFontSize(11);
        doc.setTextColor(section.color[0], section.color[1], section.color[2]);
        doc.setFont("helvetica", "bold");
        doc.text(section.title, margin, y);
        y += 8;

        if (section.items.length === 0) {
          doc.setFontSize(9);
          doc.setTextColor(160, 150, 140);
          doc.setFont("helvetica", "italic");
          doc.text("No strategies yet.", margin + 4, y);
          y += 10;
        } else {
          for (let i = 0; i < section.items.length; i++) {
            const s = section.items[i];

            // Set content font BEFORE splitTextToSize so wrapping uses correct metrics
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "normal");
            const contentLines = doc.splitTextToSize(s.content ?? "", contentWidth - 18);

            // Get actual line height from jsPDF in document units (mm)
            const lineH: number = typeof (doc as any).getLineHeight === "function"
              ? (doc as any).getLineHeight()
              : 5.5;

            const hasRef = !!s.entryRef;
            // top pad(8) + ref label(hasRef?5:0) + text lines + bottom pad(5)
            const textH = contentLines.length * lineH;
            const blockH = 8 + (hasRef ? 5 : 0) + textH + 5;

            if (y + blockH > pageHeight - 16) { doc.addPage(); y = 16; }

            // Block background
            doc.setFillColor(section.bg[0], section.bg[1], section.bg[2]);
            doc.roundedRect(margin, y, contentWidth, blockH, 2, 2, "F");

            // Bullet circle
            doc.setFillColor(section.color[0], section.color[1], section.color[2]);
            doc.circle(margin + 6, y + 7, 1.8, "F");

            // Number
            doc.setFontSize(8);
            doc.setTextColor(section.color[0], section.color[1], section.color[2]);
            doc.setFont("helvetica", "bold");
            doc.text(`${i + 1}.`, margin + 10, y + 8);

            // Entry ref label — above content
            let contentStartY = y + 8;
            if (hasRef && s.entryRef) {
              doc.setFontSize(7.5);
              doc.setTextColor(section.color[0], section.color[1], section.color[2]);
              doc.setFont("helvetica", "bold");
              doc.text(s.entryRef, margin + 17, contentStartY);
              contentStartY += 5;
            }

            // AI badge — top right, same line as label/content start
            if (s.source === "ai") {
              doc.setFontSize(6.5);
              doc.setTextColor(160, 140, 120);
              doc.setFont("helvetica", "bold");
              doc.text("AI", pageWidth - margin - 8, y + 8);
            }

            // Content text
            doc.setFontSize(9.5);
            doc.setTextColor(40, 30, 20);
            doc.setFont("helvetica", "normal");
            doc.text(contentLines, margin + 17, contentStartY);

            y += blockH + 3;
          }
        }
        y += 6;
      }

      // Footer on every page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(180, 160, 140);
        doc.setFont("helvetica", "normal");
        doc.text(`EmotiFlow  |  Page ${i} of ${pageCount}`, margin, pageHeight - 8);
      }

      doc.save(`emotiflow-coping-strategies-${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF exported");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("PDF export failed", { description: msg });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Coping Strategist</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-lg">
            AI-personalised strategies grounded in neuroscience, CBT, and NVC — based on your emotional habit patterns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={exportPDF}>
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button className="gap-2" onClick={() => generate.mutate()} disabled={isGenerating}>
            {isGenerating
              ? <><Bot className="w-4 h-4 animate-pulse" /> Generating…</>
              : <><Sparkles className="w-4 h-4" /> Generate AI Strategies</>
            }
          </Button>
        </div>
      </div>

      <Card className="border border-border bg-accent/20 shadow-none">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Click <strong>Generate AI Strategies</strong> to have the AI analyse your entries and suggest strategies tagged to the relevant entry.
            Hover any strategy to reveal edit and delete. Add your own by selecting an entry and describing your strategy.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StrategyColumn
            title="Building New Habits"
            emoji="🌱"
            type="building"
            strategies={building}
            entries={entries}
            onAdd={(content, entryRef) => addMutation.mutate({ type: "building", content, source: "user", entryRef })}
            onDelete={(id) => deleteMutation.mutate({ id })}
            onUpdate={(id, content) => updateMutation.mutate({ id, content })}
            isAdding={addMutation.isPending}
            isDeleting={deleteMutation.isPending}
            isUpdating={updateMutation.isPending}
          />
          <StrategyColumn
            title="Breaking Old Habits"
            emoji="🔓"
            type="breaking"
            strategies={breaking}
            entries={entries}
            onAdd={(content, entryRef) => addMutation.mutate({ type: "breaking", content, source: "user", entryRef })}
            onDelete={(id) => deleteMutation.mutate({ id })}
            onUpdate={(id, content) => updateMutation.mutate({ id, content })}
            isAdding={addMutation.isPending}
            isDeleting={deleteMutation.isPending}
            isUpdating={updateMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}

type Strategy = { id: number; content: string; source: string; entryRef?: string | null };
type Entry = { id: number; domain: string; emotionFelt: string; goal: string; createdAt: Date | string };

function StrategyColumn({
  title, emoji, strategies, entries, onAdd, onDelete, onUpdate,
  isAdding, isDeleting, isUpdating,
}: {
  title: string;
  emoji: string;
  type: "breaking" | "building";
  strategies: Strategy[];
  entries: Entry[];
  onAdd: (content: string, entryRef?: string) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, content: string) => void;
  isAdding: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string>("");

  const startEdit = (s: Strategy) => {
    setEditingId(s.id);
    setEditValue(s.content);
  };

  const saveEdit = () => {
    if (editingId === null || !editValue.trim()) return;
    onUpdate(editingId, editValue.trim());
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleAdd = () => {
    if (!newContent.trim()) return;
    const entry = entries.find(e => String(e.id) === selectedEntryId);
    const entryRef = entry ? `${entry.domain}, ${entry.emotionFelt}` : undefined;
    onAdd(newContent.trim(), entryRef);
    setNewContent("");
    setSelectedEntryId("");
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {strategies.length} {strategies.length === 1 ? "strategy" : "strategies"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {/* Strategy list */}
        <div className="space-y-1 min-h-[80px] mb-5">
          {strategies.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">
              No strategies yet. Generate AI suggestions or add your own below.
            </p>
          ) : (
            strategies.map(s => (
              <div key={s.id} className="flex items-start gap-2 group py-2.5 border-b border-border/40 last:border-0">
                {editingId === s.id ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <Textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Escape") cancelEdit(); }}
                      className="text-sm min-h-[80px] resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" className="h-7 px-3 gap-1 text-xs" onClick={cancelEdit}>
                        <X className="w-3 h-3" /> Cancel
                      </Button>
                      <Button size="sm" className="h-7 px-3 gap-1 text-xs" onClick={saveEdit} disabled={isUpdating || !editValue.trim()}>
                        <Check className="w-3 h-3" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {s.entryRef && (
                          <span className="text-[10px] font-semibold bg-primary/8 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                            {s.entryRef}
                          </span>
                        )}
                        {s.source === "ai" && (
                          <span className="text-[10px] font-semibold text-primary/40 uppercase tracking-wider">AI</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{s.content}</p>
                    </div>
                    <button
                      onClick={() => startEdit(s)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                      aria-label="Edit strategy"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(s.id)}
                      disabled={isDeleting}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      aria-label="Remove strategy"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add new strategy */}
        <div className="border-t border-border/50 pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add your own</p>
          {entries.length > 0 && (
            <select
              value={selectedEntryId}
              onChange={e => setSelectedEntryId(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">No specific entry (general strategy)</option>
              {entries.map(e => (
                <option key={e.id} value={String(e.id)}>
                  {e.domain} · {e.emotionFelt} — {format(new Date(e.createdAt), "dd/MM/yy")}
                </option>
              ))}
            </select>
          )}
          <Textarea
            placeholder="Describe your strategy…"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            className="text-sm min-h-[80px] resize-none"
          />
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={handleAdd}
            disabled={!newContent.trim() || isAdding}
          >
            <PlusCircle className="w-4 h-4" />
            Add Strategy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
