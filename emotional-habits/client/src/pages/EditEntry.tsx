import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Domain = "Boss" | "Colleague" | "Customer";

interface FormData {
  domain: Domain | "";
  goal: string;
  intention: string;
  trigger: string;
  emotionFelt: string;
  behaviour: string;
  alternateResponse: string;
  notes: string;
}

const STEPS = [
  { id: 1, label: "Domain", title: "Who is this about?", subtitle: "Select the professional relationship context for this entry." },
  { id: 2, label: "Event/Scenario", title: "What was the event or scenario?", subtitle: "Describe the situation or context that took place." },
  { id: 3, label: "Intention/Goal", title: "Set your intention/goal", subtitle: "What was your NVC-based intention or goal — how did you want to show up in this interaction?" },
  { id: 4, label: "Trigger", title: "What triggered you?", subtitle: "Describe the specific event, word, or behaviour that activated your emotional response." },
  { id: 5, label: "Emotion", title: "What did you feel?", subtitle: "Name the emotion(s) you felt in response to the trigger." },
  { id: 6, label: "Behaviour", title: "How did you respond?", subtitle: "Describe your default behavioural response — what did you actually do or say?" },
  { id: 7, label: "Alternate", title: "Alternate response", subtitle: "What could you do differently next time? Design a healthier, more intentional response." },
];

const COMMON_EMOTIONS = [
  "Anxious", "Frustrated", "Overwhelmed", "Hurt", "Angry",
  "Embarrassed", "Confused", "Disappointed", "Fearful", "Resentful",
  "Sad", "Stressed", "Defensive", "Hopeful", "Calm",
];

const DOMAIN_OPTIONS: { value: Domain; emoji: string; desc: string }[] = [
  { value: "Boss", emoji: "👔", desc: "Manager, supervisor, or senior leader" },
  { value: "Colleague", emoji: "🤝", desc: "Peer, teammate, or co-worker" },
  { value: "Customer", emoji: "💬", desc: "Client, customer, or external stakeholder" },
];

export default function EditEntry() {
  return (
    <DashboardLayout>
      <EditEntryContent />
    </DashboardLayout>
  );
}

