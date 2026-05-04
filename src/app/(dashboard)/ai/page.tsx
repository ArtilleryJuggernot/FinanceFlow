"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function AiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const ask = useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      return res.json();
    },
    onSuccess: (data, question) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: data.answer || "Pas de réponse." },
      ]);
      setInput("");
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Intelligence IA</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Assistant connecté à OpenRouter (base v1). Les actions MCP internes seront branchées en v2.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 min-h-[300px] space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Pose une question pour commencer.</p>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
              <span className="inline-block rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
                {m.content}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && input && ask.mutate(input)}
          placeholder="Ex: analyse mes dépenses de ce mois"
          className="h-10 flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
        />
        <button
          onClick={() => input && ask.mutate(input)}
          disabled={ask.isPending || !input.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-white disabled:opacity-50"
        >
          {ask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Envoyer
        </button>
      </div>
    </div>
  );
}
