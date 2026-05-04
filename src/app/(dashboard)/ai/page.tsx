"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { ACTION_DEFINITIONS } from "@/lib/ai/action-definitions";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function AiPage() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/ai/conversations");
      return res.json();
    },
  });
  const { data: activeConversation } = useQuery({
    queryKey: ["ai-conversation", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const res = await fetch(`/api/ai/conversations/${conversationId}`);
      return res.json();
    },
  });

  const { data: executions } = useQuery({
    queryKey: ["ai-executions"],
    queryFn: async () => {
      const res = await fetch("/api/ai/executions");
      return res.json();
    },
  });

  const { data: permissions } = useQuery({
    queryKey: ["ai-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/ai/permissions");
      return res.json();
    },
  });

  const updatePermission = useMutation({
    mutationFn: async (payload: { actionKey: string; allowed: boolean }) => {
      const res = await fetch("/api/ai/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-permissions"] });
    },
  });

  const ask = useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, conversationId }),
      });
      return res.json();
    },
    onSuccess: (data, question) => {
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: data.answer || "Pas de réponse." },
      ]);
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["ai-executions"] });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Intelligence IA</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Assistant IA avec registre d'actions, permissions, journal d'exécution et historique persistant.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Conversations</h2>
          <div className="space-y-2 max-h-56 overflow-auto">
            {(conversations || []).map(
              (c: { id: string; title: string; updatedAt: string; messages: { content: string }[] }) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setConversationId(c.id);
                  }}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {c.messages?.[0]?.content || "Aucun message"}
                  </p>
                </button>
              )
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Permissions actions</h2>
          <div className="space-y-2">
            {ACTION_DEFINITIONS.map((action) => {
              const existing = (permissions || []).find(
                (p: { actionKey: string; allowed: boolean }) => p.actionKey === action.key
              );
              const allowed = existing ? existing.allowed : true;
              return (
                <div key={action.key} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{action.key}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      updatePermission.mutate({
                        actionKey: action.key,
                        allowed: !allowed,
                      })
                    }
                    className={`rounded-md px-2 py-1 text-xs text-white ${
                      allowed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {allowed ? "Autorisé" : "Bloqué"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Journal d'exécution</h2>
          <div className="space-y-2 max-h-56 overflow-auto">
            {(executions || []).map(
              (exec: { id: string; actionKey: string; success: boolean; createdAt: string }) => (
                <div key={exec.id} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{exec.actionKey}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {exec.success ? "Succès" : "Échec"} - {new Date(exec.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 min-h-[300px] space-y-3">
        {(conversationId ? activeConversation?.messages : messages).length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Pose une question pour commencer.</p>
        ) : (
          (conversationId ? activeConversation?.messages : messages).map(
            (m: { role: "user" | "assistant"; content: string }, idx: number) => (
            <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
              <span className="inline-block rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
                {m.content}
              </span>
            </div>
            )
          )
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
