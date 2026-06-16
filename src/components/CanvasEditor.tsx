import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Square,
  Minus,
  Zap,
  Network,
  Eraser,
  Eye,
  EyeOff,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Route as RouteIcon,
  Milestone,
} from "lucide-react";
import { planAllows, type PlanTier } from "@/lib/plans";

export type Shape = {
  id: string;
  type: "wall" | "room" | "electric" | "network" | "road" | "highway";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type LayerKey = "base" | "electric" | "network" | "roads";

type Tool = "select" | "wall" | "room" | "electric" | "network" | "road" | "highway" | "erase";

const BASE_SCALE = 40; // pixels per meter at zoom 1
const SNAP = 0.25;

const LAYER_OF: Record<Shape["type"], LayerKey> = {
  wall: "base",
  room: "base",
  electric: "electric",
  network: "network",
  road: "roads",
  highway: "roads",
};

const COLORS: Record<Shape["type"], string> = {
  wall: "#0F172A",
  room: "#0EA5E9",
  electric: "#F59E0B",
  network: "#2563EB",
  road: "#475569",
  highway: "#1F2937",
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 40 }); // px offset for origin from top-left & bottom
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [panDrag, setPanDrag] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const allowsLayers = planAllows.layers(plan);
  const SCALE = BASE_SCALE * zoom;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: Math.max(400, el.clientHeight) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ORIGIN_X = pan.x;
  const ORIGIN_Y_FROM_TOP = size.h - pan.y;

  const toScreen = useCallback(
    (mx: number, my: number) => ({ x: ORIGIN_X + mx * SCALE, y: ORIGIN_Y_FROM_TOP - my * SCALE }),
    [ORIGIN_X, ORIGIN_Y_FROM_TOP, SCALE],
  );
  const toWorld = useCallback(
    (sx: number, sy: number) => {
      const mx = (sx - ORIGIN_X) / SCALE;
      const my = (ORIGIN_Y_FROM_TOP - sy) / SCALE;
      return { x: Math.round(mx / SNAP) * SNAP, y: Math.round(my / SNAP) * SNAP };
    },
    [ORIGIN_X, ORIGIN_Y_FROM_TOP, SCALE],
  );

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

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, size.w, size.h);

    // Grid 1m
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    const startMx = Math.floor(-ORIGIN_X / SCALE);
    const endMx = Math.ceil((size.w - ORIGIN_X) / SCALE);
    const startMy = Math.floor(-(size.h - ORIGIN_Y_FROM_TOP) / SCALE);
    const endMy = Math.ceil(ORIGIN_Y_FROM_TOP / SCALE);
    for (let i = startMx; i <= endMx; i++) {
      const x = ORIGIN_X + i * SCALE;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.h);
      ctx.stroke();
    }
    for (let j = startMy; j <= endMy; j++) {
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

    // Labels
    ctx.fillStyle = "#475569";
    ctx.font = "10px Inter, sans-serif";
    const step = zoom < 0.6 ? 5 : zoom < 1.2 ? 2 : 1;
    for (let i = startMx; i <= endMx; i += step) {
      if (i === 0) continue;
      const x = ORIGIN_X + i * SCALE;
      ctx.fillText(`${i}m`, x + 2, ORIGIN_Y_FROM_TOP + 14);
    }
    for (let j = startMy; j <= endMy; j += step) {
      if (j === 0) continue;
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
      } else if (s.type === "road" || s.type === "highway") {
        // Asphalt body (thick) with yellow center stripe (dashed for road, solid for highway)
        const widthM = s.type === "highway" ? 7 : 4; // meters of asphalt width
        const px = widthM * SCALE;
        ctx.lineCap = "round";
        ctx.lineWidth = px;
        ctx.strokeStyle = s.type === "highway" ? "#111827" : "#374151";
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        // Shoulder edges
        ctx.lineWidth = Math.max(1, px * 0.06);
        ctx.strokeStyle = "#F1F5F9";
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const off = px / 2 - ctx.lineWidth;
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(p1.x + nx * off * sgn, p1.y + ny * off * sgn);
          ctx.lineTo(p2.x + nx * off * sgn, p2.y + ny * off * sgn);
          ctx.stroke();
        }
        // Center stripe
        ctx.strokeStyle = "#FACC15";
        ctx.lineWidth = Math.max(1, px * 0.05);
        if (s.type === "road") ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineCap = "butt";
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

    if (drag) {
      const p1 = toScreen(drag.x1, drag.y1);
      const p2 = toScreen(drag.x2, drag.y2);
      const tt = tool === "select" || tool === "erase" ? "wall" : (tool as Shape["type"]);
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

    if (hover && tool === "erase") {
      const p = toScreen(hover.x, hover.y);
      ctx.strokeStyle = "#EF4444";
      ctx.fillStyle = "#EF444422";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (hover) {
      const p = toScreen(hover.x, hover.y);
      ctx.fillStyle = "#F97316";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0F172A";
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.fillText(`(${hover.x.toFixed(2)}, ${hover.y.toFixed(2)}) m`, p.x + 8, p.y - 8);
    }
  }, [size, value, drag, hover, toScreen, ORIGIN_X, ORIGIN_Y_FROM_TOP, tool, zoom, SCALE]);

  const eraseAt = (wx: number, wy: number) => {
    const threshold = 0.4;
    const remaining = value.shapes.filter((s) => {
      const layer = LAYER_OF[s.type];
      if (!value.visibleLayers[layer]) return true;
      if (s.type === "room") {
        const minX = Math.min(s.x1, s.x2);
        const maxX = Math.max(s.x1, s.x2);
        const minY = Math.min(s.y1, s.y2);
        const maxY = Math.max(s.y1, s.y2);
        const onEdge =
          (wx >= minX - threshold && wx <= maxX + threshold &&
            (Math.abs(wy - minY) < threshold || Math.abs(wy - maxY) < threshold)) ||
          (wy >= minY - threshold && wy <= maxY + threshold &&
            (Math.abs(wx - minX) < threshold || Math.abs(wx - maxX) < threshold));
        return !onEdge;
      }
      const d = pointToSegmentDistance(wx, wy, s.x1, s.y1, s.x2, s.y2);
      return d > threshold;
    });
    if (remaining.length !== value.shapes.length) {
      onChange({ ...value, shapes: remaining });
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    // Pan: middle/right button or select tool
    if (e.button === 1 || e.button === 2 || tool === "select") {
      setPanDrag({ sx, sy, px: pan.x, py: pan.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    const w = toWorld(sx, sy);
    if (tool === "erase") {
      eraseAt(w.x, w.y);
      return;
    }
    setDrag({ x1: w.x, y1: w.y, x2: w.x, y2: w.y });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (panDrag) {
      setPan({ x: panDrag.px + (sx - panDrag.sx), y: panDrag.py - (sy - panDrag.sy) });
      return;
    }
    const w = toWorld(sx, sy);
    setHover(w);
    if (tool === "erase" && e.buttons === 1) {
      eraseAt(w.x, w.y);
      return;
    }
    if (drag) setDrag({ ...drag, x2: w.x, y2: w.y });
  };

  const onPointerUp = () => {
    if (panDrag) {
      setPanDrag(null);
      return;
    }
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

  // Native non-passive wheel listener so preventDefault works
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = cvs.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom((prevZoom) => {
        const newZoom = Math.max(0.3, Math.min(4, prevZoom * factor));
        const curScale = BASE_SCALE * prevZoom;
        setPan((prevPan) => {
          const curOriginX = prevPan.x;
          const curOriginYFromTop = size.h - prevPan.y;
          const worldX = (sx - curOriginX) / curScale;
          const worldY = (curOriginYFromTop - sy) / curScale;
          const newScale = BASE_SCALE * newZoom;
          const newOriginX = sx - worldX * newScale;
          const newOriginYFromTop = sy + worldY * newScale;
          return { x: newOriginX, y: size.h - newOriginYFromTop };
        });
        return newZoom;
      });
    };
    cvs.addEventListener("wheel", handler, { passive: false });
    return () => cvs.removeEventListener("wheel", handler);
  }, [size.h]);


  const toggleLayer = (k: LayerKey) =>
    onChange({ ...value, visibleLayers: { ...value.visibleLayers, [k]: !value.visibleLayers[k] } });

  const resetView = () => {
    setZoom(1);
    setPan({ x: 60, y: 40 });
  };

  const tools: { id: Tool; label: string; icon: React.ReactNode; locked?: boolean }[] = [
    { id: "select", label: "Mover", icon: <Hand className="h-4 w-4" /> },
    { id: "wall", label: "Parede", icon: <Minus className="h-4 w-4" /> },
    { id: "room", label: "Cômodo", icon: <Square className="h-4 w-4" /> },
    { id: "electric", label: "Elétrica", icon: <Zap className="h-4 w-4" />, locked: !allowsLayers },
    { id: "network", label: "Rede", icon: <Network className="h-4 w-4" />, locked: !allowsLayers },
    { id: "erase", label: "Borracha", icon: <Eraser className="h-4 w-4" /> },
  ];

  const cursor = tool === "select" || panDrag ? "grab" : tool === "erase" ? "crosshair" : "crosshair";

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
            <Button key={k} size="sm" variant="ghost" className="h-8" onClick={() => toggleLayer(k)}>
              {value.visibleLayers[k] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-50" />}
              <span className="ml-1 text-xs">
                {k === "base" ? "Estrutura" : k === "electric" ? "Elétrica" : "Rede"}
              </span>
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))} title="Diminuir zoom">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setZoom((z) => Math.min(4, z * 1.2))} title="Aumentar zoom">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={resetView} title="Resetar vista">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="ml-2 hidden items-center gap-1 sm:flex">
            <Grid3x3 className="h-3.5 w-3.5" /> 1m · snap {SNAP}m
          </div>
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
            setPanDrag(null);
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="block touch-none"
          style={{ cursor }}
        />
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
          Scroll = zoom · Arraste com Mover/botão direito = pan
        </div>
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
  const totalWall = wallLength + roomPerimeter;
  const wallAreaM2 = totalWall * 2.8;
  const bricks = Math.ceil(wallAreaM2 * 39);
  const cementBags = Math.ceil(wallAreaM2 * 0.5);
  const sandM3 = +(wallAreaM2 * 0.07).toFixed(2);
  const floorArea = roomArea;
  const tiles = Math.ceil(floorArea * 1.1);
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
