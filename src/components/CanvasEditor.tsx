import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MousePointer2,
  Square,
  Minus,
  Zap,
  Network,
  Trash2,
  Eye,
  EyeOff,
  Grid3x3,
} from "lucide-react";
import { planAllows, type PlanTier } from "@/lib/plans";

export type Shape = {
  id: string;
  type: "wall" | "room" | "electric" | "network";
  x1: number; // meters
  y1: number;
  x2: number;
  y2: number;
};

export type LayerKey = "base" | "electric" | "network";

type Tool = "select" | "wall" | "room" | "electric" | "network" | "erase";

const SCALE = 40; // pixels per meter at zoom 1
const SNAP = 0.25; // meters

const LAYER_OF: Record<Shape["type"], LayerKey> = {
  wall: "base",
  room: "base",
  electric: "electric",
  network: "network",
};

const COLORS: Record<Shape["type"], string> = {
  wall: "#0F172A",
  room: "#0EA5E9",
  electric: "#F59E0B",
  network: "#2563EB",
};

export type EditorState = {
  shapes: Shape[];
  visibleLayers: Record<LayerKey, boolean>;
};

type Props = {
  plan: PlanTier;
  value: EditorState;
  onChange: (s: EditorState) => void;
};

export function CanvasEditor({ plan, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [tool, setTool] = useState<Tool>("wall");
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const allowsLayers = planAllows.layers(plan);

  // Resize
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: Math.max(400, el.clientHeight) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // World <-> screen. Origin (0,0) at bottom-left with margin.
  const ORIGIN_X = 60;
  const ORIGIN_Y_FROM_TOP = size.h - 40;
  const toScreen = useCallback(
    (mx: number, my: number) => ({ x: ORIGIN_X + mx * SCALE, y: ORIGIN_Y_FROM_TOP - my * SCALE }),
    [ORIGIN_Y_FROM_TOP],
  );
  const toWorld = useCallback(
    (sx: number, sy: number) => {
      const mx = (sx - ORIGIN_X) / SCALE;
      const my = (ORIGIN_Y_FROM_TOP - sy) / SCALE;
      return { x: Math.round(mx / SNAP) * SNAP, y: Math.round(my / SNAP) * SNAP };
    },
    [ORIGIN_Y_FROM_TOP],
  );

  // Draw
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    cvs.width = size.w * dpr;
    cvs.height = size.h * dpr;
    cvs.style.width = `${size.w}px`;
    cvs.style.height = `${size.h}px`;
    const ctx = cvs.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.w, size.h);

    // Background
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, size.w, size.h);

    // Grid (1m squares)
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    const maxX = Math.ceil((size.w - ORIGIN_X) / SCALE);
    const maxY = Math.ceil(ORIGIN_Y_FROM_TOP / SCALE);
    for (let i = 0; i <= maxX; i++) {
      const x = ORIGIN_X + i * SCALE;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.h);
      ctx.stroke();
    }
    for (let j = 0; j <= maxY; j++) {
      const y = ORIGIN_Y_FROM_TOP - j * SCALE;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.w, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ORIGIN_X, 0);
    ctx.lineTo(ORIGIN_X, size.h);
    ctx.moveTo(0, ORIGIN_Y_FROM_TOP);
    ctx.lineTo(size.w, ORIGIN_Y_FROM_TOP);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "#475569";
    ctx.font = "10px Inter, sans-serif";
    for (let i = 0; i <= maxX; i += 2) {
      const x = ORIGIN_X + i * SCALE;
      ctx.fillText(`${i}m`, x + 2, ORIGIN_Y_FROM_TOP + 14);
    }
    for (let j = 0; j <= maxY; j += 2) {
      const y = ORIGIN_Y_FROM_TOP - j * SCALE;
      ctx.fillText(`${j}m`, 4, y - 2);
    }

    // Shapes
    for (const s of value.shapes) {
      const layer = LAYER_OF[s.type];
      if (!value.visibleLayers[layer]) continue;
      const p1 = toScreen(s.x1, s.y1);
      const p2 = toScreen(s.x2, s.y2);
      ctx.strokeStyle = COLORS[s.type];
      ctx.fillStyle = COLORS[s.type] + "22";
      if (s.type === "room") {
        ctx.lineWidth = 2;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else {
        ctx.lineWidth = s.type === "wall" ? 4 : 2;
        if (s.type === "electric" || s.type === "network") {
          ctx.setLineDash([6, 4]);
        }
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Drag preview
    if (drag) {
      const p1 = toScreen(drag.x1, drag.y1);
      const p2 = toScreen(drag.x2, drag.y2);
      const tt = (tool === "select" || tool === "erase") ? "wall" : (tool as Shape["type"]);
      ctx.strokeStyle = COLORS[tt];
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      if (tool === "room") {
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        ctx.strokeRect(x, y, Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
      } else {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Hover crosshair + coord
    if (hover) {
      const p = toScreen(hover.x, hover.y);
      ctx.fillStyle = "#F97316";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0F172A";
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.fillText(`(${hover.x.toFixed(2)}, ${hover.y.toFixed(2)}) m`, p.x + 8, p.y - 8);
    }
  }, [size, value, drag, hover, toScreen, ORIGIN_Y_FROM_TOP, tool]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "select") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const w = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (w.x < 0 || w.y < 0) return;
    if (tool === "erase") {
      // Find closest shape and remove
      const remaining = value.shapes.filter((s) => {
        const layer = LAYER_OF[s.type];
        if (!value.visibleLayers[layer]) return true;
        const d = pointToSegmentDistance(w.x, w.y, s.x1, s.y1, s.x2, s.y2);
        return d > 0.3;
      });
      if (remaining.length !== value.shapes.length) {
        onChange({ ...value, shapes: remaining });
      }
      return;
    }
    setDrag({ x1: w.x, y1: w.y, x2: w.x, y2: w.y });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const w = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    setHover(w);
    if (drag) setDrag({ ...drag, x2: w.x, y2: w.y });
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (tool !== "select" && tool !== "erase") {
      const dx = drag.x2 - drag.x1;
      const dy = drag.y2 - drag.y1;
      if (Math.abs(dx) >= SNAP || Math.abs(dy) >= SNAP) {
        const newShape: Shape = {
          id: crypto.randomUUID(),
          type: tool,
          x1: drag.x1,
          y1: drag.y1,
          x2: drag.x2,
          y2: drag.y2,
        };
        onChange({ ...value, shapes: [...value.shapes, newShape] });
      }
    }
    setDrag(null);
  };

  const toggleLayer = (k: LayerKey) =>
    onChange({ ...value, visibleLayers: { ...value.visibleLayers, [k]: !value.visibleLayers[k] } });

  const clearAll = () => {
    if (confirm("Limpar todas as formas do projeto?")) {
      onChange({ ...value, shapes: [] });
    }
  };

  const tools: { id: Tool; label: string; icon: React.ReactNode; locked?: boolean }[] = [
    { id: "select", label: "Mover", icon: <MousePointer2 className="h-4 w-4" /> },
    { id: "wall", label: "Parede", icon: <Minus className="h-4 w-4" /> },
    { id: "room", label: "Cômodo", icon: <Square className="h-4 w-4" /> },
    { id: "electric", label: "Elétrica", icon: <Zap className="h-4 w-4" />, locked: !allowsLayers },
    { id: "network", label: "Rede", icon: <Network className="h-4 w-4" />, locked: !allowsLayers },
    { id: "erase", label: "Apagar", icon: <Trash2 className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <div className="flex flex-wrap gap-1">
          {tools.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tool === t.id ? "default" : "ghost"}
              disabled={t.locked}
              onClick={() => setTool(t.id)}
              title={t.locked ? "Disponível no plano Ouro ou superior" : t.label}
              className="h-8"
            >
              {t.icon}
              <span className="ml-1 hidden sm:inline">{t.label}</span>
              {t.locked && (
                <Badge variant="outline" className="ml-1.5 hidden text-[10px] sm:inline-flex">
                  Ouro
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <div className="mx-2 h-6 w-px bg-border" />
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs font-medium text-muted-foreground">Camadas:</span>
          {(["base", "electric", "network"] as LayerKey[]).map((k) => (
            <Button
              key={k}
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => toggleLayer(k)}
            >
              {value.visibleLayers[k] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-50" />}
              <span className="ml-1 text-xs">
                {k === "base" ? "Estrutura" : k === "electric" ? "Elétrica" : "Rede"}
              </span>
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Grid3x3 className="h-3.5 w-3.5" />
          Grade 1m · snap {SNAP}m
          <Button size="sm" variant="ghost" className="ml-2 h-8 text-destructive" onClick={clearAll}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      </div>

      <div ref={wrapRef} className="relative min-h-[460px] flex-1 overflow-hidden rounded-lg border bg-card">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            setHover(null);
            setDrag(null);
          }}
          className="block cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
}

function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Material estimation helpers
export function computeMetrics(shapes: Shape[]) {
  let wallLength = 0;
  let roomArea = 0;
  let roomPerimeter = 0;
  let electricLen = 0;
  let networkLen = 0;
  for (const s of shapes) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (s.type === "wall") wallLength += len;
    if (s.type === "electric") electricLen += len;
    if (s.type === "network") networkLen += len;
    if (s.type === "room") {
      const w = Math.abs(s.x2 - s.x1);
      const h = Math.abs(s.y2 - s.y1);
      roomArea += w * h;
      roomPerimeter += 2 * (w + h);
    }
  }
  const totalWall = wallLength + roomPerimeter; // m
  // Standard assumptions: parede 2.8m altura, 39 tijolos/m², cimento 0.5 sacos/m² alvenaria
  const wallAreaM2 = totalWall * 2.8;
  const bricks = Math.ceil(wallAreaM2 * 39);
  const cementBags = Math.ceil(wallAreaM2 * 0.5);
  const sandM3 = +(wallAreaM2 * 0.07).toFixed(2);
  const floorArea = roomArea;
  const tiles = Math.ceil(floorArea * 1.1); // 10% perda
  return {
    wallLength: +totalWall.toFixed(2),
    roomArea: +roomArea.toFixed(2),
    floorArea: +floorArea.toFixed(2),
    wallAreaM2: +wallAreaM2.toFixed(2),
    bricks,
    cementBags,
    sandM3,
    tiles,
    electricLen: +electricLen.toFixed(2),
    networkLen: +networkLen.toFixed(2),
  };
}
