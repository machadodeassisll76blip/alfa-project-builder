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

    const systemPrompt = `Você é o Arquiteto IA da Alfa Construtora — um assistente brasileiro especialista em arquitetura, engenharia civil e elétrica.

Você ajuda o usuário a:
- Esboçar plantas baixas (use coordenadas X, Y em metros)
- Calcular áreas, perímetros, quantidade de materiais (tijolos, cimento, areia, ferro)
- Sugerir layouts de cômodos
- Explicar normas técnicas brasileiras (ABNT NBR) quando relevante
- Para o plano Titanium: gerar esboços completos a partir de descrição

Plano atual do usuário: ${data.projectContext?.plan ?? "prata"}.

Restrições por plano:
- Prata: apenas dicas básicas e cálculos simples
- Bronze: cálculos reais + 3D + materiais
- Ouro: + camadas elétricas/rede/hidráulica
- Titanium: + geração de esboço completo via IA

${data.projectContext?.summary ? `Contexto do projeto atual:\n${data.projectContext.summary}\n` : ""}

Quando for sugerir formas para desenhar, responda em português, claro e direto. Se o usuário pedir um esboço, retorne dimensões claras em metros.`;

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
