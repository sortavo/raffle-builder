import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { verifyPlatformAdmin } from "../_shared/admin-auth.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[create-demo-account] ${step}`, details ? JSON.stringify(details) : '');
};

// Raffle configurations for each demo account
// Each account gets 3 distinct raffles with different templates and characteristics

interface RaffleConfig {
  title: string;
  prize_name: string;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  reservation_time_minutes: number;
  template_id: string;
  draw_method: string;
  lottery_digits?: number;
  lottery_draw_number?: string;
  livestream_url?: string;
  currency_code: string;
  description: string;
  prizes: Array<{
    id: string;
    name: string;
    value: number;
    image_url: string;
    quantity: number;
    is_pre_draw: boolean;
    scheduled_draw_date?: string;
  }>;
  packages: Array<{
    quantity: number;
    price: number;
    discount_percent?: number;
    label: string;
  }>;
  customization: Record<string, unknown>;
  faqs: Array<{ question: string; answer: string }>;
  prize_terms: string;
  sold_percentage: number;
}

// Demo account configurations
const DEMO_CONFIGS = {
  demo1: {
    email: "demo1@sortavo.com",
    password: "Cone1591*",
    organization: {
      name: "Sorteos El Dorado",
      description: "Organizadores de sorteos premium desde 2015. Más de 500 sorteos realizados con transparencia total.",
      whatsapp_number: "+525512345678",
      instagram_url: "https://instagram.com/sorteoseldorado",
      facebook_url: "https://facebook.com/sorteoseldorado",
      brand_color: "#D4AF37",
      verified: true,
    },
    raffles: [
      // Raffle 1: Elegant Gold - Luxury car (500K boletos)
      {
        title: "🏆 Gran Sorteo Año Nuevo 2027 - Mercedes-Benz",
        prize_name: "Mercedes-Benz C300 2027",
        prize_value: 1200000,
        ticket_price: 150,
        total_tickets: 500000,
        reservation_time_minutes: 180,
        template_id: "elegant-gold",
        draw_method: "lottery_nacional",
        lottery_digits: 5,
        lottery_draw_number: "54321",
        currency_code: "MXN",
        description: "¡El sorteo más elegante del año! Participa por un Mercedes-Benz C300 2027 completamente equipado. Con 4 pre-sorteos de premios tecnológicos de última generación.",
        prizes: [
          { id: "p1", name: "iPhone 16 Pro Max 1TB", value: 45000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-15T18:00:00Z" },
          { id: "p2", name: "MacBook Pro M4 16\"", value: 65000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T18:00:00Z" },
          { id: "p3", name: "Apple Watch Ultra 3", value: 22000, image_url: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-15T18:00:00Z" },
          { id: "p4", name: "AirPods Max 2", value: 15000, image_url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-24T18:00:00Z" },
          { id: "p5", name: "Mercedes-Benz C300 2027", value: 1200000, image_url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 150, label: "Individual" },
          { quantity: 5, price: 675, discount_percent: 10, label: "Ahorro" },
          { quantity: 10, price: 1200, discount_percent: 20, label: "Popular ⭐" },
          { quantity: 25, price: 2625, discount_percent: 30, label: "Mejor Valor" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#D4AF37",
          secondary_color: "#1a1a2e",
          font_heading: "Playfair Display",
        },
        faqs: [
          { question: "¿Cómo puedo participar?", answer: "Selecciona tus boletos, completa tus datos y realiza el pago. Recibirás confirmación inmediata." },
          { question: "¿Cuándo es el sorteo principal?", answer: "El sorteo del Mercedes-Benz es el 31 de diciembre de 2026 a las 20:00 hrs, basado en la Lotería Nacional." },
          { question: "¿Cómo me entero si gané?", answer: "Te contactamos por WhatsApp, email y teléfono. También publicamos ganadores en redes sociales." },
          { question: "¿El auto incluye tenencia y placas?", answer: "Sí, el premio incluye tenencia del primer año, placas y seguro por 6 meses." },
        ],
        prize_terms: "El ganador deberá presentar identificación oficial vigente. Incluye tenencia 2027, emplacado y seguro por 6 meses. Premio no transferible.",
        sold_percentage: 12,
      } as RaffleConfig,
      // Raffle 2: Modern Blue - Electronics (1M boletos)
      {
        title: "🎮 Tech Gamer Festival 2026",
        prize_name: "Setup Gaming Completo",
        prize_value: 180000,
        ticket_price: 50,
        total_tickets: 1000000,
        reservation_time_minutes: 240,
        template_id: "modern-blue",
        draw_method: "random_org",
        currency_code: "MXN",
        description: "El sorteo definitivo para gamers. Gana un setup gaming completo valorado en $180,000 MXN incluyendo PC, monitor 4K, silla ergonómica y todos los periféricos.",
        prizes: [
          { id: "p1", name: "PlayStation 5 Pro + 10 Juegos", value: 18000, image_url: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-01T19:00:00Z" },
          { id: "p2", name: "Xbox Series X + Game Pass Ultimate", value: 15000, image_url: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-15T19:00:00Z" },
          { id: "p3", name: "Nintendo Switch OLED + 5 Juegos", value: 10000, image_url: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T19:00:00Z" },
          { id: "p4", name: "Setup Gaming Completo", value: 180000, image_url: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 50, label: "Individual" },
          { quantity: 10, price: 400, discount_percent: 20, label: "Gamer Pack" },
          { quantity: 25, price: 875, discount_percent: 30, label: "Pro Gamer ⭐" },
          { quantity: 50, price: 1500, discount_percent: 40, label: "Ultra Pack" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#3B82F6",
          secondary_color: "#1E40AF",
          font_heading: "Inter",
        },
        faqs: [
          { question: "¿Qué incluye el setup gaming?", answer: "PC RTX 4080, monitor 4K 144Hz, teclado mecánico, mouse gaming, audífonos premium, silla ergonómica y escritorio gaming." },
          { question: "¿Cómo se realiza el sorteo?", answer: "Usamos Random.org con certificado público verificable para total transparencia." },
          { question: "¿Entregan a domicilio?", answer: "Sí, entrega gratuita a cualquier parte de México." },
        ],
        prize_terms: "Productos sujetos a disponibilidad. Pueden sustituirse por equivalentes de igual o mayor valor. Garantía de fabricante incluida.",
        sold_percentage: 25,
      } as RaffleConfig,
      // Raffle 3: Ultra White - Travel (300K boletos)
      {
        title: "✈️ Viaje de Ensueño - Europa 2027",
        prize_name: "Viaje a Europa 21 días",
        prize_value: 250000,
        ticket_price: 80,
        total_tickets: 300000,
        reservation_time_minutes: 360,
        template_id: "ultra-white",
        draw_method: "random_org",
        currency_code: "MXN",
        description: "Vive la experiencia de tu vida. 21 días recorriendo París, Roma, Barcelona y Ámsterdam con todo incluido para 2 personas.",
        prizes: [
          { id: "p1", name: "Maletas de Viaje Premium", value: 8000, image_url: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-20T18:00:00Z" },
          { id: "p2", name: "GoPro Hero 12 Black", value: 12000, image_url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-10T18:00:00Z" },
          { id: "p3", name: "Viaje a Europa 21 días", value: 250000, image_url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 80, label: "Individual" },
          { quantity: 5, price: 360, discount_percent: 10, label: "Dúo" },
          { quantity: 10, price: 640, discount_percent: 20, label: "Familiar ⭐" },
          { quantity: 20, price: 1120, discount_percent: 30, label: "Mejor Valor" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: false,
          show_urgency_badge: true,
          show_purchase_ticker: false,
          show_floating_whatsapp: true,
          primary_color: "#0EA5E9",
          secondary_color: "#0369A1",
          font_heading: "Poppins",
        },
        faqs: [
          { question: "¿Qué incluye el viaje?", answer: "Vuelos redondos, hoteles 4 estrellas, desayunos, tours guiados y seguro de viaje para 2 personas." },
          { question: "¿Puedo elegir las fechas?", answer: "Sí, coordinaremos las fechas según tu disponibilidad durante 2027." },
          { question: "¿Puedo ir con otra persona?", answer: "El viaje es para 2 personas de tu elección." },
        ],
        prize_terms: "Viaje válido durante 2027. Fechas sujetas a disponibilidad. No incluye gastos personales ni propinas. Pasaportes y visas a cargo del ganador.",
        sold_percentage: 18,
      } as RaffleConfig,
      // Raffle 4: Modern Orange - Small raffle (5K boletos)
      {
        title: "🎄 Canasta Navideña Premium",
        prize_name: "Canasta Gourmet de Lujo",
        prize_value: 8000,
        ticket_price: 35,
        total_tickets: 5000,
        reservation_time_minutes: 180,
        template_id: "modern-orange",
        draw_method: "random_org",
        currency_code: "MXN",
        description: "¡Celebra la Navidad con una canasta gourmet de lujo! Ideal para empresas y grupos pequeños. Incluye productos importados y artesanales de la más alta calidad.",
        prizes: [
          { id: "p1", name: "Apple AirPods Pro 2", value: 4500, image_url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-15T18:00:00Z" },
          { id: "p2", name: "Canasta Gourmet Premium", value: 8000, image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 35, label: "Individual" },
          { quantity: 3, price: 95, discount_percent: 10, label: "Trío" },
          { quantity: 5, price: 140, discount_percent: 20, label: "Familiar ⭐" },
          { quantity: 10, price: 245, discount_percent: 30, label: "Grupo" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: false,
          show_urgency_badge: true,
          show_purchase_ticker: false,
          show_floating_whatsapp: true,
          primary_color: "#F97316",
          secondary_color: "#EA580C",
          font_heading: "Nunito",
        },
        faqs: [
          { question: "¿Qué contiene la canasta?", answer: "Vinos importados, quesos gourmet, chocolates artesanales, embutidos premium, conservas finas y accesorios decorativos." },
          { question: "¿Se puede enviar a domicilio?", answer: "Sí, entrega gratuita en zona metropolitana. Envío nacional con costo adicional." },
          { question: "¿Cuándo es el sorteo?", answer: "El 20 de diciembre de 2026 a las 19:00 hrs para que recibas tu premio antes de Navidad." },
        ],
        prize_terms: "Canasta sujeta a disponibilidad de productos. Puede haber sustituciones por artículos de igual o mayor valor.",
        sold_percentage: 65,
      } as RaffleConfig,
    ],
    payment_methods: [
      { type: "bank_transfer", subtype: "bank_transfer", name: "BBVA", bank_name: "BBVA", account_holder: "Sorteos El Dorado SA de CV", account_number: "0123456789", clabe: "012180001234567890" },
      { type: "bank_transfer", subtype: "bank_deposit", name: "Santander", bank_name: "Santander", account_holder: "Sorteos El Dorado SA de CV", card_number: "4152313012345678" },
      { type: "other", subtype: "paypal", name: "PayPal", paypal_email: "pagos@sorteoseldorado.mx", paypal_link: "https://paypal.me/sorteoseldorado" },
    ],
  },
  demo2: {
    email: "demo2@sortavo.com",
    password: "Cone1591*",
    organization: {
      name: "Fundación Esperanza",
      description: "Sorteos benéficos para causas sociales. 100% de ganancias destinadas a educación infantil.",
      whatsapp_number: "+523398765432",
      instagram_url: "https://instagram.com/fundacion_esperanza",
      facebook_url: "https://facebook.com/fundacionesperanzamx",
      brand_color: "#10B981",
      verified: true,
    },
    raffles: [
      // Raffle 1: Modern - Beach House (3M boletos)
      {
        title: "🏠 Casa de Playa - Sorteo Benéfico 2027",
        prize_name: "Casa en Playa del Carmen",
        prize_value: 4500000,
        ticket_price: 100,
        total_tickets: 3000000,
        reservation_time_minutes: 240,
        template_id: "modern",
        draw_method: "random_org",
        currency_code: "MXN",
        description: "¡Ayuda a la educación y gana una casa frente al mar! 100% de las ganancias destinadas a becas escolares. 10 pre-sorteos con premios increíbles.",
        prizes: [
          { id: "p1", name: "Smart TV 85\" Samsung Neo QLED", value: 65000, image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-09-15T18:00:00Z" },
          { id: "p2", name: "MacBook Air M3 15\"", value: 35000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-01T18:00:00Z" },
          { id: "p3", name: "iPhone 16 Pro", value: 30000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-15T18:00:00Z" },
          { id: "p4", name: "Moto Yamaha MT-03 2027", value: 130000, image_url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-01T18:00:00Z" },
          { id: "p5", name: "Jet Ski Sea-Doo Spark", value: 200000, image_url: "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-15T18:00:00Z" },
          { id: "p6", name: "Honda CR-V 2027", value: 750000, image_url: "https://images.unsplash.com/photo-1568844293986-8c1a5f8e5f8a?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T18:00:00Z" },
          { id: "p7", name: "Bono de $50,000 en Efectivo", value: 50000, image_url: "https://images.unsplash.com/photo-1554672723-d42a16e533db?w=800", quantity: 3, is_pre_draw: true, scheduled_draw_date: "2026-12-15T18:00:00Z" },
          { id: "p8", name: "Casa en Playa del Carmen", value: 4500000, image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 100, label: "Individual" },
          { quantity: 10, price: 800, discount_percent: 20, label: "Solidario" },
          { quantity: 25, price: 1750, discount_percent: 30, label: "Benefactor ⭐" },
          { quantity: 50, price: 3000, discount_percent: 40, label: "Padrino" },
          { quantity: 100, price: 5000, discount_percent: 50, label: "Ángel Guardian" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#10B981",
          secondary_color: "#059669",
          font_heading: "Montserrat",
        },
        faqs: [
          { question: "¿A dónde va el dinero recaudado?", answer: "100% de las ganancias se destinan a becas escolares para niños de comunidades marginadas." },
          { question: "¿La casa incluye escrituras?", answer: "Sí, incluye escrituración completa, gastos notariales y primer año de mantenimiento." },
          { question: "¿Cómo verifico que es legítimo?", answer: "Somos una AC registrada. Usamos Random.org con certificado público." },
          { question: "¿Cuántas becas se otorgarán?", answer: "Con este sorteo planeamos otorgar 500 becas escolares completas." },
        ],
        prize_terms: "Casa incluye escrituración y gastos notariales. Aplica para mayores de 18 años. Consulta bases completas.",
        sold_percentage: 8,
      } as RaffleConfig,
      // Raffle 2: Modern Purple - Motorcycle (500K boletos)
      {
        title: "🏍️ Harley-Davidson Street Glide 2027",
        prize_name: "Harley-Davidson Street Glide",
        prize_value: 850000,
        ticket_price: 200,
        total_tickets: 500000,
        reservation_time_minutes: 300,
        template_id: "modern-purple",
        draw_method: "lottery_nacional",
        lottery_digits: 4,
        lottery_draw_number: "8888",
        currency_code: "MXN",
        description: "Para los amantes de las dos ruedas. Gana una Harley-Davidson Street Glide 2027 completamente equipada. El rugido de la libertad puede ser tuyo.",
        prizes: [
          { id: "p1", name: "Casco Shoei Premium", value: 15000, image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-15T19:00:00Z" },
          { id: "p2", name: "Chamarra Harley-Davidson", value: 12000, image_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T19:00:00Z" },
          { id: "p3", name: "GoPro Hero 12 + Accesorios Moto", value: 18000, image_url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-15T19:00:00Z" },
          { id: "p4", name: "Harley-Davidson Street Glide 2027", value: 850000, image_url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 200, label: "Individual" },
          { quantity: 5, price: 900, discount_percent: 10, label: "Rider" },
          { quantity: 10, price: 1600, discount_percent: 20, label: "Biker ⭐" },
          { quantity: 25, price: 3500, discount_percent: 30, label: "Road King" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#8B5CF6",
          secondary_color: "#6D28D9",
          font_heading: "Bebas Neue",
        },
        faqs: [
          { question: "¿La moto es nueva?", answer: "Sí, es modelo 2027 completamente nueva con garantía de fábrica." },
          { question: "¿Incluye placas y tenencia?", answer: "Sí, incluye emplacado, tenencia 2027 y seguro por 1 año." },
          { question: "¿Cómo funciona el sorteo?", answer: "Basado en los últimos 4 dígitos del premio mayor de la Lotería Nacional." },
        ],
        prize_terms: "Incluye factura, placas, tenencia y seguro por 1 año. Solo para mayores de 18 años con licencia de conducir.",
        sold_percentage: 35,
      } as RaffleConfig,
      // Raffle 3: Modern Orange - Cash (2M boletos)
      {
        title: "💰 Un Millón en Efectivo",
        prize_name: "$1,000,000 MXN en Efectivo",
        prize_value: 1000000,
        ticket_price: 50,
        total_tickets: 2000000,
        reservation_time_minutes: 180,
        template_id: "modern-orange",
        draw_method: "random_org",
        currency_code: "MXN",
        description: "Simple y directo: UN MILLÓN DE PESOS en efectivo. Sin complicaciones, sin restricciones. El dinero es tuyo para lo que quieras.",
        prizes: [
          { id: "p1", name: "$25,000 en Efectivo", value: 25000, image_url: "https://images.unsplash.com/photo-1554672723-d42a16e533db?w=800", quantity: 2, is_pre_draw: true, scheduled_draw_date: "2026-11-15T20:00:00Z" },
          { id: "p2", name: "$50,000 en Efectivo", value: 50000, image_url: "https://images.unsplash.com/photo-1554672723-d42a16e533db?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T20:00:00Z" },
          { id: "p3", name: "$100,000 en Efectivo", value: 100000, image_url: "https://images.unsplash.com/photo-1554672723-d42a16e533db?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-15T20:00:00Z" },
          { id: "p4", name: "$1,000,000 en Efectivo", value: 1000000, image_url: "https://images.unsplash.com/photo-1554672723-d42a16e533db?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 50, label: "Individual" },
          { quantity: 10, price: 400, discount_percent: 20, label: "Pack 10" },
          { quantity: 25, price: 875, discount_percent: 30, label: "Pack 25 ⭐" },
          { quantity: 50, price: 1500, discount_percent: 40, label: "Mega Pack" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#F97316",
          secondary_color: "#EA580C",
          font_heading: "DM Sans",
        },
        faqs: [
          { question: "¿El premio es en efectivo?", answer: "Sí, $1,000,000 MXN depositados directamente a tu cuenta bancaria." },
          { question: "¿Hay impuestos?", answer: "El premio se entrega íntegro. Los impuestos corren por cuenta del ganador según la ley." },
          { question: "¿Cuánto tarda en llegar?", answer: "Transferencia realizada dentro de 48 horas hábiles tras verificar identidad." },
        ],
        prize_terms: "Premio entregado mediante transferencia bancaria. El ganador debe proporcionar cuenta bancaria a su nombre y cumplir con verificación de identidad.",
        sold_percentage: 42,
      } as RaffleConfig,
      // Raffle 4: Elegant Purple - Medium raffle (25K boletos)
      {
        title: "💻 Laptop Gamer ASUS ROG",
        prize_name: "ASUS ROG Strix SCAR 17",
        prize_value: 45000,
        ticket_price: 45,
        total_tickets: 25000,
        reservation_time_minutes: 240,
        template_id: "elegant-purple",
        draw_method: "random_org",
        currency_code: "MXN",
        description: "Para los verdaderos gamers. Gana una laptop ASUS ROG Strix SCAR 17 con RTX 4080, el monstruo definitivo para gaming. Incluye monitor gaming como pre-sorteo.",
        prizes: [
          { id: "p1", name: "Monitor Gaming 27\" 165Hz", value: 12000, image_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-10T19:00:00Z" },
          { id: "p2", name: "ASUS ROG Strix SCAR 17", value: 45000, image_url: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 45, label: "Individual" },
          { quantity: 5, price: 200, discount_percent: 11, label: "Gamer" },
          { quantity: 10, price: 360, discount_percent: 20, label: "Pro Gamer ⭐" },
          { quantity: 20, price: 630, discount_percent: 30, label: "Elite" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#8B5CF6",
          secondary_color: "#7C3AED",
          font_heading: "Rajdhani",
        },
        faqs: [
          { question: "¿Qué especificaciones tiene?", answer: "Intel Core i9 14900HX, NVIDIA RTX 4080, 32GB RAM, 2TB SSD, pantalla 17\" 240Hz QHD." },
          { question: "¿Tiene garantía?", answer: "Sí, 2 años de garantía ASUS Premium con soporte técnico incluido." },
          { question: "¿Se entrega sellada?", answer: "Sí, nueva y sellada de fábrica con todos los accesorios originales." },
        ],
        prize_terms: "Laptop nueva con garantía de fábrica. El modelo puede variar según disponibilidad por uno de especificaciones equivalentes o superiores.",
        sold_percentage: 48,
      } as RaffleConfig,
    ],
    payment_methods: [
      { type: "bank_transfer", subtype: "bank_transfer", name: "Banamex", bank_name: "Banamex", account_holder: "Fundación Esperanza AC", account_number: "1234567890", clabe: "002180012345678901" },
      { type: "bank_transfer", subtype: "bank_transfer", name: "HSBC", bank_name: "HSBC", account_holder: "Fundación Esperanza AC", clabe: "021180098765432109" },
      { type: "other", subtype: "oxxo", name: "OXXO Pay", instructions: "Paga en cualquier OXXO con tu código de referencia" },
      { type: "other", subtype: "mercado_pago", name: "Mercado Pago", payment_link: "https://mpago.la/fundacionesperanza" },
    ],
  },
  demo3: {
    email: "demo3@sortavo.com",
    password: "Cone1591*",
    organization: {
      name: "Loterías Nacionales Premium",
      description: "Los sorteos más grandes de México. Más de $500 millones en premios entregados desde 2018.",
      whatsapp_number: "+528155551234",
      instagram_url: "https://instagram.com/loteriaspremium",
      facebook_url: "https://facebook.com/loteriaspremium",
      brand_color: "#7C3AED",
      verified: true,
    },
    raffles: [
      // Raffle 1: Elegant Purple - Mega Mansion (10M boletos - MEGA)
      {
        title: "🏰 MEGA SORTEO - Mansión en Los Cabos",
        prize_name: "Mansión de Lujo en Los Cabos",
        prize_value: 25000000,
        ticket_price: 50,
        total_tickets: 10000000,
        reservation_time_minutes: 480,
        template_id: "elegant-purple",
        draw_method: "lottery_nacional",
        lottery_digits: 7,
        lottery_draw_number: "12345",
        livestream_url: "https://youtube.com/live/megasorteo-mansion",
        currency_code: "MXN",
        description: "El sorteo más grande en la historia de México. Una mansión de lujo con vista al mar en Los Cabos valuada en $25 millones. 15 pre-sorteos con premios espectaculares.",
        prizes: [
          { id: "p1", name: "iPhone 16 Pro Max", value: 35000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-05T20:00:00Z" },
          { id: "p2", name: "iPhone 16 Pro Max", value: 35000, image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-12T20:00:00Z" },
          { id: "p3", name: "MacBook Pro M4 Max", value: 85000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-19T20:00:00Z" },
          { id: "p4", name: "MacBook Pro M4 Max", value: 85000, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-26T20:00:00Z" },
          { id: "p5", name: "Rolex Submariner", value: 300000, image_url: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-02T20:00:00Z" },
          { id: "p6", name: "Tesla Model 3 Long Range", value: 1100000, image_url: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-09T20:00:00Z" },
          { id: "p7", name: "Viaje a Maldivas (2 personas)", value: 200000, image_url: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-16T20:00:00Z" },
          { id: "p8", name: "BMW R1250GS Adventure", value: 500000, image_url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-23T20:00:00Z" },
          { id: "p9", name: "Mercedes-Benz GLC 300", value: 1300000, image_url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-30T20:00:00Z" },
          { id: "p10", name: "Porsche 911 Carrera", value: 2800000, image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-07T20:00:00Z" },
          { id: "p11", name: "Departamento en CDMX", value: 5000000, image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-14T20:00:00Z" },
          { id: "p12", name: "Ferrari Roma", value: 6500000, image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-21T20:00:00Z" },
          { id: "p13", name: "Yate Azimut 50", value: 8000000, image_url: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-28T20:00:00Z" },
          { id: "p14", name: "Mansión de Lujo en Los Cabos", value: 25000000, image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 50, label: "Individual" },
          { quantity: 10, price: 400, discount_percent: 20, label: "Básico" },
          { quantity: 50, price: 1750, discount_percent: 30, label: "Popular" },
          { quantity: 100, price: 3000, discount_percent: 40, label: "Premium ⭐" },
          { quantity: 500, price: 12500, discount_percent: 50, label: "VIP" },
          { quantity: 1000, price: 20000, discount_percent: 60, label: "Ultra VIP" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#7C3AED",
          secondary_color: "#5B21B6",
          font_heading: "Playfair Display",
        },
        faqs: [
          { question: "¿Es el sorteo más grande de México?", answer: "Sí, con 5 millones de boletos y más de $50 millones en premios totales." },
          { question: "¿Cómo funciona el sorteo?", answer: "Basado en los últimos 5 dígitos del premio mayor de la Lotería Nacional." },
          { question: "¿La mansión incluye todo?", answer: "Sí, incluye escrituración, mobiliario de lujo, 2 años de mantenimiento y gastos notariales." },
          { question: "¿Puedo ver el sorteo en vivo?", answer: "Sí, transmitimos en YouTube, Facebook e Instagram simultáneamente." },
          { question: "¿Hay límite de boletos?", answer: "Puedes comprar hasta 10,000 boletos por persona." },
        ],
        prize_terms: "Sorteo autorizado por SEGOB. Mansión incluye escrituración completa, mobiliario, 2 años de mantenimiento. Consulta bases completas.",
        sold_percentage: 3,
      } as RaffleConfig,
      // Raffle 2: Elegant Red - Ferrari (7M boletos)
      {
        title: "🏎️ Ferrari 296 GTB 2027",
        prize_name: "Ferrari 296 GTB",
        prize_value: 8500000,
        ticket_price: 100,
        total_tickets: 7000000,
        reservation_time_minutes: 360,
        template_id: "elegant-red",
        draw_method: "lottery_nacional",
        lottery_digits: 7,
        lottery_draw_number: "29696",
        livestream_url: "https://youtube.com/live/sorteo-ferrari",
        currency_code: "MXN",
        description: "El sueño italiano puede ser tuyo. Ferrari 296 GTB 2027, el híbrido más emocionante jamás creado. 830 caballos de pura adrenalina.",
        prizes: [
          { id: "p1", name: "Experiencia Ferrari en Pista", value: 50000, image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-10T20:00:00Z" },
          { id: "p2", name: "Reloj TAG Heuer Monaco", value: 120000, image_url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-24T20:00:00Z" },
          { id: "p3", name: "Viaje a Maranello, Italia", value: 150000, image_url: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-08T20:00:00Z" },
          { id: "p4", name: "Ferrari 296 GTB 2027", value: 8500000, image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 100, label: "Individual" },
          { quantity: 10, price: 800, discount_percent: 20, label: "Tifosi" },
          { quantity: 25, price: 1750, discount_percent: 30, label: "Scuderia ⭐" },
          { quantity: 50, price: 3000, discount_percent: 40, label: "Cavallino" },
          { quantity: 100, price: 5000, discount_percent: 50, label: "Prancing Horse" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#DC2626",
          secondary_color: "#991B1B",
          font_heading: "Oswald",
        },
        faqs: [
          { question: "¿El Ferrari es nuevo?", answer: "Sí, modelo 2027 directamente de la agencia Ferrari México con garantía completa." },
          { question: "¿Qué incluye el premio?", answer: "Auto, placas, tenencia 2027, seguro por 1 año y primer servicio." },
          { question: "¿Puedo elegir el color?", answer: "Sí, podrás elegir entre los colores disponibles en inventario." },
        ],
        prize_terms: "Ferrari 296 GTB nuevo. Incluye factura, placas, tenencia, seguro anual y primer servicio. Solo para mayores de 21 años.",
        sold_percentage: 15,
      } as RaffleConfig,
      // Raffle 3: Elegant (dark) - Watches Collection (5M boletos)
      {
        title: "⌚ Colección de Relojes de Lujo",
        prize_name: "5 Relojes de Lujo",
        prize_value: 2500000,
        ticket_price: 80,
        total_tickets: 5000000,
        reservation_time_minutes: 240,
        template_id: "elegant",
        draw_method: "random_org",
        currency_code: "MXN",
        description: "Para los amantes de la alta relojería. Gana una colección de 5 relojes de las marcas más prestigiosas: Rolex, Patek Philippe, Audemars Piguet, Omega y TAG Heuer.",
        prizes: [
          { id: "p1", name: "TAG Heuer Carrera", value: 80000, image_url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-10-20T19:00:00Z" },
          { id: "p2", name: "Omega Seamaster", value: 150000, image_url: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-11-10T19:00:00Z" },
          { id: "p3", name: "Audemars Piguet Royal Oak", value: 450000, image_url: "https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-01T19:00:00Z" },
          { id: "p4", name: "Rolex Submariner", value: 320000, image_url: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-15T19:00:00Z" },
          { id: "p5", name: "Colección Completa (5 Relojes)", value: 2500000, image_url: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 80, label: "Individual" },
          { quantity: 10, price: 640, discount_percent: 20, label: "Collector" },
          { quantity: 25, price: 1400, discount_percent: 30, label: "Connoisseur ⭐" },
          { quantity: 50, price: 2400, discount_percent: 40, label: "Horologist" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: true,
          show_urgency_badge: false,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#A78BFA",
          secondary_color: "#7C3AED",
          font_heading: "Cormorant Garamond",
        },
        faqs: [
          { question: "¿Los relojes son originales?", answer: "Sí, todos son 100% originales con certificados de autenticidad y garantía." },
          { question: "¿Puedo elegir modelos específicos?", answer: "Los modelos están predefinidos, pero puedes elegir correas disponibles." },
          { question: "¿Incluye estuches originales?", answer: "Sí, cada reloj viene en su estuche original con todos los documentos." },
        ],
        prize_terms: "Relojes 100% originales con certificados. Incluye cajas originales, garantías y certificados de autenticidad. Entrega asegurada.",
        sold_percentage: 22,
      } as RaffleConfig,
      // Raffle 4: Ultra White - Medium raffle (50K boletos)
      {
        title: "🏖️ Viaje Cancún Todo Incluido",
        prize_name: "Vacaciones 5 días en Cancún",
        prize_value: 35000,
        ticket_price: 60,
        total_tickets: 50000,
        reservation_time_minutes: 300,
        template_id: "ultra-white",
        draw_method: "random_org",
        currency_code: "MXN",
        description: "Escápate al paraíso. 5 días y 4 noches en un resort todo incluido en Cancún para 2 personas. Incluye vuelos, hospedaje, alimentos y bebidas ilimitadas.",
        prizes: [
          { id: "p1", name: "Set de Maletas Samsonite", value: 6000, image_url: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-05T18:00:00Z" },
          { id: "p2", name: "Cámara GoPro Hero 12", value: 9000, image_url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800", quantity: 1, is_pre_draw: true, scheduled_draw_date: "2026-12-18T18:00:00Z" },
          { id: "p3", name: "Viaje Cancún 5 Días", value: 35000, image_url: "https://images.unsplash.com/photo-1510525009512-ad7fc13eefab?w=800", quantity: 1, is_pre_draw: false },
        ],
        packages: [
          { quantity: 1, price: 60, label: "Individual" },
          { quantity: 5, price: 270, discount_percent: 10, label: "Pareja" },
          { quantity: 10, price: 480, discount_percent: 20, label: "Amigos ⭐" },
          { quantity: 25, price: 1050, discount_percent: 30, label: "Mejor Valor" },
        ],
        customization: {
          show_probability: true,
          show_social_proof: true,
          show_viewers_count: false,
          show_urgency_badge: true,
          show_purchase_ticker: true,
          show_floating_whatsapp: true,
          primary_color: "#06B6D4",
          secondary_color: "#0891B2",
          font_heading: "Quicksand",
        },
        faqs: [
          { question: "¿Qué incluye el viaje?", answer: "Vuelos redondos, 4 noches en resort 5 estrellas, todo incluido, traslados aeropuerto-hotel." },
          { question: "¿Puedo elegir las fechas?", answer: "Sí, coordinaremos fechas según disponibilidad durante 2027. Sujeto a temporadas." },
          { question: "¿Es para 2 personas?", answer: "Sí, el viaje es para 2 adultos en habitación doble." },
        ],
        prize_terms: "Viaje válido durante 2027 en fechas disponibles. No aplica en Semana Santa, verano o fin de año. Documentos de viaje a cargo del ganador.",
        sold_percentage: 38,
      } as RaffleConfig,
    ],
    payment_methods: [
      { type: "bank_transfer", subtype: "bank_transfer", name: "BBVA", bank_name: "BBVA", account_holder: "Loterías Premium SA de CV", account_number: "1111222233", clabe: "012180011112222333" },
      { type: "bank_transfer", subtype: "bank_transfer", name: "Banorte", bank_name: "Banorte", account_holder: "Loterías Premium SA de CV", clabe: "072180044445555666" },
      { type: "other", subtype: "oxxo", name: "OXXO Pay", instructions: "Presenta tu código en cualquier OXXO" },
      { type: "other", subtype: "paypal", name: "PayPal", paypal_email: "pagos@loteriaspremium.mx", paypal_link: "https://paypal.me/loteriaspremium" },
    ],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();
    const { demo_key, demo_secret } = body;
    
    const DEMO_SECRET = "SORTAVO_DEMO_2026_CREATE";
    const isInternalCall = demo_secret === DEMO_SECRET;
    
    const authHeader = req.headers.get('Authorization');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isServiceCall = authHeader?.includes(serviceKey || '');
    
    if (!isInternalCall && !isServiceCall) {
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
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', existingUser.id)
        .single();
      
      if (profile?.organization_id) {
        const { data: raffles } = await supabase
          .from('raffles')
          .select('id')
          .eq('organization_id', profile.organization_id);
        
        const raffleIds = raffles?.map(r => r.id) || [];
        
        if (raffleIds.length > 0) {
          // Delete from orders table
          await supabase.from('orders').delete().in('raffle_id', raffleIds);
          await supabase.from('raffle_packages').delete().in('raffle_id', raffleIds);
          await supabase.from('raffle_draws').delete().in('raffle_id', raffleIds);
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
        facebook_url: config.organization.facebook_url,
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

    // Step 5: Create ALL raffles (3 per demo account)
    const createdRaffles = [];
    
    for (let i = 0; i < config.raffles.length; i++) {
      const raffleConfig = config.raffles[i];
      logStep(`Creating raffle ${i + 1}/${config.raffles.length}`, { 
        title: raffleConfig.title, 
        total_tickets: raffleConfig.total_tickets,
        template: raffleConfig.template_id
      });
      
      const slug = `${demo_key}-sorteo-${i + 1}-${Date.now()}`;
      const numberingConfig = {
        mode: 'sequential',
        start_number: 1,
        step: 1,
        pad_enabled: true,
        pad_char: '0',
        pad_width: raffleConfig.total_tickets.toString().length,
      };
      
      const { data: raffle, error: raffleError } = await supabase
        .from('raffles')
        .insert({
          organization_id: orgId,
          created_by: userId,
          title: raffleConfig.title,
          slug,
          prize_name: raffleConfig.prize_name,
          prize_value: raffleConfig.prize_value,
          prize_images: raffleConfig.prizes.map(p => p.image_url),
          ticket_price: raffleConfig.ticket_price,
          total_tickets: raffleConfig.total_tickets,
          template_id: raffleConfig.template_id,
          draw_method: raffleConfig.draw_method,
          lottery_digits: raffleConfig.lottery_digits,
          lottery_draw_number: raffleConfig.lottery_draw_number,
          currency_code: raffleConfig.currency_code,
          description: raffleConfig.description,
          draw_date: "2026-12-31T20:00:00Z",
          start_date: new Date().toISOString(),
          status: 'active',
          prizes: raffleConfig.prizes,
          prize_display_mode: 'hierarchical',
          customization: raffleConfig.customization,
          prize_terms: raffleConfig.prize_terms,
          lucky_numbers_enabled: true,
          auto_publish_result: true,
          reservation_time_minutes: raffleConfig.reservation_time_minutes,
          livestream_url: raffleConfig.livestream_url,
          numbering_config: numberingConfig,
        })
        .select()
        .single();

      if (raffleError || !raffle) {
        logStep(`Error creating raffle ${i + 1}`, { error: raffleError?.message });
        continue;
      }

      logStep(`Raffle ${i + 1} created`, { raffleId: raffle.id });

      // Create packages for this raffle
      for (let j = 0; j < raffleConfig.packages.length; j++) {
        const pkg = raffleConfig.packages[j];
        await supabase.from('raffle_packages').insert({
          raffle_id: raffle.id,
          quantity: pkg.quantity,
          price: pkg.price,
          discount_percent: pkg.discount_percent || 0,
          label: pkg.label,
          display_order: j,
        });
      }

      // Simulate some sales using orders table (compressed ranges)
      const soldCount = Math.floor(raffleConfig.total_tickets * (raffleConfig.sold_percentage / 100));
      const maxSimulatedSales = Math.min(soldCount, 500); // Cap at 500 for performance
      
      if (maxSimulatedSales > 0) {
        logStep(`Simulating ${maxSimulatedSales} sales for raffle ${i + 1} using orders table`);
        
        const referenceCode = `DEMO${Date.now().toString(36).toUpperCase()}${i}`;
        const cities = ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Cancún'];
        
        // Create a single compressed order with range [0, maxSimulatedSales - 1]
        const { error: insertError } = await supabase
          .from('orders')
          .insert({
            raffle_id: raffle.id,
            organization_id: orgId,
            reference_code: referenceCode,
            ticket_count: maxSimulatedSales,
            ticket_ranges: [{ s: 0, e: maxSimulatedSales - 1 }],
            lucky_indices: [],
            status: 'sold',
            buyer_name: 'Clientes Demo',
            buyer_email: 'demo@sortavo.com',
            buyer_phone: '+52 55 1234 5678',
            buyer_city: cities[i % 5],
            sold_at: new Date().toISOString(),
            payment_method: 'bank_transfer',
            order_total: raffleConfig.ticket_price * maxSimulatedSales,
          });

        if (insertError) {
          logStep(`Error simulating sales for raffle ${i + 1}`, { error: insertError.message });
        }
      }

      createdRaffles.push({
        id: raffle.id,
        title: raffle.title,
        slug: raffle.slug,
        total_tickets: raffleConfig.total_tickets,
        template_id: raffleConfig.template_id,
        prizes_count: raffleConfig.prizes.length,
        packages_count: raffleConfig.packages.length,
      });
    }

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
      raffles: createdRaffles,
      message: `Demo account created successfully with ${createdRaffles.length} raffles.`,
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
