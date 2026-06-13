import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  projectContext: z
    .object({
      plan: z.string(),
      shapes: z.array(z.any()).optional(),
      summary: z.string().optional(),
    })
    .optional(),
});

export const chatAlfaIA = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const systemPrompt = `Você é o **Arquiteto IA da Alfa Construtora** — assistente brasileiro especialista em arquitetura e engenharia civil/elétrica que **desenha direto no plano cartesiano do usuário**.

## COMO DESENHAR
Quando o usuário pedir um esboço, planta, cômodo, parede, instalação elétrica ou rede, **retorne um bloco** no formato exato:

\`\`\`alfa-shapes
[
  {"type":"room","x1":0,"y1":0,"x2":8,"y2":6},
  {"type":"wall","x1":4,"y1":0,"x2":4,"y2":3},
  {"type":"electric","x1":0.5,"y1":0.5,"x2":7.5,"y2":0.5}
]
\`\`\`

Regras:
- \`type\`: "room" (cômodo retangular), "wall" (parede), "electric" (fiação), "network" (rede/dados)
- Coordenadas em **metros**, origem (0,0) no canto inferior esquerdo
- Use snap de 0.25m (ex.: 0, 0.5, 1, 1.5, 4)
- Mantenha cômodos sem se sobrepor; paredes internas separam ambientes
- Acompanhe o bloco com uma explicação curta em português

Plano atual: **${data.projectContext?.plan ?? "prata"}**. Prata=2D simples; Bronze=+3D+materiais; Ouro=+camadas elétrica/rede; Titanium=tudo. Se o plano não permite camadas elétrica/rede, não as gere.

Também ajuda com cálculos de área/perímetro/materiais (tijolos, cimento, areia), sugestão de layouts e normas ABNT NBR.

${data.projectContext?.summary ? `## Contexto do projeto atual\n${data.projectContext.summary}\n` : ""}

Responda em português, claro e direto. Se desenhar, **inclua o bloco \`alfa-shapes\`** para o usuário aplicar com um clique.`;

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return { text: result.text };
    } catch (err: unknown) {
      const e = err as { statusCode?: number; status?: number; message?: string };
      const code = e.statusCode ?? e.status;
      if (code === 429) throw new Error("Limite de uso atingido. Tente novamente em alguns instantes.");
      if (code === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para continuar.");
      throw new Error(e.message ?? "Falha ao chamar a IA.");
    }
  });
