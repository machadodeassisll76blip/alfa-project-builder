import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  filename: z.string().min(1).max(200),
  mime: z.string().min(1).max(100),
  dataBase64: z.string().min(10).max(15_000_000), // ~10MB base64
  instructions: z.string().max(2000).optional(),
});

const SYSTEM = `Você é o **Analista de Plantas da Alfa Construtora**. Recebe uma imagem ou PDF de uma planta (residencial, comercial, viária ou de infraestrutura) e a analisa em detalhes para o usuário, em português.

Sua resposta deve conter:
1. **Resumo** (1-2 linhas) do que é a planta.
2. **Dimensões e escalas** identificadas (se houver).
3. **Cômodos / áreas / vias** listados com medidas estimadas.
4. **Sistemas identificados**: elétrica, hidráulica, rede, asfalto, sinalização, etc.
5. **Recomendações técnicas** (ABNT NBR aplicáveis, pontos de atenção).
6. **Reconstrução opcional**: se for possível, retorne um bloco \`alfa-shapes\` (mesmas regras do editor: type room/wall/electric/network/road/highway, coordenadas em metros, origem inferior-esquerda) reconstruindo a planta no editor cartesiano. Use apenas se você conseguir estimar dimensões com razoável confiança.

Bloco esperado quando aplicável:
\`\`\`alfa-shapes
[{"type":"room","x1":0,"y1":0,"x2":8,"y2":6}]
\`\`\`

Seja honesto se a imagem estiver borrada ou incompleta.`;

export const analyzePlanFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const isPdf = data.mime === "application/pdf" || data.filename.toLowerCase().endsWith(".pdf");
    const isImage = data.mime.startsWith("image/");
    if (!isPdf && !isImage) {
      throw new Error("Envie uma imagem (JPG, PNG, WebP) ou um PDF.");
    }

    const dataUrl = `data:${data.mime};base64,${data.dataBase64}`;
    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          (data.instructions?.trim() || "Analise esta planta em detalhes.") +
          "\n\nSe possível, gere também um bloco alfa-shapes reconstruindo a planta no plano cartesiano.",
      },
    ];
    if (isPdf) {
      userContent.push({
        type: "file",
        file: { filename: data.filename, file_data: dataUrl },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    }

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "alfa-vision",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para continuar.");
      throw new Error(`Falha na análise (${res.status}). ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("A IA não retornou texto. Tente novamente.");
    return { text };
  });
