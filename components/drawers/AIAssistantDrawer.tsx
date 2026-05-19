"use client";

import { useMemo, useState } from "react";
import { Copy, Sparkles, Trash } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

type Msg = { id: string; role: "user" | "assistant"; text: string };

export function AIAssistantDrawer() {
  const open = useGlobalStore((s) => s.isAIDrawerOpen);
  const context = useGlobalStore((s) => s.aiDrawerContext);
  const closeAIDrawer = useGlobalStore((s) => s.closeAIDrawer);
  const getPortfolioSnapshot = useGlobalStore((s) => s.getPortfolioSnapshot);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const suggested = useMemo(
    () => [
      "Summarize top 3 risks in one minute",
      "Which recommendations are near approval?",
      "What changed in live signals this hour?",
    ],
    [],
  );

  async function ask(prompt: string) {
    const text = prompt.trim();
    if (!text || loading) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((m) => [...m.slice(-9), userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages.slice(-9), userMsg],
          context,
          portfolioSnapshot: getPortfolioSnapshot(),
        }),
      });
      const reader = res.body?.getReader();
      let assembled = "";
      const id = `a-${Date.now()}`;
      setMessages((m) => [...m, { id, role: "assistant", text: "" }]);
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assembled += decoder.decode(value);
          setMessages((m) => m.map((x) => (x.id === id ? { ...x, text: assembled } : x)));
        }
      } else {
        const textResp = await res.text();
        setMessages((m) => m.map((x) => (x.id === id ? { ...x, text: textResp } : x)));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeAIDrawer()}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Assistant
          </SheetTitle>
          <SheetDescription>{context || "Portfolio assistant context"}</SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 px-4">
          {suggested.map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={() => ask(s)}>
              {s}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[calc(100dvh-260px)] px-4">
          <div className="space-y-2 py-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "mr-8 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                }
              >
                {m.text}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="space-y-2 border-t border-border p-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the assistant…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => void ask(input)} disabled={loading}>
              Send
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const last = [...messages].reverse().find((m) => m.role === "assistant");
                if (last) void navigator.clipboard.writeText(last.text);
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button variant="outline" onClick={() => setMessages([])}>
              <Trash className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

