import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BookOpen, PlusCircle, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Domain = "Boss" | "Colleague" | "Customer" | "All";

const DOMAIN_COLORS: Record<string, string> = {
  Boss: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  Colleague: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  Customer: "bg-chart-2/15 text-chart-2 border-chart-2/30",
};

const EMOTION_COLORS = [
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-yellow-100 text-yellow-700",
  "bg-lime-100 text-lime-700",
  "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
];

function emotionColor(emotion: string) {
  const idx = emotion.charCodeAt(0) % EMOTION_COLORS.length;
  return EMOTION_COLORS[idx];
}

const FIELD_LABELS = [
  { key: "goal", label: "Goal" },
  { key: "intention", label: "Intention" },
  { key: "trigger", label: "Trigger" },
  { key: "emotionFelt", label: "Emotion Felt" },
  { key: "behaviour", label: "Behaviour" },
  { key: "alternateResponse", label: "Alternate Response" },
] as const;

export default function History() {
  return (
    <DashboardLayout>
      <HistoryContent />
    </DashboardLayout>
  );
}

function HistoryContent() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<Domain>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.entries.list.useQuery({ limit: 100, offset: 0 });

  const deleteEntry = trpc.entries.delete.useMutation({
    onSuccess: () => {
      toast.success("Entry deleted");
      utils.entries.list.invalidate();
      utils.entries.recent.invalidate();
      utils.entries.stats.invalidate();
    },
    onError: (err) => toast.error("Could not delete entry", { description: err.message }),
  });

  const allEntries = data?.entries ?? [];

  const domainFiltered =
    filter === "All" ? allEntries : allEntries.filter((e) => e.domain === filter);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? domainFiltered.filter(
        (e) =>
          e.goal.toLowerCase().includes(query) ||
          e.trigger.toLowerCase().includes(query) ||
          e.emotionFelt.toLowerCase().includes(query) ||
          e.behaviour.toLowerCase().includes(query) ||
          e.alternateResponse.toLowerCase().includes(query) ||
          e.intention.toLowerCase().includes(query) ||
          (e.notes ?? "").toLowerCase().includes(query)
      )
    : domainFiltered;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this entry? This cannot be undone.")) {
      deleteEntry.mutate({ id });
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handleFilterChange = (d: Domain) => {
    setFilter(d);
    setPage(0);
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Entry History</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {data?.total ?? 0} total entries — review your emotional growth over time.
          </p>
        </div>
        <Button onClick={() => navigate("/new-entry")} className="gap-2 shrink-0">
          <PlusCircle className="w-4 h-4" />
          New Entry
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search by goal, trigger, emotion, behaviour..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Domain Filter */}
      <div className="flex flex-wrap gap-2">
        {(["All", "Boss", "Colleague", "Customer"] as Domain[]).map((d) => (
          <button
            key={d}
            onClick={() => handleFilterChange(d)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm border transition-all",
              filter === d
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/50 text-foreground"
            )}
          >
            {d}
            {d !== "All" && data && (
              <span className="ml-1.5 text-xs opacity-70">
                ({allEntries.filter((e) => e.domain === d).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search result count */}
      {query && (
        <p className="text-sm text-muted-foreground -mt-2">
          {filtered.length === 0
            ? `No entries found for "${search}"`
            : `${filtered.length} entr${filtered.length === 1 ? "y" : "ies"} found for "${search}"`}
        </p>
      )}

      {/* Entries */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <Card className="border border-dashed border-border shadow-none">
          <CardContent className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {query
                ? `No entries match "${search}".`
                : filter === "All"
                  ? "No entries yet."
                  : `No entries for ${filter} yet.`}
            </p>
            {!query && (
              <Button onClick={() => navigate("/new-entry")} size="sm" className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Create Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paged.map((entry) => (
            <Card
              key={entry.id}
              className="border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/entry/${entry.id}`)}
            >
              <CardContent className="p-4 md:p-5">
                {/* Header row: domain badge, emotion badge, date, delete */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge
                    variant="outline"
                    className={`text-xs border ${DOMAIN_COLORS[entry.domain]}`}
                  >
                    {entry.domain}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs border ${emotionColor(entry.emotionFelt)}`}
                  >
                    {entry.emotionFelt}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(entry.createdAt), "dd/MM/yyyy · h:mm a")}
                  </span>
                  <button
                    onClick={(e) => handleDelete(entry.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* All fields as a compact grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {FIELD_LABELS.map(({ key, label }) => {
                    const value = entry[key as keyof typeof entry] as string;
                    return (
                      <div key={key} className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-0.5">
                          {label}
                        </p>
                        <p className="text-sm text-foreground leading-snug">
                          {value || <span className="text-muted-foreground italic">—</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
