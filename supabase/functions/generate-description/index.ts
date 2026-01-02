import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateDescriptionRequest {
  type?: 'title' | 'description' | 'prize_terms' | 'organization_description' | 'draw_method_description';
  title?: string;
  category?: string;
  prizeName?: string;
  prizeValue?: number;
  currencyCode?: string;
  userContext?: string;
  organizationName?: string;
  city?: string;
  prompt?: string; // For direct prompts (legacy support)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type = 'description', title, category, prizeName, prizeValue, currencyCode, userContext, organizationName, city, prompt: directPrompt }: GenerateDescriptionRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompt: string;
    let logMessage: string;
    let responseKey: string = 'description';

    // Handle direct prompt (legacy support for draw method description)
    if (directPrompt) {
      prompt = directPrompt;
      logMessage = 'Processing direct prompt';
      responseKey = 'description';
    } else if (type === 'draw_method_description') {
      // Generate draw method description
      const contextParts = [];
      if (title) contextParts.push(`Nombre del sorteo: "${title}"`);
      if (prizeName) contextParts.push(`Premio: ${prizeName}`);
      if (organizationName) contextParts.push(`Organizado por: ${organizationName}`);

      prompt = `Genera una descripción breve y emocionante para el método de sorteo manual de una rifa${contextParts.length > 0 ? ' con estas características:\n' + contextParts.join('\n') : ''}.
      
La descripción debe:
- Ser en español latinoamericano informal y amigable
- Incluir 2-3 emojis relevantes (🎁🏆🎉✨🔥💫)
- Explicar brevemente que el ganador será seleccionado manualmente en vivo
- Generar emoción y confianza
- Ser de máximo 150 caracteres
- NO incluir fechas específicas ni números de boletos

Escribe SOLO la descripción, sin explicaciones adicionales.`;

      logMessage = `Generating draw method description for: ${title || 'raffle'}`;
      responseKey = 'description';
    } else if (type === 'title') {
      // Generate title
      const contextParts = [];
      if (category) contextParts.push(`Categoría: ${category}`);
      if (prizeName) contextParts.push(`Premio: ${prizeName}`);
      if (userContext && userContext.trim()) {
        contextParts.push(`Contexto adicional: ${userContext}`);
      }

      prompt = `Genera un título atractivo y llamativo para un sorteo${contextParts.length > 0 ? ' con estas características:\n' + contextParts.join('\n') : ''}.

El título debe:
- Ser corto y memorable (máximo 50 caracteres)
- Incluir 1-2 emojis al inicio o final (🎁🎉✨🏆💫🎊🌟)
- Crear emoción y urgencia
- Mencionar el premio o beneficio principal si se proporcionó
- Estar en español latinoamericano
- NO incluir palabras como "Sorteo de" al inicio (eso ya se muestra en la interfaz)

Escribe SOLO el título, sin explicaciones adicionales.`;

      logMessage = `Generating title for category: ${category || 'none'}, prize: ${prizeName || 'none'}`;
      responseKey = 'title';
    } else if (type === 'prize_terms') {
      // Generate prize terms
      const contextParts = [];
      if (prizeName) contextParts.push(`Premio: ${prizeName}`);
      if (prizeValue && currencyCode) contextParts.push(`Valor: ${currencyCode} $${prizeValue.toLocaleString()}`);
      if (category) contextParts.push(`Categoría: ${category}`);
      if (title) contextParts.push(`Nombre del sorteo: ${title}`);
      if (userContext && userContext.trim()) {
        contextParts.push(`Instrucciones adicionales: ${userContext}`);
      }

      prompt = `Genera términos y condiciones claros y profesionales para un premio de sorteo con estas características:

${contextParts.length > 0 ? contextParts.join('\n') : 'Premio genérico de sorteo'}

Los términos deben incluir secciones sobre:
1. **Entrega del premio**: Cómo y cuándo se entregará (ej: envío a domicilio, recogida en punto)
2. **Requisitos del ganador**: Documentación necesaria (identificación, ser mayor de edad, etc.)
3. **Condiciones del premio**: Si es nuevo/usado, garantías, si incluye accesorios
4. **Restricciones geográficas**: Si aplica (ej: solo envíos nacionales)
5. **Vigencia**: Tiempo para reclamar el premio
6. **Responsabilidades**: Impuestos, seguros, gastos adicionales

Formato:
- Usar bullets (•) para cada punto
- Máximo 500 caracteres
- Lenguaje claro y directo
- Español latinoamericano neutro
- Profesional pero accesible
- NO usar títulos de secciones, solo bullets directos

Escribe SOLO los términos, sin explicaciones adicionales.`;

      logMessage = `Generating prize terms for: ${prizeName || 'unknown prize'}`;
    } else if (type === 'organization_description') {
      // Generate organization description
      if (!organizationName) {
        return new Response(
          JSON.stringify({ error: "El nombre de la organización es requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contextParts = [];
      contextParts.push(`Nombre de la organización: "${organizationName}"`);
      if (city) contextParts.push(`Ubicación: ${city}`);
      if (userContext && userContext.trim()) {
        contextParts.push(`Información adicional proporcionada: ${userContext}`);
      }

      prompt = `Genera una descripción profesional y atractiva para una organización que realiza sorteos y rifas, con estas características:

${contextParts.join("\n")}

La descripción debe:
- Ser de 2-3 oraciones cortas y profesionales
- Transmitir confianza, transparencia y profesionalismo
- Mencionar que organizan sorteos/rifas de manera segura
- Si hay ubicación, mencionarla naturalmente
- Incluir 1-2 emojis sutiles (🎯✨🏆🎁)
- Estar en español latinoamericano
- Máximo 300 caracteres
- Motivar a los visitantes a participar en sus sorteos
- NO usar saludos formales ni frases como "Bienvenidos"
- Si el usuario proporcionó información adicional, incorporarla o mejorarla

Escribe SOLO la descripción, sin explicaciones adicionales.`;

      logMessage = `Generating organization description for: ${organizationName}`;
    } else {
      // Generate raffle description
      if (!title) {
        return new Response(
          JSON.stringify({ error: "El título del sorteo es requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contextParts = [];
      contextParts.push(`Título del sorteo: "${title}"`);
      if (category) contextParts.push(`Categoría: ${category}`);
      if (prizeName) contextParts.push(`Premio: ${prizeName}`);
      if (userContext && userContext.trim()) {
        contextParts.push(`Información adicional del organizador: ${userContext}`);
      }

      prompt = `Genera una descripción atractiva y persuasiva para un sorteo con las siguientes características:

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

      logMessage = `Generating description for: ${title}`;
    }

    console.log("Calling Lovable AI:", logMessage);

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
    const generatedContent = data.choices?.[0]?.message?.content?.trim();

    if (!generatedContent) {
      console.error("No content in AI response:", data);
      const errorMsg = type === 'title' ? "No se pudo generar el título" : 
                       type === 'prize_terms' ? "No se pudo generar los términos" :
                       "No se pudo generar la descripción";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully generated ${type}:`, generatedContent.substring(0, 50) + "...");

    // Return with appropriate key based on type (use responseKey if already set, otherwise determine from type)
    const finalResponseKey = responseKey || (type === 'title' ? 'title' : type === 'prize_terms' ? 'prize_terms' : 'description');
    return new Response(
      JSON.stringify({ [finalResponseKey]: generatedContent }),
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
