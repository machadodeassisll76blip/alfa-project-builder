import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, ArrowRight, Sparkles } from "lucide-react";
import { listPublicTemplates } from "@/lib/projects.functions";
import { BUILTIN_TEMPLATES } from "@/lib/builtin-templates";
import type { Shape } from "@/components/CanvasEditor";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Alfa Construtora" },
      {
        name: "description",
        content: "Biblioteca de templates de projetos arquitetônicos da Alfa Construtora.",
      },
    ],
  }),
  component: TemplatesPage,
});

type T = { id: string; name: string; description: string | null; updated_at: string };

function TemplatesPage() {
  const list = useServerFn(listPublicTemplates);
  const [rows, setRows] = useState<T[] | null>(null);

  useEffect(() => {
    list().then((r) => setRows(r as T[]));
  }, [list]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <Layers className="mx-auto h-10 w-10 text-accent" />
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Templates de projetos</h1>
          <p className="mt-2 text-muted-foreground">
            Comece de um template pronto da Alfa ou da comunidade.
          </p>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-bold">Templates oficiais</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUILTIN_TEMPLATES.map((t) => (
              <Card key={t.id} className="overflow-hidden transition hover:shadow-md">
                <div className="border-b bg-gradient-to-br from-sky-50 to-slate-50 p-3">
                  <Thumb shapes={t.shapes} />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {t.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                  <Button
                    asChild
                    size="sm"
                    className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Link to="/editor" search={{ tpl: t.id }}>
                      Usar template <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Da comunidade</h2>
          </div>
          {rows === null ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Ainda não há templates da comunidade. Seja o primeiro!
                </p>
                <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/editor">Criar agora</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <Card key={r.id} className="transition hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">{r.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {r.description || "Sem descrição"}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(r.updated_at).toLocaleDateString("pt-BR")}</span>
                      <Link
                        to="/editor"
                        search={{ id: r.id }}
                        className="inline-flex items-center font-medium text-accent hover:underline"
                      >
                        Abrir <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Thumb({ shapes }: { shapes: Shape[] }) {
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const s of shapes) {
    minX = Math.min(minX, s.x1, s.x2);
    maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxY = Math.max(maxY, s.y1, s.y2);
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const COLOR: Record<Shape["type"], string> = {
    room: "#0EA5E9",
    wall: "#0F172A",
    electric: "#F59E0B",
    network: "#2563EB",
  };
  return (
    <svg
      viewBox={`${minX - 0.5} ${minY - 0.5} ${w + 1} ${h + 1}`}
      className="h-28 w-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ transform: "scaleY(-1)" }}
    >
      {shapes.map((s, i) => {
        if (s.type === "room") {
          const x = Math.min(s.x1, s.x2);
          const y = Math.min(s.y1, s.y2);
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.abs(s.x2 - s.x1)}
              height={Math.abs(s.y2 - s.y1)}
              fill={COLOR.room + "33"}
              stroke={COLOR.room}
              strokeWidth={0.08}
            />
          );
        }
        return (
          <line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke={COLOR[s.type]}
            strokeWidth={s.type === "wall" ? 0.18 : 0.1}
            strokeDasharray={s.type === "electric" || s.type === "network" ? "0.3,0.2" : undefined}
          />
        );
      })}
    </svg>
  );
}
