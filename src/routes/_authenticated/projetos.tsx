import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, Globe, Pencil } from "lucide-react";
import { listMyProjects, deleteProject } from "@/lib/projects.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projetos")({
  head: () => ({ meta: [{ title: "Meus Projetos — Alfa Construtora" }] }),
  component: ProjectsPage,
});

type Row = {
  id: string;
  name: string;
  description: string | null;
  is_public_template: boolean;
  updated_at: string;
};

function ProjectsPage() {
  const list = useServerFn(listMyProjects);
  const del = useServerFn(deleteProject);
  const [rows, setRows] = useState<Row[] | null>(null);

  const refresh = () => list().then((r) => setRows(r as Row[]));
  useEffect(() => {
    refresh();
  }, []);

  const handleDel = async (id: string) => {
    if (!confirm("Excluir este projeto?")) return;
    try {
      await del({ data: { id } });
      toast.success("Projeto excluído");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Meus Projetos</h1>
            <p className="text-muted-foreground">Continue de onde parou ou comece um novo.</p>
          </div>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/editor">
              <Plus className="mr-1.5 h-4 w-4" /> Novo projeto
            </Link>
          </Button>
        </div>

        <div className="mt-8">
          {rows === null ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-16 text-center">
                <h3 className="text-lg font-semibold">Nenhum projeto ainda</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crie seu primeiro projeto para começar.
                </p>
                <Button
                  asChild
                  className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Link to="/editor">
                    <Plus className="mr-1.5 h-4 w-4" /> Criar projeto
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <Card key={r.id} className="transition hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{r.name}</CardTitle>
                      {r.is_public_template && (
                        <Badge variant="outline" className="border-accent/40 text-accent">
                          <Globe className="mr-1 h-3 w-3" /> Template
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {r.description || "Sem descrição"}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Atualizado {new Date(r.updated_at).toLocaleString("pt-BR")}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link to="/editor" search={{ id: r.id }}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Abrir
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDel(r.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
