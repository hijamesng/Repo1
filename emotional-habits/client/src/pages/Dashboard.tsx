import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BookOpen, PlusCircle, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const HEADER_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663211521711/TnZNKvwptQgVg6RKDVDCo4/dashboard-header-jZsB32rmdSGJkBfYjaVKvq.webp";

const REFLECTION_PROMPTS = [
  "What emotion showed up most for you this week at work?",
  "Which relationship — Boss, Colleague, or Customer — challenged you most recently?",
  "What trigger keeps recurring in your professional life?",
  "When did you last respond with your alternate response? How did it feel?",
  "What unmet need is behind your most common emotional reaction at work?",
  "What intention would you set for your next difficult conversation?",
  "Which behaviour pattern are you most ready to change?",
  "What would a calmer version of you do differently today?",
  "What emotion did you suppress at work this week, and what did it need?",
  "Who at work brings out the best in you — and what makes that possible?",
  "What does your most recent trigger reveal about what you value?",
  "If you could rewrite one recent interaction, what would your alternate response be?",
];

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

function getDailyPromptIndex() {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return dayOfYear % REFLECTION_PROMPTS.length;
}

const FIELD_LABELS = [
  { key: "goal", label: "Goal" },
  { key: "intention", label: "Intention" },
  { key: "trigger", label: "Trigger" },
  { key: "emotionFelt", label: "Emotion Felt" },
  { key: "behaviour", label: "Behaviour" },
  { key: "alternateResponse", label: "Alternate Response" },
] as const;

export default function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}

function DashboardContent() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: recent, isLoading: recentLoading } = trpc.entries.recent.useQuery({ limit: 5 });

  const dailyIndex = useMemo(() => getDailyPromptIndex(), []);
  const [promptIndex, setPromptIndex] = useState(dailyIndex);

  const handleRefreshPrompt = () => {
    setPromptIndex((i) => (i + 1) % REFLECTION_PROMPTS.length);
  };

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* Hero Header Card */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-sm border border-border"
        style={{ minHeight: "200px" }}
      >
        <img
          src={HEADER_IMAGE}
          alt="Peaceful reflection space"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />
        <div
          className="relative z-10 p-6 md:p-8 flex flex-col justify-end"
          style={{ minHeight: "200px" }}
        >
          <p className="text-white/80 text-sm mb-1 font-medium">Welcome back,</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
            {firstName} 👋
          </h1>
          <p className="text-white/75 text-sm max-w-sm leading-relaxed">
            Your space to reflect, reframe, and grow through every professional interaction.
          </p>
          <Button
            onClick={() => navigate("/new-entry")}
            className="mt-4 gap-2 w-fit bg-white text-foreground hover:bg-white/90 shadow-md"
            size="sm"
          >
            <PlusCircle className="w-4 h-4" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Daily Reflection Prompt */}
      <Card className="border border-border shadow-sm bg-accent/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Today's Reflection Prompt
              </p>
              <p className="text-base font-medium text-foreground leading-relaxed">
                "{REFLECTION_PROMPTS[promptIndex]}"
              </p>
            </div>
            <button
              onClick={handleRefreshPrompt}
              title="Next prompt"
              className="shrink-0 mt-0.5 p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={() => navigate("/new-entry")}
            variant="outline"
            size="sm"
            className="mt-4 gap-2 bg-card"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Reflect on this
          </Button>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Entries</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/history")}
            className="text-primary hover:text-primary"
          >
            View All
          </Button>
        </div>

        {recentLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !recent || recent.length === 0 ? (
          <Card className="border border-dashed border-border shadow-none">
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                No entries yet. Start your emotional journey!
              </p>
              <Button onClick={() => navigate("/new-entry")} size="sm" className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Create First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recent.map((entry) => (
              <Card
                key={entry.id}
                className="border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/entry/${entry.id}`)}
              >
                <CardContent className="p-4 md:p-5">
                  {/* Header row: domain badge, emotion badge, date */}
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
                      {format(new Date(entry.createdAt), "dd/MM/yyyy")}
                    </span>
                  </div>

                  {/* All fields as a compact grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {FIELD_LABELS.map(({ key, label }) => {
                      const value = entry[key as keyof typeof entry] as string;
                      return (
                        <div key={key} className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-0.5">
                            {label}
                          </p>
                          <p className="text-sm text-foreground line-clamp-2 leading-snug">
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
      </div>
    </div>
  );
}
