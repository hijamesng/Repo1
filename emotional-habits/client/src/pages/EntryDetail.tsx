import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";

const DOMAIN_COLORS: Record<string, string> = {
  Boss: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  Colleague: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  Customer: "bg-chart-2/15 text-chart-2 border-chart-2/30",
};

const CYCLE_STEPS = [
  { key: "intention", label: "Intention/Goal", emoji: "🎯", color: "bg-accent/30 border-accent/50", desc: "NVC-based intention set before the interaction" },
  { key: "trigger", label: "Trigger", emoji: "⚡", color: "bg-chart-4/10 border-chart-4/30", desc: "The activating event or behaviour" },
  { key: "emotionFelt", label: "Emotion Felt", emoji: "💛", color: "bg-yellow-50 border-yellow-200", desc: "The emotional response to the trigger" },
  { key: "behaviour", label: "Behaviour", emoji: "🔄", color: "bg-muted border-border", desc: "The default behavioural response" },
  { key: "alternateResponse", label: "Alternate Response", emoji: "🌱", color: "bg-secondary/50 border-secondary", desc: "The planned healthier response for next time" },
] as const;

export default function EntryDetail() {
  return (
    <DashboardLayout>
      <EntryDetailContent />
    </DashboardLayout>
  );
}

function EntryDetailContent() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id ?? "0", 10);

  const utils = trpc.useUtils();
  const { data: entry, isLoading, error } = trpc.entries.getById.useQuery({ id });

  const exportPDF = async () => {
    if (!entry) return;
    const { default: jsPDF } = await import("jspdf");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const addText = (text: string, size: number, color: [number, number, number], bold = false) => {
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.45) + 3;
    };

    const addSection = (emoji: string, label: string, desc: string, value: string, bgColor: [number, number, number]) => {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFillColor(...bgColor);
      const previewLines = doc.splitTextToSize(value || "—", contentWidth - 8);
      const blockHeight = 10 + previewLines.length * 5.5 + 8;
      doc.roundedRect(margin, y, contentWidth, blockHeight, 3, 3, "F");
      doc.setFontSize(9);
      doc.setTextColor(100, 70, 30);
      doc.setFont("helvetica", "bold");
      doc.text(`${emoji}  ${label}`, margin + 4, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130, 110, 90);
      doc.setFontSize(8);
      doc.text(`— ${desc}`, margin + 4 + doc.getTextWidth(`${emoji}  ${label}`) + 2, y + 7);
      doc.setFontSize(10);
      doc.setTextColor(40, 30, 20);
      doc.text(previewLines, margin + 4, y + 14);
      y += blockHeight + 5;
    };

    // Title
    doc.setFillColor(139, 90, 43);
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("EmotiFlow — Emotional Cycle Report", margin, 9.5);
    y = 24;

    // Meta
    addText(format(new Date(entry.createdAt), "EEEE, MMMM d, yyyy · h:mm a"), 9, [120, 100, 80]);
    addText(`Domain: ${entry.domain}`, 9, [120, 100, 80]);
    y += 2;

    // Event/Scenario
    addText("Event / Scenario", 9, [100, 70, 30], true);
    addText(entry.goal, 13, [40, 30, 20], true);
    y += 4;

    // Cycle steps
    addSection("🎯", "Intention/Goal", "NVC-based intention going in", entry.intention, [245, 240, 230]);
    addSection("⚡", "Trigger", "The activating event or behaviour", entry.trigger, [255, 248, 235]);
    addSection("💛", "Emotion Felt", "Emotional response to the trigger", entry.emotionFelt, [255, 253, 235]);
    addSection("🔄", "Behaviour", "Default behavioural response", entry.behaviour, [245, 245, 245]);
    addSection("🌱", "Alternate Response", "Planned healthier response for next time", entry.alternateResponse, [240, 248, 240]);

    // Notes
    if (entry.notes) {
      addSection("📝", "Additional Notes", "", entry.notes, [248, 248, 252]);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 140, 120);
      doc.text(`EmotiFlow · Page ${i} of ${pageCount}`, margin, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`emotiflow-entry-${format(new Date(entry.createdAt), "yyyyMMdd-HHmm")}.pdf`);
    toast.success("PDF exported");
  };

  const deleteEntry = trpc.entries.delete.useMutation({
    onSuccess: () => {
      toast.success("Entry deleted");
      utils.entries.list.invalidate();
      utils.entries.recent.invalidate();
      utils.entries.stats.invalidate();
      navigate("/history");
    },
    onError: (err) => toast.error("Could not delete entry", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-2 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="max-w-3xl mx-auto py-2 text-center">
        <p className="text-muted-foreground mb-4">Entry not found.</p>
        <Button onClick={() => navigate("/history")} variant="outline">
          Back to History
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-2 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/history")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to History
      </button>

      {/* Header Card */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline" className={`text-sm border ${DOMAIN_COLORS[entry.domain]}`}>
                  {entry.domain}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(entry.createdAt), "EEEE, MMMM d, yyyy · h:mm a")}
                </span>
              </div>
              <div className="mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Event/Scenario</p>
                <p className="text-lg font-semibold text-foreground leading-snug">{entry.goal}</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={exportPDF}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Delete this entry? This cannot be undone.")) {
                    deleteEntry.mutate({ id: entry.id });
                  }
                }}
                disabled={deleteEntry.isPending}
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emotional Cycle */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Emotional Cycle</h2>
        <div className="space-y-3">
          {CYCLE_STEPS.map(({ key, label, emoji, color, desc }) => (
            <Card key={key} className={`border shadow-none ${color}`}>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span>{emoji}</span>
                  {label}
                  <span className="text-xs font-normal text-muted-foreground ml-1">— {desc}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-0">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {entry[key as keyof typeof entry] as string}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Notes */}
      {entry.notes && (
        <Card className="border border-border shadow-none bg-muted/30">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">📝 Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-0">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
