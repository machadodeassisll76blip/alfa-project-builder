import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/plans";
import capaAlfa from "@/assets/alfa-construtora-capa.png.asset.json";
import {
  ArrowRight,
  Sparkles,
  Ruler,
  Layers,
  Bot,
  Calculator,
  Box,
  Share2,
  Check,
  Linkedin,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alfa Construtora — Projetos, cálculos e IA para construção" },
      {
        name: "description",
        content:
          "Crie projetos arquitetônicos com plano cartesiano, IA especialista, cálculo de materiais e templates da comunidade.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-grid-soft opacity-60" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-[320px] w-[320px] rounded-full bg-blueprint/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-5 border-accent/40 bg-accent/10 text-accent">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Novo: Arquiteto IA agora em todos os planos
            </Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              Da prancheta ao concreto, com{" "}
              <span className="bg-gradient-to-br from-accent to-amber-600 bg-clip-text text-transparent">
                inteligência artificial
              </span>
              .
            </h1>
            <p className="mt-5 text-lg text-muted-foreground sm:text-xl">
              A Alfa Construtora é a plataforma onde engenheiros e empresas projetam casas,
              prédios, condomínios e infraestruturas — com cálculos reais, materiais estimados
              e uma IA que entende de obra.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 bg-accent px-6 text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  Começar grátis no Prata <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link to="/" hash="planos">
                  Ver planos
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Sem cartão · Cancele quando quiser · A partir de R$15/mês
            </p>
          </div>

          {/* Mock canvas preview */}
          <div className="relative mx-auto mt-16 max-w-5xl rounded-2xl border bg-card p-3 shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-1.5 border-b pb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-muted-foreground">
                alfa.app/editor — projeto-residencial.afp
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1fr_280px]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-blueprint-grid bg-[#F1F7FF]">
                <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full">
                  <rect x="40" y="40" width="170" height="120" fill="none" stroke="#0F172A" strokeWidth="3" />
                  <rect x="210" y="40" width="120" height="80" fill="none" stroke="#0F172A" strokeWidth="3" />
                  <rect x="210" y="120" width="120" height="40" fill="none" stroke="#0F172A" strokeWidth="3" />
                  <line x1="40" y1="100" x2="210" y2="100" stroke="#0F172A" strokeWidth="2" />
                  <circle cx="80" cy="60" r="3" fill="#F59E0B" />
                  <circle cx="150" cy="60" r="3" fill="#F59E0B" />
                  <line x1="80" y1="60" x2="150" y2="60" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 3" />
                  <line x1="260" y1="50" x2="260" y2="150" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="4 3" />
                  <text x="100" y="78" fontSize="10" fill="#0F172A" fontFamily="Inter">
                    Sala 8,5×6,0 m
                  </text>
                  <text x="240" y="62" fontSize="10" fill="#0F172A" fontFamily="Inter">
                    Quarto
                  </text>
                </svg>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
                <div className="font-semibold text-foreground">Estimativa de materiais</div>
                <Row label="Área construída" value="86,5 m²" />
                <Row label="Paredes" value="42,8 m" />
                <Row label="Tijolos" value="4.690 un" />
                <Row label="Cimento" value="60 sacos" />
                <Row label="Cabos elétricos" value="58 m" />
                <div className="mt-2 rounded-md bg-accent/10 p-2 text-accent">
                  IA: "Sugiro ampliar o quarto principal em 0,5m no eixo Y para acomodar
                  guarda-roupa de 2,4m."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND COVER */}
      <section className="border-b bg-muted/30 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
            <img
              src={capaAlfa.url}
              alt="Capa oficial da Alfa Construtora — engenharia, projetos e construção"
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Conheça a Alfa Construtora também no Instagram.
          </p>
        </div>
      </section>



      {/* FEATURES */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Tudo o que sua obra precisa</h2>
            <p className="mt-3 text-muted-foreground">
              Do esboço inicial à lista de compras no depósito.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<Ruler />} title="Plano cartesiano em metros">
              Desenhe paredes e cômodos com snap a 25cm. Coordenadas e medidas em tempo real.
            </Feature>
            <Feature icon={<Box />} title="Visualização 3D">
              Extrude sua planta em um modelo 3D explorável (Bronze ou superior).
            </Feature>
            <Feature icon={<Layers />} title="Camadas técnicas">
              Elétrica, hidráulica e rede sobrepostas com cores padrão de engenharia (Ouro).
            </Feature>
            <Feature icon={<Calculator />} title="Cálculo de materiais">
              Estimativa automática de tijolos, cimento, areia, ferro e revestimentos.
            </Feature>
            <Feature icon={<Bot />} title="Arquiteto IA">
              Peça esboços, tire dúvidas técnicas ou gere um projeto inteiro a partir de
              uma descrição (Titanium).
            </Feature>
            <Feature icon={<Share2 />} title="Templates da comunidade">
              Publique seus projetos como template, ou use os de outros engenheiros.
            </Feature>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline">Planos</Badge>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Escolha o tamanho da sua obra</h2>
            <p className="mt-3 text-muted-foreground">
              Comece no Prata por R$15/mês. Os valores podem mudar conforme a demanda.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 transition hover:shadow-lg ${
                  p.highlight ? "border-accent ring-2 ring-accent/30" : ""
                }`}
              >
                {p.highlight && (
                  <Badge className="absolute -top-3 left-6 bg-accent text-accent-foreground">
                    Mais popular
                  </Badge>
                )}
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${p.badgeColor}`}
                >
                  {p.name}
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R${p.price}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <p className="mt-1 text-sm font-medium text-accent">{p.tagline}</p>
                <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-6 ${
                    p.highlight ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""
                  }`}
                  variant={p.highlight ? "default" : "outline"}
                >
                  <Link to="/auth" search={{ mode: "signup", plan: p.id }}>
                    Começar com {p.name}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-blueprint-grid opacity-30" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">Pronto para projetar?</h2>
          <p className="mt-3 text-muted-foreground">
            Crie sua conta gratuita e desenhe seu primeiro projeto em minutos.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 h-12 bg-accent px-8 text-accent-foreground hover:bg-accent/90"
          >
            <Link to="/auth" search={{ mode: "signup" }}>
              Criar conta grátis <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-muted/30 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div>© {new Date().getFullYear()} Alfa Construtora — Todos os direitos reservados.</div>
          <div className="flex gap-4">
            <Link to="/templates" className="hover:text-foreground">
              Templates
            </Link>
            <Link to="/" hash="planos" className="hover:text-foreground">
              Planos
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border bg-card p-6 transition hover:border-accent/40 hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-accent-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground">{value}</span>
    </div>
  );
}
