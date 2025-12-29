import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

const Index = () => {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cardUrl, setCardUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateCard = async () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a CodeChef username",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const endpointBase = API_BASE_URL ? `${API_BASE_URL}/api/codechef-card` : "/api/codechef-card";
    let requestUrl = `${endpointBase}?username=${encodeURIComponent(username)}`;
    
    // Test if the card can be generated
    try {
      const response = await fetch(requestUrl);
      if (!response.ok) {
        throw new Error("Failed to generate card");
      }
      const absoluteUrl = API_BASE_URL
        ? requestUrl
        : `${typeof window !== "undefined" ? window.location.origin : ""}${requestUrl}`;
      setCardUrl(absoluteUrl);
      toast({
        title: "Success!",
        description: "Your CodeChef stats card is ready",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate card. Please check the username.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;

    const copy = async () => {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    };

    copy();
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const markdownCode = cardUrl ? `![CodeChef Stats](${cardUrl})` : "";
  const htmlCode = cardUrl ? `<img src="${cardUrl}" alt="CodeChef Stats" />` : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.18),_transparent_55%)]" />
      <div className="pointer-events-none absolute right-0 top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,_hsl(222_47%_18%/0.2),_transparent_60%)] blur-2xl" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/40 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-[0_10px_30px_hsl(var(--primary)/0.35)]">
                <span className="text-primary-foreground font-bold text-sm tracking-wide">CC</span>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-muted-foreground">CodeChef Toolkit</p>
                <h1 className="text-2xl font-semibold">Stats Card Generator</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/60 px-3 py-1">SVG Ready</span>
              <span className="rounded-full border border-border/60 px-3 py-1">Profile Safe</span>
              <span className="rounded-full border border-border/60 px-3 py-1">Share Anywhere</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
              CodeChef to SVG
            </div>
            <h2 className="text-4xl sm:text-5xl font-semibold leading-tight">
              Turn your CodeChef progress into a refined, shareable card.
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Generate a polished SVG that highlights your solved count, badges, and recent activity.
              Built for GitHub, portfolio pages, and resumes.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {["Enter username", "Generate SVG", "Share the link"].map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-border/60 bg-card/80 px-4 py-4 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    0{index + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-2 border-border/60 bg-card/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.2)]">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">Input</p>
                <h3 className="text-2xl font-semibold">Configure your card</h3>
                <p className="text-sm text-muted-foreground">
                  Generate and preview a fresh SVG for your CodeChef profile.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Enter CodeChef username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generateCard()}
                  className="flex-1 h-12 text-base"
                />
                <Button
                  onClick={generateCard}
                  disabled={isLoading}
                  size="lg"
                  className="h-12 px-8 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Card"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {cardUrl && (
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-6 border-2 border-border/60">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Preview
              </h3>
              <div className="bg-muted rounded-2xl p-6 flex items-center justify-center">
                <img src={cardUrl} alt="CodeChef Stats" className="max-w-full h-auto" />
              </div>
            </Card>

            <Card className="p-6 border-2 border-border/60 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Embed & Share</h3>
                <p className="text-sm text-muted-foreground">
                  Use Markdown or HTML, or open the direct SVG link in a new tab.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground">Markdown</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(markdownCode)}
                      className="h-8"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <code className="block w-full p-3 bg-muted rounded-lg text-sm font-mono break-all">
                    {markdownCode}
                  </code>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground">HTML</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(htmlCode)}
                      className="h-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <code className="block w-full p-3 bg-muted rounded-lg text-sm font-mono break-all">
                    {htmlCode}
                  </code>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground">Direct URL</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8"
                    >
                      <a href={cardUrl} target="_blank" rel="noreferrer">
                        Open Link
                      </a>
                    </Button>
                  </div>
                  <code className="block w-full p-3 bg-muted rounded-lg text-sm font-mono break-all">
                    {cardUrl}
                  </code>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
          {[
            {
              title: "Solved Stats",
              description: "Show total problems solved from your CodeChef profile.",
              badge: "01",
            },
            {
              title: "Badge Count",
              description: "Highlight the number of badges you've earned.",
              badge: "02",
            },
            {
              title: "Recent Activity",
              description: "Surface your latest submissions and language mix.",
              badge: "03",
            },
          ].map((item) => (
            <Card key={item.title} className="p-6 border-2 border-border/60 bg-card/90">
              <div className="flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  {item.badge}
                </p>
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
            {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-center md:text-left">
            Built by{" "}
            <a
              href="https://shaonresume.netlify.app"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              Shaon Majumder
            </a>{" "}
            — Senior Software Engineer (AI &amp; Scalability)
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
            <a
              href="https://www.linkedin.com/in/shaonmajumder"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/ShaonMajumder"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              GitHub
            </a>
            <a
              href="https://medium.com/@shaonmajumder"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              Medium
            </a>
            <a
              href="https://shaonresume.netlify.app"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              Portfolio
            </a>
            <a
              href="https://docs.google.com/document/d/1frKGGkaE1nG9G8mTkxUoPfcU0jppSZYOy4VMPTlIb-Y/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              Resume
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