function EditEntryContent() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id ?? "0", 10);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    domain: "", goal: "", intention: "", trigger: "",
    emotionFelt: "", behaviour: "", alternateResponse: "", notes: "",
  });

  const { data: entry, isLoading, error } = trpc.entries.getById.useQuery({ id });

  useEffect(() => {
    if (entry) {
      setForm({
        domain: entry.domain as Domain,
        goal: entry.goal,
        intention: entry.intention,
        trigger: entry.trigger,
        emotionFelt: entry.emotionFelt,
        behaviour: entry.behaviour,
        alternateResponse: entry.alternateResponse,
        notes: entry.notes ?? "",
      });
    }
  }, [entry]);

  const [auraSuggestion, setAuraSuggestion] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const auraInsight = trpc.entries.auraInsight.useMutation({
    onSuccess: (data) => setAuraSuggestion(data.suggestion),
    onError: (err) => toast.error("Aura couldn't generate a response", { description: err.message }),
  });

  const updateEntry = trpc.entries.update.useMutation({
    onSuccess: () => {
      utils.entries.recent.invalidate();
      utils.entries.list.invalidate();
      utils.entries.stats.invalidate();
      utils.entries.getById.invalidate({ id });
      toast.success("Entry updated!", { description: "Your changes have been saved." });
      navigate(`/entry/${id}`);
    },
    onError: (err) => {
      toast.error("Could not update entry", { description: err.message });
    },
  });

  const currentStep = STEPS[step - 1];
  const progress = (step / STEPS.length) * 100;

  const canProceed = () => {
    if (step === 1) return form.domain !== "";
    if (step === 2) return form.goal.trim().length > 0;
    if (step === 3) return form.intention.trim().length > 0;
    if (step === 4) return form.trigger.trim().length > 0;
    if (step === 5) return form.emotionFelt.trim().length > 0;
    if (step === 6) return form.behaviour.trim().length > 0;
    if (step === 7) return form.alternateResponse.trim().length > 0;
    return false;
  };

  const handleNext = () => {
    if (step < STEPS.length) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = () => {
    if (!form.domain) return;
    updateEntry.mutate({
      id,
      domain: form.domain as Domain,
      goal: form.goal,
      intention: form.intention,
      trigger: form.trigger,
      emotionFelt: form.emotionFelt,
      behaviour: form.behaviour,
      alternateResponse: form.alternateResponse,
      notes: form.notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-2 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="max-w-2xl mx-auto py-2 text-center">
        <p className="text-muted-foreground mb-4">Entry not found.</p>
        <Button onClick={() => navigate("/history")} variant="outline">Back to History</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-2">
      {/* Back */}
      <button
        onClick={() => navigate(`/entry/${id}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Entry
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Edit Entry</h1>
        <p className="text-muted-foreground text-sm">Step {step} of {STEPS.length}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-3">
          {STEPS.map(s => (
            <button
              key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              className={cn(
                "flex flex-col items-center gap-1 cursor-default",
                s.id < step && "cursor-pointer"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                s.id < step && "bg-primary text-primary-foreground",
                s.id === step && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                s.id > step && "bg-muted text-muted-foreground",
              )}>
                {s.id < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
              </div>
              <span className={cn(
                "text-[10px] hidden sm:block",
                s.id === step ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Card */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1">{currentStep.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.subtitle}</p>
          </div>

          {/* Step 1: Domain */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DOMAIN_OPTIONS.map(({ value, emoji, desc }) => (
                <button
                  key={value}
                  onClick={() => setForm(f => ({ ...f, domain: value }))}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    form.domain === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div className="text-3xl mb-2">{emoji}</div>
                  <div className="font-semibold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Event/Scenario */}
          {step === 2 && (
            <div className="space-y-2">
              <Label htmlFor="goal" className="text-sm font-medium">Event / Scenario</Label>
              <Textarea
                id="goal"
                placeholder="e.g. My manager questioned my project progress in front of the team during the morning standup..."
                value={form.goal}
                onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>
          )}

          {/* Step 3: Intention */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-accent/30 rounded-xl p-4 text-sm text-accent-foreground">
                <strong>NVC Intention:</strong> Set a mindful intention to approach this interaction with openness, empathy, and a focus on connection — rather than being "right."
              </div>
              <div className="space-y-2">
                <Label htmlFor="intention" className="text-sm font-medium">My Intention</Label>
                <Textarea
                  id="intention"
                  placeholder="e.g. My intention is to listen openly and express my needs calmly without blame..."
                  value={form.intention}
                  onChange={e => setForm(f => ({ ...f, intention: e.target.value }))}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Trigger */}
          {step === 4 && (
            <div className="space-y-2">
              <Label htmlFor="trigger" className="text-sm font-medium">The Trigger</Label>
              <Textarea
                id="trigger"
                placeholder="e.g. My boss interrupted me during the presentation and dismissed my idea in front of the team..."
                value={form.trigger}
                onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>
          )}

          {/* Step 5: Emotion Felt */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select your emotions <span className="text-muted-foreground font-normal">(choose one or more)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_EMOTIONS.map(emotion => {
                    const selected = form.emotionFelt.split(", ").filter(Boolean).includes(emotion);
                    return (
                      <button
                        key={emotion}
                        onClick={() => setForm(f => {
                          const current = f.emotionFelt ? f.emotionFelt.split(", ").filter(Boolean) : [];
                          const updated = current.includes(emotion)
                            ? current.filter(e => e !== emotion)
                            : [...current, emotion];
                          return { ...f, emotionFelt: updated.join(", ") };
                        })}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm border transition-all",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 text-foreground"
                        )}
                      >
                        {emotion}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emotionFelt" className="text-sm font-medium text-muted-foreground">Or describe in your own words</Label>
                <Textarea
                  id="emotionFelt"
                  placeholder="e.g. Humiliated and powerless..."
                  value={form.emotionFelt}
                  onChange={e => setForm(f => ({ ...f, emotionFelt: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 6: Behaviour */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {[
                  { label: "Fight", desc: "Argued or confronted", emoji: "⚡" },
                  { label: "Flee", desc: "Avoided or withdrew", emoji: "🏃" },
                  { label: "Freeze", desc: "Shut down or went silent", emoji: "🧊" },
                  { label: "Fawn", desc: "Appeased or over-agreed", emoji: "🙏" },
                ].map(({ label, desc, emoji }) => (
                  <button
                    key={label}
                    onClick={() => setForm(f => ({ ...f, behaviour: label }))}
                    className={cn(
                      "rounded-xl border-2 p-3 text-center transition-all",
                      form.behaviour === label
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className="text-xs font-semibold text-foreground">{label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="behaviour" className="text-sm font-medium text-muted-foreground">Describe what happened in detail</Label>
                <Textarea
                  id="behaviour"
                  placeholder="e.g. I froze and didn't respond. After the meeting I felt embarrassed and avoided my boss for the rest of the day..."
                  value={form.behaviour}
                  onChange={e => setForm(f => ({ ...f, behaviour: e.target.value }))}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 7: Alternate Response */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="bg-secondary/50 rounded-xl p-4 text-sm text-secondary-foreground">
                <strong>Growth moment:</strong> Based on your trigger and emotion, what would a calmer, more intentional version of you do differently? This is your alternate response to practice.
              </div>

              {/* Aura AI button */}
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/5"
                disabled={auraInsight.isPending}
                onClick={() => {
                  setAuraSuggestion(null);
                  auraInsight.mutate({
                    domain: form.domain as string,
                    goal: form.goal,
                    intention: form.intention,
                    trigger: form.trigger,
                    emotionFelt: form.emotionFelt,
                    behaviour: form.behaviour,
                  });
                }}
              >
                <Sparkles className="w-4 h-4" />
                {auraInsight.isPending ? "Aura is thinking..." : "Ask Aura for a suggestion"}
              </Button>

              {/* Aura suggestion */}
              {auraSuggestion && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Sparkles className="w-4 h-4" />
                    Aura's suggestion
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{auraSuggestion}</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setForm(f => ({ ...f, alternateResponse: auraSuggestion }));
                      setAuraSuggestion(null);
                    }}
                  >
                    Use this response
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="alternateResponse" className="text-sm font-medium">Alternate Response</Label>
                <Textarea
                  id="alternateResponse"
                  placeholder="e.g. Next time, I will take a breath, acknowledge the interruption calmly, and request a dedicated time to share my idea fully..."
                  value={form.alternateResponse}
                  onChange={e => setForm(f => ({ ...f, alternateResponse: e.target.value }))}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Additional notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any other reflections or context..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || updateEntry.isPending}
              className="gap-2"
            >
              {step === STEPS.length ? (
                updateEntry.isPending ? "Saving..." : "Save Changes"
              ) : (
                <>Next <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
