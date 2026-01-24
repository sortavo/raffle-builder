// Tooltips compartidos entre Pricing.tsx y PlanComparison.tsx
// para mantener consistencia en las descripciones de features

export const FEATURE_TOOLTIPS = {
  // Capacidad
  sorteosActivos: 'Número de sorteos que puedes tener publicados y vendiendo al mismo tiempo',
  boletosPorSorteo: 'Cantidad máxima de boletos que puedes crear para cada sorteo',
  dominiosPersonalizados: 'Usa tu propio dominio (ej: sorteos.tuempresa.com) en lugar de sortavo.com',
  
  // Experiencia del Comprador
  selectorVisual: 'Grid interactivo para elegir boletos disponibles en tiempo real',
  numerosSuerte: 'Genera números basados en tu cumpleaños o fechas especiales',
  paquetesBonificacion: 'Ofrece promociones como compra 2 lleva 3 para incentivar compras mayores',
  verificadorQR: 'Los compradores pueden verificar sus boletos escaneando el código QR en cualquier momento',
  historialGanadores: 'Muestra los ganadores anteriores en la página pública para generar confianza',
  
  // Gestión y Ventas
  metodosPago: 'Acepta transferencias bancarias, OXXO, PayPal y más sin límite',
  flujoAprobacion: 'Sistema para revisar y aprobar comprobantes de pago manualmente',
  recordatorios: 'Envía recordatorios automáticos a compradores con pagos pendientes',
  exportacionExcel: 'Descarga listas de boletos, compradores y ventas en formato Excel o CSV',
  reporteFinanciero: 'Genera reportes financieros profesionales en formato PDF',
  numeracionPersonalizada: 'Personaliza el formato de numeración de tus boletos (prefijos, rangos, etc.)',
  
  // Diseño y Marca
  plantillasPremium: 'Temas visuales profesionales prediseñados para la página pública de tu sorteo',
  galeriaPremios: 'Muestra fotos y videos de tus premios en una galería atractiva',
  linkTransmision: 'Agrega el enlace de tu transmisión en vivo para el día del sorteo',
  sinMarca: 'Remueve el logo y enlaces de Sortavo de tu página de sorteo',
  
  // Métodos de Sorteo
  sorteoManual: 'Selecciona el ganador manualmente desde tu dashboard',
  metodoLoteria: 'Usa los últimos dígitos del premio mayor de la Lotería Nacional como número ganador',
  sorteoAleatorio: 'Utiliza criptografía avanzada para selección aleatoria con máxima transparencia',
  sorteoAutomatico: 'Programa el sorteo para que se ejecute automáticamente en la fecha indicada',
  
  // Integraciones
  botTelegram: 'Compradores y organizadores reciben notificaciones en tiempo real vía Telegram',
  notificacionesTiempoReal: 'Recibe alertas instantáneas de reservaciones, pagos y eventos importantes',
  
  // Tracking y Conversiones (ÚNICO en el mercado)
  eventosConversion: 'Dispara automáticamente eventos de conversión a GTM, GA4, Meta Pixel y TikTok sin código',
  viewItem: 'Evento automático cuando un visitante ve tu sorteo - útil para remarketing',
  addToCart: 'Evento cuando seleccionan boletos - mide intención de compra',
  beginCheckout: 'Evento al abrir el checkout - identifica abandonos',
  purchase: 'Evento de compra exitosa - mide ROI de tus campañas',
  addPaymentInfo: 'Evento al subir comprobante - conversiones casi-completadas',
  leadCapture: 'Captura leads cuando se registran para notificaciones Telegram',
  shareEvent: 'Mide viralidad cuando comparten tu sorteo en redes sociales',
  
  // Soporte y Equipo
  soporteEmail: 'Recibe ayuda por correo electrónico para resolver tus dudas',
  soporteWhatsApp: 'Contacto directo por WhatsApp para atención más rápida',
  accountManager: 'Un ejecutivo de cuenta asignado exclusivamente a tu organización',
  sla: 'Acuerdo de nivel de servicio con garantía de disponibilidad del 99.9%',
} as const;
