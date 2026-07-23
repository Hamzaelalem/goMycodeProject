"use client";

import { Copy, Sparkles, Trash } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAIAssistantDrawerViewModel } from "./useAIAssistantDrawerViewModel";

export function AIAssistantDrawer() {
  const {
    open,
    context,
    closeAIDrawer,
    input,
    setInput,
    messages,
    loading,
    suggested,
    ask,
    handleCopy,
    clearMessages,
    aiModel,
    aiPersona,
    setAiModel,
    setAiPersona,
  } = useAIAssistantDrawerViewModel();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeAIDrawer()}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="p-4 space-y-2 border-b border-border/40">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> AI Assistant
            </SheetTitle>
            <SheetDescription className="truncate">{context || "Portfolio assistant context"}</SheetDescription>
          </SheetHeader>
        </div>

        {/* Model and Persona Settings Block */}
        <div className="px-4 py-3 border-b border-border/40 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">Assistant model</span>
            <div className="flex rounded-md bg-muted/80 p-0.5 border border-border/60">
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  aiModel === "groq"
                    ? "bg-background shadow text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setAiModel("groq")}
              >
                Groq
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  aiModel === "gemini"
                    ? "bg-background shadow text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setAiModel("gemini")}
              >
                Gemini
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  aiModel === "ollama"
                    ? "bg-background shadow text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setAiModel("ollama")}
              >
                Ollama
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">Analyst persona</span>
            <Select value={aiPersona} onValueChange={(v) => setAiPersona(v as any)}>
              <SelectTrigger className="w-[150px] h-7 text-[11px] px-2 bg-background border-border">
                <SelectValue placeholder="Persona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Analyst</SelectItem>
                <SelectItem value="risk">Risk Specialist</SelectItem>
                <SelectItem value="esg">ESG Advocate</SelectItem>
                <SelectItem value="conservative">Conservative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-3 border-b border-border/40">
          {suggested.map((s) => (
            <Button key={s} size="xs" variant="outline" className="text-[10px]" onClick={() => ask(s)}>
              {s}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="space-y-3 py-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "mr-8 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed"
                }
              >
                {m.text}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="space-y-2 border-t border-border p-4 bg-background shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the assistant…"
            className="min-h-[60px] max-h-[100px] text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => void ask(input)} disabled={loading || !input.trim()} className="text-xs h-8">
              {loading ? "Typing…" : "Send"}
            </Button>
            <Button variant="outline" onClick={handleCopy} className="text-xs h-8">
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <Button variant="outline" onClick={clearMessages} className="text-xs h-8">
              <Trash className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


