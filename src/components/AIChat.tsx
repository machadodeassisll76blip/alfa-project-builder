import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { chatAlfaIA } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Wand2 } from "lucide-react";
import type { PlanTier } from "@/lib/plans";
import type { Shape } from "./CanvasEditor";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  plan: PlanTier;
  shapes: Shape[];
  summary?: string;
  onApplyShapes?: (shapes: Shape[], mode: "append" | "replace") => void;
};

const SHAPE_RE = /```alfa-shapes\s*([\s\S]*?)```/g;

type ParsedBlock = { json: string; shapes: Shape[] | null };

function parseShapesFromContent(content: string): { stripped: string; blocks: ParsedBlock[] } {
  const blocks: ParsedBlock[] = [];
  const stripped = content.replace(SHAPE_RE, (_m, json: string) => {
    let shapes: Shape[] | null = null;
    try {
      const arr = JSON.parse(json.trim());
      if (Array.isArray(arr)) {
        shapes = arr
          .filter(
            (s) =>
              s &&
              typeof s === "object" &&
              ["wall", "room", "electric", "network"].includes(s.type) &&
              [s.x1, s.y1, s.x2, s.y2].every((n) => typeof n === "number"),
          )
          .map((s) => ({
            id: crypto.randomUUID(),
            type: s.type,
            x1: s.x1,
            y1: s.y1,
            x2: s.x2,
            y2: s.y2,
          }));
      }
    } catch {
      shapes = null;
    }
    blocks.push({ json, shapes });
    return `\n_(✨ ${shapes?.length ?? 0} formas geradas — veja abaixo)_\n`;
  });
  return { stripped, blocks };
}

export function AIChat({ plan, shapes, summary, onApplyShapes }: Props) {
  const chat = useServerFn(chatAlfaIA);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o **Arquiteto IA** da Alfa Construtora. Posso **desenhar direto no plano** — peça, por exemplo: *\"desenhe uma casa de 8x6 com 2 quartos\"* — ou tirar dúvidas técnicas. O que vamos projetar?",
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
        data: { messages: next, projectContext: { plan, shapes, summary } },
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

  const quickActions = useMemo(
    () => [
      "Desenhe uma casa simples 8x6 com 2 quartos e banheiro",
      "Adicione tomadas elétricas em todos os cômodos",
      "Calcule materiais para o projeto atual",
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">Arquiteto IA</div>
          <div className="text-xs text-muted-foreground">Desenha, calcula e responde · Plano {plan}</div>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => {
          const parsed = m.role === "assistant" ? parseShapesFromContent(m.content) : null;
          return (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-strong:text-current">
                  <ReactMarkdown>{parsed ? parsed.stripped : m.content}</ReactMarkdown>
                </div>
              </div>
              {parsed?.blocks
                .filter((b) => b.shapes && b.shapes.length > 0)
                .map((b, bi) => (
                  <div key={bi} className="mt-1.5 flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => {
                        onApplyShapes?.(b.shapes!, "append");
                        toast.success(`${b.shapes!.length} formas adicionadas ao plano`);
                      }}
                      className="h-7 bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Wand2 className="mr-1 h-3 w-3" /> Aplicar ({b.shapes!.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onApplyShapes?.(b.shapes!, "replace");
                        toast.success("Plano substituído pelo desenho da IA");
                      }}
                      className="h-7"
                    >
                      Substituir tudo
                    </Button>
                  </div>
                ))}
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> pensando...
          </div>
        )}
        {messages.length <= 1 && !loading && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {quickActions.map((q) => (
              <Button
                key={q}
                size="sm"
                variant="outline"
                className="h-auto whitespace-normal py-1.5 text-left text-xs"
                onClick={() => setInput(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Peça um desenho: "casa 10x8 com 3 quartos" ou faça uma pergunta...'
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
