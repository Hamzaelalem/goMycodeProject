"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export type Msg = { id: string; role: "user" | "assistant"; text: string };

export function useAIAssistantDrawerViewModel() {
  const open = useGlobalStore((s) => s.isAIDrawerOpen);
  const context = useGlobalStore((s) => s.aiDrawerContext);
  const closeAIDrawer = useGlobalStore((s) => s.closeAIDrawer);
  const getPortfolioSnapshot = useGlobalStore((s) => s.getPortfolioSnapshot);
  const setInitialMessage = useGlobalStore((s) => s.setAiDrawerInitialMessage);
  const aiModel = useGlobalStore((s) => s.aiModel);
  const aiPersona = useGlobalStore((s) => s.aiPersona);
  const setAiModel = useGlobalStore((s) => s.setAiModel);
  const setAiPersona = useGlobalStore((s) => s.setAiPersona);

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
          model: aiModel,
          persona: aiPersona,
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

  // Effect event: always sees the latest `ask` without re-running the effect
  // when it changes (it's recreated every render).
  const sendInitialMessage = useEffectEvent((message: string) => {
    setInitialMessage(null);
    void ask(message);
  });

  // The drawer is always mounted (AppShell), so react to the store transition in a
  // subscription callback instead of setting state synchronously in an effect.
  useEffect(
    () =>
      useGlobalStore.subscribe((state, prev) => {
        const message = state.aiDrawerInitialMessage;
        if (!state.isAIDrawerOpen || !message) return;
        if (state.isAIDrawerOpen !== prev.isAIDrawerOpen || message !== prev.aiDrawerInitialMessage) {
          sendInitialMessage(message);
        }
      }),
    [],
  );

  function handleCopy() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last) {
      void navigator.clipboard.writeText(last.text);
    }
  }

  function clearMessages() {
    setMessages([]);
  }

  return {
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
  };
}
