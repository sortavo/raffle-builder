import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { verifyPlatformAdmin } from "../_shared/admin-auth.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[create-demo-account] ${step}`, details ? JSON.stringify(details) : '');
};

// Demo account configurations
const DEMO_CONFIGS = {
  demo1: {
    email: "demo1@sortavo.com",
    password: "Cone1591*",
    organization: {
      name: "Sorteos El Dorado",
      description: "Organizadores de sorteos premium desde 2015",
      whatsapp_number: "+525512345678",
      instagram_url: "https://instagram.com/sorteoseldorado",
      brand_color: "#D4AF37",
      verified: true,
    },
    raffle: {
      title: "Gran Sorteo de Año Nuevo 2027",
      prize_name: "Toyota Corolla 2027",
      prize_value: 450000,
      ticket_price: 100,
      total_tickets: 50000,
      template_id: "luxury",
      draw_method: "lottery_nacional",
      lottery_digits: 5 as number | undefined,
      lottery_draw_number: "54321" as string | undefined,
      livestream_url: undefined as string | undefined,
      currency_code: "MXN",
      description: "¡Participa en nuestro Gran Sorteo de Año Nuevo! Con 5 increíbles premios incluyendo un Toyota Corolla 2027 como premio principal.",
      prizes: [
        { id: "p1", name: "iPhone 16 Pro Max", value: 35000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-15T18:00:00Z" },
        { id: "p2", name: "MacBook Air M3", value: 28000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T18:00:00Z" },
        { id: "p3", name: "Apple Watch Ultra 2", value: 18000, image_url: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-15T18:00:00Z" },
        { id: "p4", name: "AirPods Pro 2", value: 6000, image_url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-24T18:00:00Z" },
        { id: "p5", name: "Toyota Corolla 2027", value: 450000, image_url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800", quantity: 1, is_pre_draw: false },
      ],
      packages: [
        { quantity: 1, price: 100, label: "Individual" },
        { quantity: 5, price: 450, discount_percent: 10, label: "Popular" },
        { quantity: 10, price: 800, discount_percent: 20, label: "Familiar" },
        { quantity: 25, price: 1750, discount_percent: 30, label: "Mejor Valor" },
      ],
      customization: {
        show_probability: true,
        show_social_proof: true,
        show_viewers_count: true,
        show_urgency_badge: true,
        show_purchase_ticker: false,
        show_floating_whatsapp: true,
        primary_color: "#D4AF37",
        secondary_color: "#1a1a2e",
      },
      faqs: [
        { question: "¿Cómo puedo participar?", answer: "Selecciona la cantidad de boletos que deseas, completa tus datos y realiza el pago." },
        { question: "¿Cuándo es el sorteo?", answer: "El sorteo principal es el 31 de diciembre de 2026 a las 20:00 hrs." },
        { question: "¿Cómo sabré si gané?", answer: "Te contactaremos por WhatsApp, email y teléfono si resultas ganador." },
        { question: "¿Puedo elegir mis números?", answer: "Sí, tenemos la opción de números de la suerte disponible." },
        { question: "¿Es seguro comprar en línea?", answer: "Absolutamente. Utilizamos encriptación de grado bancario." },
      ],
      prize_terms: "El ganador deberá presentar identificación oficial vigente. El premio no es transferible ni canjeable por efectivo.",
      sold_percentage: 15,
    },
    payment_methods: [
      { type: "bank_transfer", name: "BBVA", bank_name: "BBVA", account_holder: "Sorteos El Dorado SA de CV", account_number: "0123456789", clabe: "012180001234567890" },
      { type: "bank_transfer", name: "Santander", bank_name: "Santander", account_holder: "Sorteos El Dorado SA de CV", account_number: "9876543210", clabe: "014180098765432109" },
    ],
  },
  demo2: {
    email: "demo2@sortavo.com",
    password: "Cone1591*",
    organization: {
      name: "Fundación Esperanza",
      description: "Sorteos benéficos para causas sociales",
      whatsapp_number: "+523398765432",
      instagram_url: "https://instagram.com/fundacion_esperanza",
      brand_color: "#3B82F6",
      verified: true,
    },
    raffle: {
      title: "Mega Sorteo Benéfico 2027",
      prize_name: "Casa en Playa del Carmen",
      prize_value: 3500000,
      ticket_price: 50,
      total_tickets: 400000,
      template_id: "modern",
      draw_method: "random_org",
      lottery_digits: undefined,
      lottery_draw_number: undefined,
      livestream_url: undefined,
      currency_code: "MXN",
      description: "Apoya nuestra causa y participa por increíbles premios. 100% de las ganancias destinadas a programas de educación.",
      prizes: [
        { id: "p1", name: "Smart TV 75\" Samsung", value: 25000, image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-01T18:00:00Z" },
        { id: "p2", name: "PlayStation 5 + 10 Juegos", value: 15000, image_url: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-15T18:00:00Z" },
        { id: "p3", name: "Laptop Gaming ASUS ROG", value: 30000, image_url: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-01T18:00:00Z" },
        { id: "p4", name: "Bicicleta Eléctrica Specialized", value: 35000, image_url: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-15T18:00:00Z" },
        { id: "p5", name: "Viaje a Cancún (2 personas)", value: 40000, image_url: "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T18:00:00Z" },
        { id: "p6", name: "iPhone 16", value: 25000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-08T18:00:00Z" },
        { id: "p7", name: "Moto Yamaha MT-03", value: 120000, image_url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-15T18:00:00Z" },
        { id: "p8", name: "Jet Ski Sea-Doo Spark", value: 180000, image_url: "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-22T18:00:00Z" },
        { id: "p9", name: "Honda CR-V 2027", value: 650000, image_url: "https://images.unsplash.com/photo-1568844293986-8c1a5f8e5f8a?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-28T18:00:00Z" },
        { id: "p10", name: "Casa en Playa del Carmen", value: 3500000, image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800", quantity: 1, is_pre_draw: false },
      ],
      packages: [
        { quantity: 1, price: 50, label: "Individual" },
        { quantity: 10, price: 400, discount_percent: 20, label: "Familiar" },
        { quantity: 25, price: 875, discount_percent: 30, label: "Popular" },
        { quantity: 50, price: 1500, discount_percent: 40, label: "Súper Ahorro" },
        { quantity: 100, price: 2500, discount_percent: 50, label: "Mejor Valor ⭐" },
      ],
      customization: {
        show_probability: true,
        show_social_proof: true,
        show_viewers_count: true,
        show_urgency_badge: true,
        show_purchase_ticker: true,
        show_floating_whatsapp: true,
        primary_color: "#3B82F6",
        secondary_color: "#1E293B",
      },
      faqs: [
        { question: "¿A dónde va el dinero recaudado?", answer: "El 100% de las ganancias se destinan a programas de educación y becas para niños de escasos recursos." },
        { question: "¿Cómo puedo participar?", answer: "Selecciona tus boletos, completa el formulario y realiza tu pago. ¡Es muy fácil!" },
        { question: "¿Cuándo son los sorteos?", answer: "Tenemos pre-sorteos mensuales y el sorteo final es el 31 de diciembre de 2026." },
        { question: "¿Cómo verifico mi compra?", answer: "Recibirás un correo de confirmación con tu código de referencia único." },
        { question: "¿Puedo comprar desde el extranjero?", answer: "Sí, aceptamos participantes de todo el mundo." },
        { question: "¿El sorteo es verificable?", answer: "Sí, usamos Random.org con certificación verificable públicamente." },
        { question: "¿Hay límite de boletos?", answer: "Puedes comprar hasta 1,000 boletos por persona." },
        { question: "¿Entregan el premio a domicilio?", answer: "Sí, coordinamos la entrega del premio sin costo adicional." },
      ],
      prize_terms: "Los premios mayores incluyen gastos de escrituración. Aplican restricciones de edad (18+). Ver términos completos en nuestro sitio web.",
      sold_percentage: 8,
    },
    payment_methods: [
      { type: "bank_transfer", name: "Banamex", bank_name: "Banamex", account_holder: "Fundación Esperanza AC", account_number: "1234567890", clabe: "002180012345678901" },
      { type: "bank_transfer", name: "HSBC", bank_name: "HSBC", account_holder: "Fundación Esperanza AC", account_number: "0987654321", clabe: "021180098765432109" },
      { type: "oxxo", name: "OXXO Pay", instructions: "Paga en cualquier OXXO con tu referencia" },
    ],
  },
  demo3: {
    email: "demo3@sortavo.com",
    password: "Cone1591*",
    organization: {
      name: "Loterías Nacionales Premium",
      description: "Los sorteos más grandes de México",
      whatsapp_number: "+528155551234",
      instagram_url: "https://instagram.com/loteriaspremium",
      brand_color: "#8B5CF6",
      verified: true,
    },
    raffle: {
      title: "El Sorteo del Siglo - Edición Platino",
      prize_name: "Residencia en Los Cabos",
      prize_value: 15000000,
      ticket_price: 20,
      total_tickets: 5000000,
      template_id: "neon",
      draw_method: "lottery_nacional",
      lottery_digits: 5,
      lottery_draw_number: "12345",
      currency_code: "MXN",
      livestream_url: "https://youtube.com/live/sorteo-del-siglo",
      description: "El sorteo más grande en la historia de México. 15 premios espectaculares incluyendo una residencia de lujo en Los Cabos valuada en $15 millones.",
      prizes: [
        { id: "p1", name: "iPhone 16 Pro", value: 30000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-04T20:00:00Z" },
        { id: "p2", name: "iPhone 16 Pro", value: 30000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-11T20:00:00Z" },
        { id: "p3", name: "iPhone 16 Pro", value: 30000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-18T20:00:00Z" },
        { id: "p4", name: "iPhone 16 Pro", value: 30000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-25T20:00:00Z" },
        { id: "p5", name: "MacBook Pro M3 Max", value: 45000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-01T20:00:00Z" },
        { id: "p6", name: "MacBook Pro M3 Max", value: 45000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-08T20:00:00Z" },
        { id: "p7", name: "MacBook Pro M3 Max", value: 45000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-15T20:00:00Z" },
        { id: "p8", name: "MacBook Pro M3 Max", value: 45000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-22T20:00:00Z" },
        { id: "p9", name: "Tesla Model 3", value: 900000, image_url: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T20:00:00Z" },
        { id: "p10", name: "Rolex Submariner", value: 250000, image_url: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-08T20:00:00Z" },
        { id: "p11", name: "Viaje a Europa (15 días)", value: 150000, image_url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-15T20:00:00Z" },
        { id: "p12", name: "BMW R1250GS Adventure", value: 450000, image_url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-20T20:00:00Z" },
        { id: "p13", name: "Mercedes-Benz GLC 300", value: 1200000, image_url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-25T20:00:00Z" },
        { id: "p14", name: "Departamento en CDMX", value: 4000000, image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-28T20:00:00Z" },
        { id: "p15", name: "Residencia en Los Cabos", value: 15000000, image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800", quantity: 1, is_pre_draw: false },
      ],
      packages: [
        { quantity: 1, price: 20, label: "Individual" },
        { quantity: 10, price: 150, discount_percent: 25, label: "Básico" },
        { quantity: 50, price: 600, discount_percent: 40, label: "Popular" },
        { quantity: 100, price: 1000, discount_percent: 50, label: "Favorito" },
        { quantity: 500, price: 4000, discount_percent: 60, label: "Mega Ahorro" },
        { quantity: 1000, price: 6000, discount_percent: 70, label: "Ultra Pack ⭐" },
      ],
      customization: {
        show_probability: true,
        show_social_proof: true,
        show_viewers_count: true,
        show_urgency_badge: true,
        show_purchase_ticker: true,
        show_floating_whatsapp: true,
        primary_color: "#8B5CF6",
        secondary_color: "#0F172A",
      },
      faqs: [
        { question: "¿Este es el sorteo más grande de México?", answer: "Sí, con 5 millones de boletos y $100 millones en premios totales, es el sorteo más grande en la historia de México." },
        { question: "¿Cómo funciona el sorteo por Lotería Nacional?", answer: "Utilizamos los últimos 5 dígitos del premio mayor de la Lotería Nacional del 31 de diciembre." },
        { question: "¿Cuántos pre-sorteos hay?", answer: "Tenemos 14 pre-sorteos semanales de octubre a diciembre, más el sorteo final." },
        { question: "¿Puedo ver el sorteo en vivo?", answer: "Sí, transmitimos todos los sorteos en vivo por YouTube y Facebook." },
        { question: "¿Cómo sé que es legítimo?", answer: "Estamos registrados ante la SEGOB y todos nuestros sorteos son auditados por notario público." },
        { question: "¿Qué pasa si gano la residencia?", answer: "Incluye escrituración, gastos notariales y un año de mantenimiento pagado." },
        { question: "¿Hay límite de boletos?", answer: "Puedes comprar hasta 10,000 boletos por persona." },
        { question: "¿Aceptan pagos internacionales?", answer: "Sí, aceptamos PayPal y transferencias internacionales." },
        { question: "¿Cuándo termina la venta de boletos?", answer: "La venta cierra 24 horas antes del sorteo final." },
        { question: "¿Cómo contacto al soporte?", answer: "Por WhatsApp 24/7 o email a soporte@loteriaspremium.mx" },
      ],
      prize_terms: "Sorteo autorizado por SEGOB. Todos los premios incluyen impuestos pagados. La residencia incluye escrituración completa. Restricciones de edad (18+). Consulta términos completos.",
      sold_percentage: 3,
    },
    payment_methods: [
      { type: "bank_transfer", name: "BBVA", bank_name: "BBVA", account_holder: "Loterías Premium SA de CV", account_number: "1111222233", clabe: "012180011112222333" },
      { type: "bank_transfer", name: "Banorte", bank_name: "Banorte", account_holder: "Loterías Premium SA de CV", account_number: "4444555566", clabe: "072180044445555666" },
      { type: "oxxo", name: "OXXO Pay", instructions: "Presenta tu código en cualquier OXXO" },
    ],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // For internal tool calls, allow special demo secret
    const body = await req.json();
    const { demo_key, demo_secret } = body;
    
    // Check for demo secret (simple protection for internal use)
    const DEMO_SECRET = "SORTAVO_DEMO_2026_CREATE";
    const isInternalCall = demo_secret === DEMO_SECRET;
    
    // Also check service role key in authorization header
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isServiceCall = authHeader?.includes(serviceKey || '');
    
    if (!isInternalCall && !isServiceCall) {
      // Verify platform admin for external calls
      const authResult = await verifyPlatformAdmin(req);
      if (!authResult.isPlatformAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    logStep('Starting demo account creation', { demo_key });

    if (!demo_key || !DEMO_CONFIGS[demo_key as keyof typeof DEMO_CONFIGS]) {
      return new Response(JSON.stringify({ error: 'Invalid demo_key. Use: demo1, demo2, or demo3' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = DEMO_CONFIGS[demo_key as keyof typeof DEMO_CONFIGS];
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === config.email);
    
    if (existingUser) {
      logStep('User already exists, cleaning up', { email: config.email });
      
      // Get org ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', existingUser.id)
        .single();
      
      if (profile?.organization_id) {
        // Delete related data - get raffle IDs first
        const { data: raffles } = await supabase
          .from('raffles')
          .select('id')
          .eq('organization_id', profile.organization_id);
        
        const raffleIds = raffles?.map(r => r.id) || [];
        
        if (raffleIds.length > 0) {
          // Delete sold_tickets and packages for these raffles
          await supabase.from('sold_tickets').delete().in('raffle_id', raffleIds);
          await supabase.from('raffle_packages').delete().in('raffle_id', raffleIds);
        }
        
        await supabase.from('raffles').delete().eq('organization_id', profile.organization_id);
        await supabase.from('payment_methods').delete().eq('organization_id', profile.organization_id);
        await supabase.from('user_roles').delete().eq('user_id', existingUser.id);
        await supabase.from('profiles').delete().eq('id', existingUser.id);
        await supabase.from('organizations').delete().eq('id', profile.organization_id);
      }
      
      await supabase.auth.admin.deleteUser(existingUser.id);
      logStep('Cleaned up existing user');
    }

    // Step 2: Create user
    logStep('Creating user', { email: config.email });
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: config.email,
      password: config.password,
      email_confirm: true,
      user_metadata: {
        full_name: config.organization.name,
        organization_name: config.organization.name,
      },
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create user: ${userError?.message}`);
    }

    const userId = userData.user.id;
    logStep('User created', { userId });

    // Wait for trigger to create org
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 3: Get and update organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Organization not created by trigger');
    }

    const orgId = profile.organization_id;
    logStep('Updating organization', { orgId });

    await supabase
      .from('organizations')
      .update({
        name: config.organization.name,
        description: config.organization.description,
        whatsapp_number: config.organization.whatsapp_number,
        instagram_url: config.organization.instagram_url,
        brand_color: config.organization.brand_color,
        verified: true,
        subscription_tier: 'enterprise',
        subscription_status: 'active',
        max_active_raffles: 999,
        max_tickets_per_raffle: 10000000,
        templates_available: 9,
        onboarding_completed: true,
        slug: demo_key,
      })
      .eq('id', orgId);

    // Step 4: Create payment methods
    logStep('Creating payment methods');
    for (const pm of config.payment_methods) {
      await supabase.from('payment_methods').insert({
        organization_id: orgId,
        ...pm,
        enabled: true,
      });
    }

    // Step 5: Create raffle
    logStep('Creating raffle', { title: config.raffle.title, total_tickets: config.raffle.total_tickets });
    
    const slug = `${demo_key}-sorteo-${Date.now()}`;
    const numberingConfig = {
      mode: 'sequential',
      start_number: 1,
      step: 1,
      pad_enabled: true,
      pad_char: '0',
      pad_width: config.raffle.total_tickets.toString().length,
    };
    
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .insert({
        organization_id: orgId,
        created_by: userId,
        title: config.raffle.title,
        slug,
        prize_name: config.raffle.prize_name,
        prize_value: config.raffle.prize_value,
        prize_images: config.raffle.prizes.map(p => p.image_url),
        ticket_price: config.raffle.ticket_price,
        total_tickets: config.raffle.total_tickets,
        template_id: config.raffle.template_id,
        draw_method: config.raffle.draw_method,
        lottery_digits: config.raffle.lottery_digits,
        lottery_draw_number: config.raffle.lottery_draw_number,
        currency_code: config.raffle.currency_code,
        description: config.raffle.description,
        draw_date: "2026-12-31T20:00:00Z",
        start_date: new Date().toISOString(),
        status: 'active',
        prizes: config.raffle.prizes,
        prize_display_mode: 'hierarchical',
        customization: config.raffle.customization,
        prize_terms: config.raffle.prize_terms,
        lucky_numbers_enabled: true,
        auto_publish_result: true,
        reservation_time_minutes: 30,
        livestream_url: config.raffle.livestream_url,
        numbering_config: numberingConfig,
      })
      .select()
      .single();

    if (raffleError || !raffle) {
      throw new Error(`Failed to create raffle: ${raffleError?.message}`);
    }

    logStep('Raffle created', { raffleId: raffle.id });

    // Step 6: Create packages
    logStep('Creating packages');
    for (let i = 0; i < config.raffle.packages.length; i++) {
      const pkg = config.raffle.packages[i];
      await supabase.from('raffle_packages').insert({
        raffle_id: raffle.id,
        quantity: pkg.quantity,
        price: pkg.price,
        discount_percent: pkg.discount_percent || 0,
        label: pkg.label,
        display_order: i,
      });
    }

    // Step 7: Virtual tickets - no generation needed!
    // With virtual tickets, tickets are computed on-demand from raffle.total_tickets
    // We only insert into sold_tickets when a ticket is actually reserved/sold
    logStep('Virtual tickets model - skipping legacy generation', { 
      raffle_id: raffle.id, 
      total: config.raffle.total_tickets,
      note: 'Tickets are virtual - only sold/reserved tickets are stored in sold_tickets'
    });

    // Step 8: Simulate some sales using virtual tickets model
    // With virtual tickets, we insert directly into sold_tickets table
    const soldCount = Math.floor(config.raffle.total_tickets * (config.raffle.sold_percentage / 100));
    
    if (soldCount > 0 && soldCount <= 1000) {
      logStep('Simulating sales with virtual tickets', { soldCount });
      
      const referenceCode = `DEMO${Date.now().toString(36).toUpperCase()}`;
      const padWidth = config.raffle.total_tickets.toString().length;
      
      // Create sold ticket records directly (virtual tickets model)
      const ticketsToInsert = [];
      for (let i = 0; i < soldCount; i++) {
        const ticketNumber = String(i + 1).padStart(padWidth, '0');
        ticketsToInsert.push({
          raffle_id: raffle.id,
          ticket_index: i,
          ticket_number: ticketNumber,
          status: 'sold',
          buyer_name: 'Cliente Demo',
          buyer_email: 'cliente@ejemplo.com',
          buyer_phone: '+52 55 1234 5678',
          buyer_city: 'Ciudad de México',
          sold_at: new Date().toISOString(),
          payment_reference: referenceCode,
          payment_method: 'bank_transfer',
        });
      }

      const { error: insertError } = await supabase
        .from('sold_tickets')
        .insert(ticketsToInsert);

      if (insertError) {
        logStep('Error simulating sales', { error: insertError.message });
      } else {
        logStep('Sales simulated', { count: soldCount });
      }
    }

    // Return success - virtual tickets are ready immediately
    return new Response(JSON.stringify({
      success: true,
      demo_key,
      user: {
        id: userId,
        email: config.email,
      },
      organization: {
        id: orgId,
        name: config.organization.name,
        slug: demo_key,
      },
      raffle: {
        id: raffle.id,
        title: raffle.title,
        slug: raffle.slug,
        total_tickets: config.raffle.total_tickets,
        prizes_count: config.raffle.prizes.length,
        packages_count: config.raffle.packages.length,
      },
      ticket_generation: {
        async: false,
        job_id: null,
        status: 'virtual',
        message: `Virtual tickets enabled - ${config.raffle.total_tickets.toLocaleString()} tickets available on-demand.`
      },
      message: 'Demo account created successfully with virtual tickets.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Error', { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
