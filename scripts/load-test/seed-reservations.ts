/**
 * Script para poblar la base de datos con miles de reservaciones de prueba
 *
 * Uso:
 *   npx tsx scripts/load-test/seed-reservations.ts
 *
 * Configuración:
 *   - RAFFLE_IDS: IDs de los sorteos a poblar
 *   - RESERVATIONS_PER_RAFFLE: Número de reservaciones por sorteo
 *   - TICKETS_PER_RESERVATION: Boletos por reservación
 */

import { createClient } from '@supabase/supabase-js';

// Configuración
const CONFIG = {
  // IDs de los 3 sorteos a poblar (reemplazar con IDs reales)
  RAFFLE_IDS: process.env.RAFFLE_IDS?.split(',') || [],

  // Número de reservaciones por sorteo
  RESERVATIONS_PER_RAFFLE: parseInt(process.env.RESERVATIONS_COUNT || '1000'),

  // Boletos por reservación (1-5)
  TICKETS_PER_RESERVATION: parseInt(process.env.TICKETS_PER_RESERVATION || '3'),

  // Batch size para inserciones
  BATCH_SIZE: 100,

  // Delay entre batches (ms)
  BATCH_DELAY: 100,
};

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.log('   Set it with: export SUPABASE_SERVICE_KEY="your-service-role-key"');
  console.log('   Get it from: https://supabase.com/dashboard/project/xnwqrgumstikdmsxtame/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Generador de nombres aleatorios
const FIRST_NAMES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofia', 'José', 'Carmen', 'Luis', 'Patricia', 'Jorge', 'Diana', 'Roberto', 'Elena'];
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Cruz'];
const CITIES = ['CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Mérida', 'Cancún', 'Querétaro'];
const PAYMENT_METHODS = ['transferencia', 'oxxo', 'efectivo', 'tarjeta'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBuyer(index: number) {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  return {
    full_name: `${firstName} ${lastName}`,
    email: `buyer${index}_${Date.now()}@test.sortavo.com`,
    phone: `55${Math.floor(10000000 + Math.random() * 90000000)}`,
    city: randomElement(CITIES),
    is_guest: true,
    email_verified: false,
  };
}

function generatePaymentProofUrl(): string {
  // Genera una URL de comprobante de pago falsa
  const proofId = Math.random().toString(36).substring(2, 15);
  return `https://storage.sortavo.com/proofs/test_${proofId}.jpg`;
}

async function getAvailableTickets(raffleId: string, limit: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, ticket_number')
    .eq('raffle_id', raffleId)
    .eq('status', 'available')
    .limit(limit);

  if (error) throw error;
  return data?.map(t => t.id) || [];
}

async function getRaffleInfo(raffleId: string) {
  const { data, error } = await supabase
    .from('raffles')
    .select('id, title, total_tickets, ticket_price')
    .eq('id', raffleId)
    .single();

  if (error) throw error;
  return data;
}

async function createReservation(
  raffleId: string,
  ticketIds: string[],
  buyerIndex: number
): Promise<boolean> {
  const buyer = generateBuyer(buyerIndex);

  // Crear buyer
  const { data: buyerData, error: buyerError } = await supabase
    .from('buyers')
    .insert(buyer)
    .select('id')
    .single();

  if (buyerError) {
    console.error('Error creating buyer:', buyerError.message);
    return false;
  }

  // Actualizar tickets a reserved con payment_proof
  const { error: ticketError } = await supabase
    .from('tickets')
    .update({
      status: 'reserved',
      buyer_id: buyerData.id,
      buyer_name: buyer.full_name,
      buyer_email: buyer.email,
      buyer_phone: buyer.phone,
      buyer_city: buyer.city,
      reserved_at: new Date().toISOString(),
      reserved_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      payment_method: randomElement(PAYMENT_METHODS),
      payment_proof_url: generatePaymentProofUrl(),
      payment_reference: `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    })
    .in('id', ticketIds);

  if (ticketError) {
    console.error('Error updating tickets:', ticketError.message);
    return false;
  }

  return true;
}

async function seedRaffle(raffleId: string, reservationCount: number) {
  console.log(`\n📦 Procesando sorteo: ${raffleId}`);

  // Obtener info del sorteo
  const raffle = await getRaffleInfo(raffleId);
  if (!raffle) {
    console.error(`   ❌ Sorteo no encontrado: ${raffleId}`);
    return { success: 0, failed: 0 };
  }

  console.log(`   📋 ${raffle.title}`);
  console.log(`   🎫 Total boletos: ${raffle.total_tickets}`);

  const ticketsNeeded = reservationCount * CONFIG.TICKETS_PER_RESERVATION;
  console.log(`   🎯 Reservaciones a crear: ${reservationCount}`);
  console.log(`   🎫 Boletos necesarios: ${ticketsNeeded}`);

  // Obtener boletos disponibles
  const availableTickets = await getAvailableTickets(raffleId, ticketsNeeded);
  console.log(`   ✅ Boletos disponibles: ${availableTickets.length}`);

  if (availableTickets.length < ticketsNeeded) {
    console.log(`   ⚠️  No hay suficientes boletos. Ajustando...`);
  }

  const actualReservations = Math.floor(availableTickets.length / CONFIG.TICKETS_PER_RESERVATION);

  let success = 0;
  let failed = 0;

  // Procesar en batches
  for (let i = 0; i < actualReservations; i += CONFIG.BATCH_SIZE) {
    const batchEnd = Math.min(i + CONFIG.BATCH_SIZE, actualReservations);
    const batchPromises: Promise<boolean>[] = [];

    for (let j = i; j < batchEnd; j++) {
      const startIdx = j * CONFIG.TICKETS_PER_RESERVATION;
      const ticketIds = availableTickets.slice(startIdx, startIdx + CONFIG.TICKETS_PER_RESERVATION);

      if (ticketIds.length === CONFIG.TICKETS_PER_RESERVATION) {
        batchPromises.push(createReservation(raffleId, ticketIds, j));
      }
    }

    const results = await Promise.all(batchPromises);
    success += results.filter(r => r).length;
    failed += results.filter(r => !r).length;

    // Progress
    const progress = Math.round(((i + batchPromises.length) / actualReservations) * 100);
    process.stdout.write(`\r   📊 Progreso: ${progress}% (${success} exitosas, ${failed} fallidas)`);

    // Delay entre batches para no saturar
    if (CONFIG.BATCH_DELAY > 0 && i + CONFIG.BATCH_SIZE < actualReservations) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
    }
  }

  console.log(`\n   ✅ Completado: ${success} reservaciones creadas, ${failed} fallidas`);
  return { success, failed };
}

async function main() {
  console.log('🚀 Iniciando seed de reservaciones de prueba');
  console.log('================================================');
  console.log(`📋 Configuración:`);
  console.log(`   - Sorteos: ${CONFIG.RAFFLE_IDS.length || 'No especificados'}`);
  console.log(`   - Reservaciones por sorteo: ${CONFIG.RESERVATIONS_PER_RAFFLE}`);
  console.log(`   - Boletos por reservación: ${CONFIG.TICKETS_PER_RESERVATION}`);
  console.log(`   - Batch size: ${CONFIG.BATCH_SIZE}`);

  if (CONFIG.RAFFLE_IDS.length === 0) {
    console.log('\n⚠️  No se especificaron IDs de sorteos.');
    console.log('   Obteniendo sorteos activos...\n');

    const { data: raffles, error } = await supabase
      .from('raffles')
      .select('id, title, slug, total_tickets')
      .eq('status', 'active')
      .limit(10);

    if (error) {
      console.error('Error obteniendo sorteos:', error.message);
      process.exit(1);
    }

    if (!raffles || raffles.length === 0) {
      console.log('❌ No hay sorteos activos.');
      process.exit(1);
    }

    console.log('📋 Sorteos activos disponibles:');
    raffles.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.title} (${r.slug}) - ${r.total_tickets} boletos`);
      console.log(`      ID: ${r.id}`);
    });

    console.log('\n💡 Uso:');
    console.log('   export RAFFLE_IDS="id1,id2,id3"');
    console.log('   export RESERVATIONS_COUNT=1000');
    console.log('   npx tsx scripts/load-test/seed-reservations.ts');
    process.exit(0);
  }

  const startTime = Date.now();
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const raffleId of CONFIG.RAFFLE_IDS) {
    const result = await seedRaffle(raffleId.trim(), CONFIG.RESERVATIONS_PER_RAFFLE);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n================================================');
  console.log('📊 Resumen Final:');
  console.log(`   ✅ Total reservaciones creadas: ${totalSuccess}`);
  console.log(`   ❌ Total fallidas: ${totalFailed}`);
  console.log(`   ⏱️  Tiempo total: ${duration}s`);
  console.log(`   📈 Rate: ${(totalSuccess / parseFloat(duration)).toFixed(2)} reservaciones/segundo`);
}

main().catch(console.error);
