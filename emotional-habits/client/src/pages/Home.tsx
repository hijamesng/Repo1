import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Heart, Lightbulb, RefreshCw, Shield } from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              EmotiFlow
            </span>
          </div>
          <Button asChild size="sm">
            <a href="/login">Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-background to-secondary/20 pointer-events-none" />
        <div className="container relative py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-accent/40 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Heart className="w-3.5 h-3.5" />
            Emotional Intelligence for Professionals
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Transform Your<br />
            <span className="text-primary">Emotional Habits</span><br />
            at Work
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A guided journaling tool that helps you identify triggers, understand your emotions,
            and build healthier responses in professional relationships — with your Boss, Colleagues, and Customers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-base px-8">
              <a href="/login">Start Your Journey</a>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 bg-card">
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-muted/40">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">The Emotional Cycle</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Each entry guides you through a structured, evidence-based reflection process.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", icon: Shield, title: "Set Your Intention", desc: "Begin with an NVC-based intention to approach the situation with openness and empathy." },
              { step: "02", icon: Lightbulb, title: "Identify the Trigger", desc: "Name the specific event or behaviour that activated your emotional response." },
              { step: "03", icon: Heart, title: "Acknowledge Your Emotion", desc: "Label what you felt and the behaviour it produced — without judgment." },
              { step: "04", icon: RefreshCw, title: "Plan an Alternate Response", desc: "Design a healthier, more intentional response for next time." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-primary/60 tracking-widest">{step}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-base">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domains */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Professional Domains</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Track emotional patterns across the key relationships in your professional life.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { domain: "Boss", color: "bg-chart-1/15 border-chart-1/30 text-chart-1", emoji: "👔", desc: "Navigate authority dynamics, feedback, and performance conversations." },
              { domain: "Colleague", color: "bg-chart-3/15 border-chart-3/30 text-chart-3", emoji: "🤝", desc: "Build collaborative relationships and resolve peer conflicts constructively." },
              { domain: "Customer", color: "bg-chart-2/15 border-chart-2/30 text-chart-2", emoji: "💬", desc: "Manage expectations, handle complaints, and deliver with empathy." },
            ].map(({ domain, color, emoji, desc }) => (
              <div key={domain} className={`rounded-2xl p-6 border ${color} text-center`}>
                <div className="text-4xl mb-3">{emoji}</div>
                <h3 className="font-bold text-lg mb-2">{domain}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary/5 border-t border-border">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Build Emotional Awareness?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Join professionals who are transforming reactive habits into intentional, growth-oriented responses.
          </p>
          <Button asChild size="lg" className="text-base px-10">
            <a href="/login">Get Started Free</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <span>EmotiFlow — Emotional Habits for Professionals</span>
          </div>
          <span>Built with care for your growth</span>
        </div>
      </footer>
    </div>
  );
}
