import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Shield, Users, FolderKanban, Globe, Crown } from "lucide-react";
import {
  amIAdmin,
  claimFirstAdmin,
  getAdminStats,
  listUsers,
  setUserRole,
} from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — Alfa Construtora" }] }),
  component: AdminPage,
});

type Stats = Awaited<ReturnType<typeof getAdminStats>>;
type UserRow = {
  id: string;
  display_name: string | null;
  plan: string;
  created_at: string;
  roles: string[];
};

const PLAN_COLORS: Record<string, string> = {
  prata: "bg-slate-200 text-slate-800",
  bronze: "bg-amber-200 text-amber-900",
  ouro: "bg-yellow-200 text-yellow-900",
  titanium: "bg-zinc-800 text-white",
};

function AdminPage() {
  const checkAdmin = useServerFn(amIAdmin);
  const claim = useServerFn(claimFirstAdmin);
  const fetchStats = useServerFn(getAdminStats);
  const fetchUsers = useServerFn(listUsers);
  const updateRole = useServerFn(setUserRole);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { isAdmin: ok } = await checkAdmin();
      setIsAdmin(ok);
      if (ok) {
        const [s, u] = await Promise.all([fetchStats(), fetchUsers()]);
        setStats(s);
        setUsers(u as UserRow[]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleClaim = async () => {
    try {
      await claim();
      toast.success("Você agora é administrador!");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const toggleRole = async (userId: string, role: "admin" | "moderator", grant: boolean) => {
    try {
      await updateRole({ data: { userId, role, grant } });
      toast.success(grant ? `Papel ${role} concedido` : `Papel ${role} removido`);
      const u = await fetchUsers();
      setUsers(u as UserRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Acesso restrito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Esta área é exclusiva para administradores. Se você é o fundador
                deste site e ainda não existe nenhum admin, você pode reivindicar
                o papel agora.
              </p>
              <Button onClick={handleClaim}>
                <Crown className="mr-2 h-4 w-4" /> Reivindicar acesso de administrador
              </Button>
              <p className="text-xs text-muted-foreground">
                Esta opção só funciona se ainda não existir nenhum administrador.
              </p>
              <Button asChild variant="ghost">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">
              Monitoramento de uso, usuários e projetos da Alfa Construtora.
            </p>
          </div>
          <Badge className="bg-primary text-primary-foreground">
            <Shield className="mr-1 h-3 w-3" /> Admin
          </Badge>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Usuários cadastrados"
            value={stats?.totals.users ?? 0}
          />
          <StatCard
            icon={<FolderKanban className="h-5 w-5" />}
            label="Projetos criados"
            value={stats?.totals.projects ?? 0}
          />
          <StatCard
            icon={<Globe className="h-5 w-5" />}
            label="Templates públicos"
            value={stats?.totals.templates ?? 0}
          />
        </div>

        {/* Distribuição de planos */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Distribuição por plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(stats?.planCounts ?? {}).map(([plan, count]) => (
                <div
                  key={plan}
                  className="rounded-lg border bg-card p-4 text-center"
                >
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {plan}
                  </div>
                  <div className="mt-1 text-2xl font-bold">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Projetos recentes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recentProjects.length ? (
              <p className="text-sm text-muted-foreground">Nenhum projeto ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Visibilidade</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentProjects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        {p.is_public_template ? (
                          <Badge variant="secondary">Público</Badge>
                        ) : (
                          <Badge variant="outline">Privado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(p.updated_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Usuários */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Usuários ({users?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users ?? []).map((u) => {
                  const hasAdmin = u.roles.includes("admin");
                  const hasMod = u.roles.includes("moderator");
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.display_name ?? u.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                            PLAN_COLORS[u.plan] ?? ""
                          }`}
                        >
                          {u.plan}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            u.roles.map((r) => (
                              <Badge key={r} variant="secondary">
                                {r}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={hasAdmin ? "destructive" : "outline"}
                          onClick={() => toggleRole(u.id, "admin", !hasAdmin)}
                          className="mr-2"
                        >
                          {hasAdmin ? "Remover admin" : "Tornar admin"}
                        </Button>
                        <Button
                          size="sm"
                          variant={hasMod ? "destructive" : "outline"}
                          onClick={() => toggleRole(u.id, "moderator", !hasMod)}
                        >
                          {hasMod ? "Remover mod" : "Tornar mod"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold">{value.toLocaleString("pt-BR")}</div>
        </div>
      </CardContent>
    </Card>
  );
}
