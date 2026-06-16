import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
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
import { Save, Loader2, Box, FileText, Sparkles, Camera, Upload, Wand2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { planAllows, type PlanTier } from "@/lib/plans";
import { getMyPlan, getProject, saveProject } from "@/lib/projects.functions";
import { BUILTIN_TEMPLATES, getBuiltinTemplate } from "@/lib/builtin-templates";
import { analyzePlanFile } from "@/lib/vision.functions";

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
  visibleLayers: { base: true, electric: true, network: true, roads: true },
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
          visibleLayers: { ...INITIAL.visibleLayers, ...(d.visibleLayers ?? {}) },
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
                <TabsTrigger value="analisar">Câmera / PDF</TabsTrigger>
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
              <TabsContent value="analisar" className="mt-2 flex-1">
                <AnalyzePanel onApplyShapes={applyAIShapes} />
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
    road: "#475569",
    highway: "#1F2937",
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom((z) => Math.max(0.2, Math.min(6, z * factor)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const all = shapes.filter((s) => s.type === "room" || s.type === "wall" || s.type === "road" || s.type === "highway");
  if (all.length === 0) {
    return (
      <div className="flex h-full min-h-[460px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        <div className="text-center">
          <Box className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-2">Desenhe paredes, cômodos ou rodovias no 2D para ver o 3D.</p>
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
  const vbW = 600 / zoom;
  const vbH = 500 / zoom;
  const vbX = -300 / zoom - pan.x / zoom;
  const vbY = -200 / zoom - pan.y / zoom;
  return (
    <div
      ref={wrapRef}
      className="relative flex h-full min-h-[460px] items-center justify-center overflow-hidden rounded-lg border bg-[#F1F7FF]"
      style={{ cursor: drag ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        setDrag({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        setPan({ x: drag.px + (e.clientX - drag.sx), y: drag.py + (e.clientY - drag.sy) });
      }}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
    >
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className="h-full w-full touch-none select-none">
        <g>
          {all.map((s) => {
            if (s.type === "road" || s.type === "highway") {
              const x1 = s.x1 - minX, y1 = s.y1 - minY, x2 = s.x2 - minX, y2 = s.y2 - minY;
              const w = s.type === "highway" ? 7 : 4;
              const dx = x2 - x1, dy = y2 - y1;
              const len = Math.hypot(dx, dy) || 1;
              const nx = -dy / len * (w / 2);
              const ny = dx / len * (w / 2);
              const p = (x: number, y: number) => `${ISO_X(x, y)},${ISO_Y(x, y)}`;
              const surface = `M${p(x1 + nx, y1 + ny)} L${p(x2 + nx, y2 + ny)} L${p(x2 - nx, y2 - ny)} L${p(x1 - nx, y1 - ny)} Z`;
              return (
                <g key={s.id}>
                  <path d={surface} fill={s.type === "highway" ? "#111827" : "#374151"} stroke="#0F172A" strokeWidth="0.5" />
                  <line
                    x1={ISO_X(x1, y1)} y1={ISO_Y(x1, y1)}
                    x2={ISO_X(x2, y2)} y2={ISO_Y(x2, y2)}
                    stroke="#FACC15" strokeWidth="1"
                    strokeDasharray={s.type === "road" ? "6,4" : undefined}
                  />
                </g>
              );
            }
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
      <div className="absolute right-2 top-2 flex gap-1 rounded-md border bg-background/90 p-1 backdrop-blur">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))} title="Diminuir zoom">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="self-center px-1 font-mono text-[10px]">{Math.round(zoom * 100)}%</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(6, z * 1.2))} title="Aumentar zoom">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Resetar vista">
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
        Scroll = zoom · Arraste = mover
      </div>
    </div>
  );
}

const ANALYZE_SHAPE_RE = /```alfa-shapes\s*([\s\S]*?)```/g;

function AnalyzePanel({
  onApplyShapes,
}: {
  onApplyShapes: (shapes: Shape[], mode: "append" | "replace") => void;
}) {
  const analyze = useServerFn(analyzePlanFile);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const pick = (f: File | null) => {
    setFile(f);
    setResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f && f.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  };

  const submit = async () => {
    if (!file) {
      toast.error("Escolha uma imagem ou PDF da planta");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 8 MB)");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const dataBase64 = btoa(binary);
      const res = await analyze({
        data: {
          filename: file.name,
          mime: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          dataBase64,
          instructions: instructions.trim() || undefined,
        },
      });
      setResult(res.text);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao analisar");
    } finally {
      setLoading(false);
    }
  };

  const blocks = useMemo(() => {
    if (!result) return [] as { shapes: Shape[] }[];
    const out: { shapes: Shape[] }[] = [];
    const re = new RegExp(ANALYZE_SHAPE_RE);
    let m: RegExpExecArray | null;
    while ((m = re.exec(result)) !== null) {
      try {
        const arr = JSON.parse(m[1].trim());
        if (Array.isArray(arr)) {
          const shapes: Shape[] = arr
            .filter(
              (s) =>
                s && typeof s === "object" &&
                ["wall", "room", "electric", "network", "road", "highway"].includes(s.type) &&
                [s.x1, s.y1, s.x2, s.y2].every((n: unknown) => typeof n === "number"),
            )
            .map((s) => ({
              id: crypto.randomUUID(),
              type: s.type,
              x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2,
            }));
          if (shapes.length) out.push({ shapes });
        }
      } catch { /* ignore */ }
    }
    return out;
  }, [result]);

  const cleanText = useMemo(() => result?.replace(ANALYZE_SHAPE_RE, "\n_(✨ formas reconstruídas — veja botões abaixo)_\n") ?? "", [result]);

  return (
    <div className="flex h-full min-h-[460px] flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
          <Camera className="mr-1.5 h-4 w-4" /> Câmera
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1.5 h-4 w-4" /> Imagem / PDF
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {file && (
          <Badge variant="outline" className="max-w-[220px] truncate">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </Badge>
        )}
        <div className="ml-auto" />
        <Button
          size="sm"
          onClick={submit}
          disabled={loading || !file}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
          Analisar planta
        </Button>
      </div>

      <Textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder='Instruções opcionais — ex.: "foque nos cômodos do andar térreo" ou "estime as dimensões em metros"'
        rows={2}
        className="text-sm"
      />

      <div className="grid flex-1 gap-3 overflow-hidden md:grid-cols-2">
        <div className="flex min-h-[240px] items-center justify-center overflow-hidden rounded-md border bg-muted/30">
          {previewUrl ? (
            <img src={previewUrl} alt="Pré-visualização da planta" className="max-h-full max-w-full object-contain" />
          ) : file ? (
            <div className="text-center text-sm text-muted-foreground">
              <FileText className="mx-auto h-10 w-10 opacity-40" />
              <p className="mt-2">{file.name}</p>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <Camera className="mx-auto h-10 w-10 opacity-40" />
              <p className="mt-2">Tire uma foto ou envie um PDF da planta para análise.</p>
            </div>
          )}
        </div>
        <div className="flex min-h-[240px] flex-col overflow-hidden rounded-md border">
          <div className="border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Análise da IA
          </div>
          <div className="flex-1 overflow-y-auto p-3 text-sm">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Analisando planta...
              </div>
            )}
            {!loading && !result && (
              <p className="text-muted-foreground">A análise aparecerá aqui.</p>
            )}
            {result && (
              <>
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                  <ReactMarkdown>{cleanText}</ReactMarkdown>
                </div>
                {blocks.map((b, i) => (
                  <div key={i} className="mt-2 flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => {
                        onApplyShapes(b.shapes, "append");
                        toast.success(`${b.shapes.length} formas adicionadas ao plano`);
                      }}
                    >
                      <Wand2 className="mr-1 h-3 w-3" /> Aplicar ({b.shapes.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => {
                        onApplyShapes(b.shapes, "replace");
                        toast.success("Plano substituído pela reconstrução");
                      }}
                    >
                      Substituir tudo
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
