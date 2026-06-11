export type PlanTier = "prata" | "bronze" | "ouro" | "titanium";

export type Plan = {
  id: PlanTier;
  name: string;
  price: number;
  tagline: string;
  description: string;
  features: string[];
  highlight?: boolean;
  badgeColor: string; // tailwind class
};

export const PLANS: Plan[] = [
  {
    id: "prata",
    name: "Prata",
    price: 15,
    tagline: "Tenha a experiência primária de nossos planos da Alfa",
    description:
      "A porta de entrada — ideal para conhecer a ferramenta e brincar com esboços simples antes de assumir um projeto sério.",
    features: [
      "Editor cartesiano 2D",
      "Cálculo de área e perímetro",
      "Salvar até 3 projetos",
      "Templates da comunidade (leitura)",
      "Assistente IA (limitado)",
    ],
    badgeColor: "bg-plan-prata text-primary",
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 34,
    tagline: "Pra valer",
    description:
      "Cálculos reais, projetos 3D e estimativa de materiais. Pra quem já trabalha com obras de verdade.",
    features: [
      "Tudo do Prata",
      "Cálculos estruturais reais",
      "Visualização 3D do projeto",
      "Estimativa de materiais (cimento, tijolos, ferro)",
      "Projetos ilimitados",
    ],
    highlight: true,
    badgeColor: "bg-plan-bronze text-white",
  },
  {
    id: "ouro",
    name: "Ouro",
    price: 68,
    tagline: "Camadas completas",
    description:
      "Rede elétrica, cabeamento de dados e diferenciação de circuitos por cor. Tudo em camadas sobrepostas.",
    features: [
      "Tudo do Bronze",
      "Camada elétrica (tomadas, circuitos)",
      "Camada de rede (cabos azul, fibra)",
      "Camada hidráulica",
      "Diferenciação visual por cor",
    ],
    badgeColor: "bg-plan-ouro text-primary",
  },
  {
    id: "titanium",
    name: "Titanium",
    price: 204,
    tagline: "Escala governamental",
    description:
      "Estradas, prédios, condomínios, arranha-céus, usinas. IA generativa, suporte a parceiros e esboços a partir de descrição.",
    features: [
      "Tudo do Ouro",
      "Projetos de infraestrutura (estradas, usinas)",
      "Cobertura completa de IA generativa",
      "IA cria esboço a partir de descrição",
      "Suporte a parceiros e equipes",
      "Atendimento prioritário",
    ],
    badgeColor: "bg-plan-titanium text-white",
  },
];

export const planAllows = {
  ai3D: (p: PlanTier) => p === "bronze" || p === "ouro" || p === "titanium",
  layers: (p: PlanTier) => p === "ouro" || p === "titanium",
  aiGenerate: (p: PlanTier) => p === "titanium",
  unlimitedProjects: (p: PlanTier) => p !== "prata",
};

export const planLabels: Record<PlanTier, string> = {
  prata: "Prata",
  bronze: "Bronze",
  ouro: "Ouro",
  titanium: "Titanium",
};
