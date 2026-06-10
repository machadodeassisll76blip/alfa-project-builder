import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Layers, ArrowRight } from "lucide-react";
import { listPublicTemplates } from "@/lib/projects.functions";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Alfa Construtora" },
      {
        name: "description",
        content: "Biblioteca de templates de projetos arquitetônicos da comunidade.",
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
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Templates da comunidade
          </h1>
          <p className="mt-2 text-muted-foreground">
            Projetos publicados por engenheiros e arquitetos. Use como ponto de partida.
          </p>
        </div>

        <div className="mt-10">
          {rows === null ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando templates...
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <h3 className="text-lg font-semibold">Ainda não há templates públicos</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Seja o primeiro! Salve um projeto e marque como "Publicar como template".
                </p>
                <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
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
        </div>
      </div>
    </div>
  );
}
