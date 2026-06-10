import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { chatAlfaIA } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import type { PlanTier } from "@/lib/plans";
import type { Shape } from "./CanvasEditor";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  plan: PlanTier;
  shapes: Shape[];
  summary?: string;
};

export function AIChat({ plan, shapes, summary }: Props) {
  const chat = useServerFn(chatAlfaIA);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o **Arquiteto IA** da Alfa Construtora. Posso ajudar você a esboçar plantas, calcular materiais e tirar dúvidas técnicas. O que vamos projetar hoje?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({
        data: {
          messages: next,
          projectContext: { plan, shapes, summary },
        },
      });
      setMessages([...next, { role: "assistant", content: res.text }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao falar com a IA.";
      toast.error(msg);
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">Arquiteto IA</div>
          <div className="text-xs text-muted-foreground">Plano {plan}</div>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-strong:text-current">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> pensando...
          </div>
        )}
      </div>
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo, peça um esboço ou um cálculo..."
            rows={2}
            className="min-h-[44px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
