import type { Shape } from "@/components/CanvasEditor";

export type BuiltinTemplate = {
  id: string; // sempre prefixo "tpl-"
  name: string;
  description: string;
  category: "Residencial" | "Comercial" | "Industrial" | "Compacto";
  shapes: Shape[];
};

const uid = (s: string) => `b-${s}`;

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "tpl-casa-simples",
    name: "Casa simples 8×6m",
    description:
      "Sala/cozinha integrada, 2 quartos e banheiro. Estrutura básica, ideal para começar.",
    category: "Residencial",
    shapes: [
      // contorno externo
      { id: uid("c1"), type: "room", x1: 0, y1: 0, x2: 8, y2: 6 },
      // divisórias
      { id: uid("w1"), type: "wall", x1: 4.5, y1: 0, x2: 4.5, y2: 3 },
      { id: uid("w2"), type: "wall", x1: 4.5, y1: 3, x2: 8, y2: 3 },
      { id: uid("w3"), type: "wall", x1: 6.25, y1: 3, x2: 6.25, y2: 6 },
      // elétrica
      { id: uid("e1"), type: "electric", x1: 0.5, y1: 0.5, x2: 4, y2: 0.5 },
      { id: uid("e2"), type: "electric", x1: 5, y1: 3.5, x2: 7.5, y2: 3.5 },
      { id: uid("e3"), type: "electric", x1: 0.5, y1: 5.5, x2: 6, y2: 5.5 },
    ],
  },
  {
    id: "tpl-apto-studio",
    name: "Apartamento studio 5×6m",
    description:
      "Studio compacto com cozinha, sala, dormitório integrado e banheiro suíte.",
    category: "Compacto",
    shapes: [
      { id: uid("c1"), type: "room", x1: 0, y1: 0, x2: 5, y2: 6 },
      { id: uid("w1"), type: "wall", x1: 3, y1: 0, x2: 3, y2: 2.5 },
      { id: uid("w2"), type: "wall", x1: 3, y1: 2.5, x2: 5, y2: 2.5 },
      { id: uid("e1"), type: "electric", x1: 0.5, y1: 5.5, x2: 4.5, y2: 5.5 },
      { id: uid("n1"), type: "network", x1: 0.5, y1: 0.5, x2: 0.5, y2: 5 },
    ],
  },
  {
    id: "tpl-escritorio",
    name: "Escritório 10×7m",
    description:
      "Recepção, sala de reunião e área aberta. Cabeamento de rede pré-traçado.",
    category: "Comercial",
    shapes: [
      { id: uid("c1"), type: "room", x1: 0, y1: 0, x2: 10, y2: 7 },
      { id: uid("w1"), type: "wall", x1: 3, y1: 4, x2: 10, y2: 4 },
      { id: uid("w2"), type: "wall", x1: 3, y1: 4, x2: 3, y2: 7 },
      { id: uid("w3"), type: "wall", x1: 7, y1: 0, x2: 7, y2: 4 },
      { id: uid("n1"), type: "network", x1: 0.5, y1: 0.5, x2: 9.5, y2: 0.5 },
      { id: uid("n2"), type: "network", x1: 0.5, y1: 0.5, x2: 0.5, y2: 6.5 },
      { id: uid("e1"), type: "electric", x1: 0.5, y1: 3.5, x2: 6.5, y2: 3.5 },
      { id: uid("e2"), type: "electric", x1: 3.5, y1: 4.5, x2: 9.5, y2: 4.5 },
    ],
  },
  {
    id: "tpl-galpao",
    name: "Galpão industrial 20×12m",
    description:
      "Área de produção ampla com escritório anexo. Estrutura para indústria leve.",
    category: "Industrial",
    shapes: [
      { id: uid("c1"), type: "room", x1: 0, y1: 0, x2: 20, y2: 12 },
      { id: uid("c2"), type: "room", x1: 16, y1: 0, x2: 20, y2: 4 },
      { id: uid("e1"), type: "electric", x1: 0.5, y1: 0.5, x2: 19.5, y2: 0.5 },
      { id: uid("e2"), type: "electric", x1: 0.5, y1: 11.5, x2: 19.5, y2: 11.5 },
      { id: uid("e3"), type: "electric", x1: 10, y1: 0.5, x2: 10, y2: 11.5 },
    ],
  },
];

export function getBuiltinTemplate(id: string): BuiltinTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}
