import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { CanvasEditor, computeMetrics, type EditorState, type Shape } from "@/components/CanvasEditor";
import { AIChat } from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Loader2, Box, FileText, Sparkles } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { planAllows, type PlanTier } from "@/lib/plans";
import { getMyPlan, getProject, saveProject } from "@/lib/projects.functions";
import { BUILTIN_TEMPLATES, getBuiltinTemplate } from "@/lib/builtin-templates";

const searchSchema = z.object({
  id: z.string().uuid().optional(),
  tpl: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/editor")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Editor — Alfa Construtora" }] }),
  component: EditorPage,
});

const INITIAL: EditorState = {
  shapes: [],
  visibleLayers: { base: true, electric: true, network: true },
};

function EditorPage() {
  const { id, tpl } = Route.useSearch();
  const navigate = useNavigate();
  const fetchPlan = useServerFn(getMyPlan);
  const load = useServerFn(getProject);
  const save = useServerFn(saveProject);

  const [plan, setPlan] = useState<PlanTier>("prata");
  const [state, setState] = useState<EditorState>(INITIAL);
  const [projectId, setProjectId] = useState<string | undefined>(id);
  const [name, setName] = useState("Novo projeto");
  const [description, setDescription] = useState("");
  const [makeTemplate, setMakeTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlan().then((p) => setPlan((p?.plan ?? "prata") as PlanTier));
  }, [fetchPlan]);

  // Load saved project
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    load({ data: { id } })
      .then((row) => {
        if (!row) return;
        setProjectId(row.id);
        setName(row.name);
        setDescription(row.description ?? "");
        setMakeTemplate(row.is_public_template);
        const d = (row.data ?? {}) as Partial<EditorState>;
        setState({
          shapes: Array.isArray(d.shapes) ? d.shapes : [],
          visibleLayers: d.visibleLayers ?? INITIAL.visibleLayers,
        });
      })
      .finally(() => setLoading(false));
  }, [id, load]);

  // Load builtin template
  useEffect(() => {
    if (!tpl) return;
    const t = getBuiltinTemplate(tpl);
    if (!t) return;
    setName(t.name);
    setDescription(t.description);
    setState({
      shapes: t.shapes.map((s) => ({ ...s, id: crypto.randomUUID() })),
      visibleLayers: INITIAL.visibleLayers,
    });
    toast.success(`Template "${t.name}" carregado!`);
  }, [tpl]);

  const metrics = useMemo(() => computeMetrics(state.shapes), [state.shapes]);

  const summary = useMemo(() => {
    const lines: string[] = [
      `Total de formas: ${state.shapes.length}`,
      `Área de cômodos: ${metrics.roomArea} m²`,
      `Comprimento de paredes: ${metrics.wallLength} m`,
    ];
    if (planAllows.layers(plan)) {
      lines.push(`Elétrica: ${metrics.electricLen} m`, `Rede: ${metrics.networkLen} m`);
    }
    return lines.join("\n");
  }, [state.shapes, metrics, plan]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao projeto");
      return;
    }
    setSaving(true);
    try {
      const res = await save({
        data: {
          id: projectId ?? null,
          name: name.trim(),
          description: description.trim() || null,
          data: state as unknown as Record<string, unknown>,
          is_public_template: makeTemplate,
        },
      });
      setProjectId(res.id);
      navigate({ to: "/editor", search: { id: res.id }, replace: true });
      toast.success("Projeto salvo!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const applyAIShapes = (shapes: Shape[], mode: "append" | "replace") => {
    setState((s) => ({
      ...s,
      shapes: mode === "replace" ? shapes : [...s.shapes, ...shapes],
    }));
  };

  const loadTemplate = (id: string) => {
    navigate({ to: "/editor", search: { tpl: id } });
  };

  const showTemplateGallery = !projectId && !tpl && state.shapes.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1500px] flex-1 px-3 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-[280px] text-base font-semibold"
              placeholder="Nome do projeto"
            />
            <Badge variant="outline" className="capitalize">
              Plano {plan}
            </Badge>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
              <Switch id="tpl" checked={makeTemplate} onCheckedChange={setMakeTemplate} />
              <Label htmlFor="tpl" className="cursor-pointer text-xs">
                Publicar como template
              </Label>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/projetos">Meus projetos</Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="flex min-h-[640px] flex-col">
            <Tabs defaultValue="2d" className="flex flex-1 flex-col">
              <TabsList className="w-fit">
                <TabsTrigger value="2d">Plano Cartesiano 2D</TabsTrigger>
                <TabsTrigger value="3d" disabled={!planAllows.ai3D(plan)}>
                  3D {!planAllows.ai3D(plan) && <Badge variant="outline" className="ml-2 text-[10px]">Bronze+</Badge>}
                </TabsTrigger>
                <TabsTrigger value="info">Detalhes</TabsTrigger>
              </TabsList>
              <TabsContent value="2d" className="relative mt-2 flex-1">
                <CanvasEditor plan={plan} value={state} onChange={setState} />
                {showTemplateGallery && (
                  <TemplateOverlay onSelect={loadTemplate} onBlank={() => setState({ ...state, shapes: [] })} />
                )}
              </TabsContent>
              <TabsContent value="3d" className="mt-2 flex-1">
                <Preview3D shapes={state.shapes} />
              </TabsContent>
              <TabsContent value="info" className="mt-2">
                <div className="space-y-3 rounded-lg border bg-card p-4">
                  <div>
                    <Label>Descrição do projeto</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Explique o que é este projeto..."
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <MetricsBar metrics={metrics} plan={plan} />
          </div>

          <div className="h-[640px] lg:sticky lg:top-20">
            <AIChat plan={plan} shapes={state.shapes} summary={summary} onApplyShapes={applyAIShapes} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateOverlay({
  onSelect,
  onBlank,
}: {
  onSelect: (id: string) => void;
  onBlank: () => void;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="max-h-full w-full max-w-3xl overflow-auto border-accent/30 shadow-xl">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Comece em segundos</h2>
              <p className="text-sm text-muted-foreground">
                Escolha um template pronto, peça à IA, ou comece do zero.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {BUILTIN_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setOpen(false);
                  onSelect(t.id);
                }}
                className="group flex flex-col rounded-lg border bg-card p-3 text-left transition hover:border-accent hover:shadow-md"
              >
                <div className="mb-2">
                  <TemplateThumb shapes={t.shapes} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t.name}</div>
                  <Badge variant="outline" className="text-[10px]">
                    {t.category}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                onBlank();
              }}
            >
              <FileText className="mr-1.5 h-4 w-4" /> Começar em branco
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateThumb({ shapes }: { shapes: Shape[] }) {
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
      className="h-24 w-full rounded bg-gradient-to-br from-sky-50 to-slate-50"
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

function MetricsBar({
  metrics,
  plan,
}: {
  metrics: ReturnType<typeof computeMetrics>;
  plan: PlanTier;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border bg-card p-3 text-xs sm:grid-cols-4 lg:grid-cols-6">
      <Stat label="Área cômodos" value={`${metrics.roomArea} m²`} />
      <Stat label="Paredes" value={`${metrics.wallLength} m`} />
      <Stat label="Tijolos" value={`${metrics.bricks.toLocaleString("pt-BR")} un`} />
      <Stat label="Cimento" value={`${metrics.cementBags} sacos`} />
      <Stat label="Areia" value={`${metrics.sandM3} m³`} />
      <Stat label="Pisos" value={`${metrics.tiles} m²`} />
      {planAllows.layers(plan) && (
        <>
          <Stat label="Elétrica" value={`${metrics.electricLen} m`} />
          <Stat label="Rede" value={`${metrics.networkLen} m`} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}

function Preview3D({ shapes }: { shapes: EditorState["shapes"] }) {
  const ISO_X = (x: number, y: number) => (x - y) * 18;
  const ISO_Y = (x: number, y: number, z = 0) => (x + y) * 9 - z * 22;
  const all = shapes.filter((s) => s.type === "room" || s.type === "wall");
  if (all.length === 0) {
    return (
      <div className="flex h-full min-h-[460px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        <div className="text-center">
          <Box className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-2">Desenhe paredes ou cômodos no 2D para ver o 3D.</p>
        </div>
      </div>
    );
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of all) {
    minX = Math.min(minX, s.x1, s.x2);
    maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxY = Math.max(maxY, s.y1, s.y2);
  }
  const H = 2.8;
  return (
    <div className="flex h-full min-h-[460px] items-center justify-center overflow-hidden rounded-lg border bg-[#F1F7FF]">
      <svg viewBox="-300 -200 600 500" className="h-full w-full">
        <g>
          {all.map((s) => {
            if (s.type === "room") {
              const x1 = Math.min(s.x1, s.x2) - minX;
              const x2 = Math.max(s.x1, s.x2) - minX;
              const y1 = Math.min(s.y1, s.y2) - minY;
              const y2 = Math.max(s.y1, s.y2) - minY;
              const p = (x: number, y: number, z = 0) => `${ISO_X(x, y)},${ISO_Y(x, y, z)}`;
              const floor = `M${p(x1, y1)} L${p(x2, y1)} L${p(x2, y2)} L${p(x1, y2)} Z`;
              const wall1 = `M${p(x1, y1)} L${p(x2, y1)} L${p(x2, y1, H)} L${p(x1, y1, H)} Z`;
              const wall2 = `M${p(x2, y1)} L${p(x2, y2)} L${p(x2, y2, H)} L${p(x2, y1, H)} Z`;
              return (
                <g key={s.id}>
                  <path d={floor} fill="#CBD5E1" stroke="#475569" strokeWidth="1" />
                  <path d={wall1} fill="#E2E8F0" stroke="#475569" strokeWidth="1" />
                  <path d={wall2} fill="#94A3B8" stroke="#475569" strokeWidth="1" />
                </g>
              );
            }
            const x1 = s.x1 - minX, y1 = s.y1 - minY, x2 = s.x2 - minX, y2 = s.y2 - minY;
            const p = (x: number, y: number, z = 0) => `${ISO_X(x, y)},${ISO_Y(x, y, z)}`;
            return (
              <path
                key={s.id}
                d={`M${p(x1, y1)} L${p(x2, y2)} L${p(x2, y2, H)} L${p(x1, y1, H)} Z`}
                fill="#94A3B8"
                stroke="#0F172A"
                strokeWidth="1"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
