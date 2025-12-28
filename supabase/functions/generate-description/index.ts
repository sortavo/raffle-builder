import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateDescriptionRequest {
  title: string;
  category?: string;
  prizeName?: string;
  userContext?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, category, prizeName, userContext }: GenerateDescriptionRequest = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "El título del sorteo es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for the prompt
    const contextParts = [];
    contextParts.push(`Título del sorteo: "${title}"`);
    if (category) contextParts.push(`Categoría: ${category}`);
    if (prizeName) contextParts.push(`Premio: ${prizeName}`);
    if (userContext && userContext.trim()) {
      contextParts.push(`Información adicional del organizador: ${userContext}`);
    }

    const prompt = `Genera una descripción atractiva y persuasiva para un sorteo con las siguientes características:

${contextParts.join("\n")}

La descripción debe:
- Ser de 2-3 párrafos cortos y persuasivos
- Incluir 2-3 emojis relevantes (🎁🎉✨🏆💫)
- Crear urgencia y emoción para participar
- Explicar brevemente cómo funciona (comprar boletos para participar)
- Terminar con un call-to-action motivador
- Estar en español latinoamericano
- Máximo 400 caracteres
- No incluir fechas específicas ni precios (esos se muestran aparte)
- No usar frases como "Estimado participante" ni saludos formales

Escribe SOLO la descripción, sin explicaciones adicionales.`;

    console.log("Calling Lovable AI to generate description for:", title);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Eres un experto en copywriting y marketing de sorteos. Generas descripciones cortas, atractivas y persuasivas que motivan a las personas a participar. Usas un tono amigable, cercano y emocionante." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes alcanzado. Intenta de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Contacta al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Error al generar la descripción" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!generatedDescription) {
      console.error("No content in AI response:", data);
      return new Response(
        JSON.stringify({ error: "No se pudo generar la descripción" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully generated description:", generatedDescription.substring(0, 50) + "...");

    return new Response(
      JSON.stringify({ description: generatedDescription }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-description function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
