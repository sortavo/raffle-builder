/**
 * Script completo de Load Test
 * 1. Genera boletos para los sorteos
 * 2. Crea 10,000 reservaciones con comprobantes de pago
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Sorteos a usar (NO demo1@sortavo.com)
const RAFFLES = [
  { id: 'e5248331-e05e-4870-af20-9c004fffb255', name: 'Harley-Davidson', totalTickets: 500000 },
  { id: '66608e60-93dd-4b9b-b5f8-3e92a86c8d18', name: 'Laptop Gamer', totalTickets: 25000 },
  { id: '34b5ab00-8b0b-4a75-9e97-a6d39ed3d4ec', name: 'Viaje Cancún', totalTickets: 50000 },
];

const CONFIG = {
  TOTAL_RESERVATIONS: 10000,
  TICKETS_PER_RESERVATION: 3,
  BATCH_SIZE: 500,
  TICKET_BATCH_SIZE: 5000,
};

// Generador de nombres aleatorios
const FIRST_NAMES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofia', 'José', 'Carmen', 'Luis', 'Patricia', 'Jorge', 'Diana', 'Roberto', 'Elena', 'Fernando', 'Rosa', 'Antonio', 'Lucia'];
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Cruz', 'Morales', 'Ortiz', 'Gutiérrez', 'Chavez'];
const CITIES = ['CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Mérida', 'Cancún', 'Querétaro', 'Chihuahua', 'Aguascalientes', 'Morelia', 'Veracruz', 'Toluca'];
const PAYMENT_METHODS = ['transferencia', 'oxxo', 'efectivo', 'tarjeta', 'spei'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function padNumber(num, length) {
  return num.toString().padStart(length, '0');
}

async function generateTickets(raffleId, totalTickets, ticketsNeeded) {
  console.log(`\n🎫 Generando boletos para ${raffleId}...`);

  // Check existing tickets
  const { count: existing } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('raffle_id', raffleId);

  if (existing >= ticketsNeeded) {
    console.log(`   ✅ Ya existen ${existing} boletos`);
    return existing;
  }

  const startFrom = existing || 0;
  const toGenerate = Math.min(ticketsNeeded - startFrom, totalTickets - startFrom);
  const digits = totalTickets.toString().length;

  console.log(`   📊 Existentes: ${existing}, Generando: ${toGenerate}`);

  let generated = 0;
  for (let i = startFrom; i < startFrom + toGenerate; i += CONFIG.TICKET_BATCH_SIZE) {
    const batch = [];
    const batchEnd = Math.min(i + CONFIG.TICKET_BATCH_SIZE, startFrom + toGenerate);

    for (let j = i; j < batchEnd; j++) {
      batch.push({
        raffle_id: raffleId,
        ticket_number: padNumber(j + 1, digits),
        status: 'available',
      });
    }

    const { error } = await supabase.from('tickets').insert(batch);
    if (error) {
      console.error(`   ❌ Error en batch:`, error.message);
      continue;
    }

    generated += batch.length;
    process.stdout.write(`\r   📦 Generados: ${generated}/${toGenerate}`);
  }

  console.log(`\n   ✅ Generación completada: ${generated} boletos`);
  return generated + existing;
}

async function createReservations(raffleId, raffleName, count, startIndex) {
  console.log(`\n📝 Creando ${count} reservaciones en ${raffleName}...`);

  // Get available tickets
  const ticketsNeeded = count * CONFIG.TICKETS_PER_RESERVATION;
  const { data: availableTickets, error: ticketError } = await supabase
    .from('tickets')
    .select('id, ticket_number')
    .eq('raffle_id', raffleId)
    .eq('status', 'available')
    .limit(ticketsNeeded);

  if (ticketError || !availableTickets) {
    console.error(`   ❌ Error obteniendo boletos:`, ticketError?.message);
    return { success: 0, failed: 0 };
  }

  console.log(`   🎫 Boletos disponibles: ${availableTickets.length}`);

  const actualReservations = Math.floor(availableTickets.length / CONFIG.TICKETS_PER_RESERVATION);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < actualReservations; i += CONFIG.BATCH_SIZE) {
    const batchEnd = Math.min(i + CONFIG.BATCH_SIZE, actualReservations);
    const buyers = [];
    const ticketUpdates = [];

    for (let j = i; j < batchEnd; j++) {
      const buyerIndex = startIndex + j;
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);

      const buyer = {
        full_name: `${firstName} ${lastName}`,
        email: `loadtest_${buyerIndex}_${Date.now()}@test.sortavo.com`,
        phone: `55${Math.floor(10000000 + Math.random() * 90000000)}`,
        city: randomElement(CITIES),
        is_guest: true,
        email_verified: false,
      };
      buyers.push(buyer);

      const ticketStart = j * CONFIG.TICKETS_PER_RESERVATION;
      const ticketIds = availableTickets
        .slice(ticketStart, ticketStart + CONFIG.TICKETS_PER_RESERVATION)
        .map(t => t.id);

      ticketUpdates.push({
        ticketIds,
        buyerData: {
          buyer_name: buyer.full_name,
          buyer_email: buyer.email,
          buyer_phone: buyer.phone,
          buyer_city: buyer.city,
          status: 'reserved',
          reserved_at: new Date().toISOString(),
          reserved_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          payment_method: randomElement(PAYMENT_METHODS),
          payment_proof_url: `https://storage.sortavo.com/proofs/load_test_${buyerIndex}_${Math.random().toString(36).substring(2, 10)}.jpg`,
          payment_reference: `REF-LT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        }
      });
    }

    // Insert buyers
    const { data: insertedBuyers, error: buyerError } = await supabase
      .from('buyers')
      .insert(buyers)
      .select('id');

    if (buyerError) {
      console.error(`   ❌ Error creando buyers:`, buyerError.message);
      failed += buyers.length;
      continue;
    }

    // Update tickets with buyer_id
    for (let k = 0; k < ticketUpdates.length; k++) {
      const { ticketIds, buyerData } = ticketUpdates[k];
      const buyerId = insertedBuyers[k]?.id;

      if (!buyerId) continue;

      const { error: updateError } = await supabase
        .from('tickets')
        .update({ ...buyerData, buyer_id: buyerId })
        .in('id', ticketIds);

      if (updateError) {
        failed++;
      } else {
        success++;
      }
    }

    const progress = Math.round(((i + batchEnd - i) / actualReservations) * 100);
    process.stdout.write(`\r   📊 Progreso: ${Math.min(progress, 100)}% (${success} exitosas, ${failed} fallidas)`);
  }

  console.log(`\n   ✅ Completado: ${success} reservaciones`);
  return { success, failed };
}

async function main() {
  console.log('🚀 SORTAVO LOAD TEST - 10,000 RESERVACIONES');
  console.log('=============================================');
  console.log(`📋 Sorteos: ${RAFFLES.map(r => r.name).join(', ')}`);
  console.log(`🎯 Total reservaciones: ${CONFIG.TOTAL_RESERVATIONS}`);
  console.log(`🎫 Boletos por reservación: ${CONFIG.TICKETS_PER_RESERVATION}`);

  const startTime = Date.now();
  const reservationsPerRaffle = Math.ceil(CONFIG.TOTAL_RESERVATIONS / RAFFLES.length);
  const ticketsNeededPerRaffle = reservationsPerRaffle * CONFIG.TICKETS_PER_RESERVATION;

  // Step 1: Generate tickets
  console.log('\n\n📦 PASO 1: Generando boletos...');
  console.log('================================');

  for (const raffle of RAFFLES) {
    await generateTickets(raffle.id, raffle.totalTickets, ticketsNeededPerRaffle);
  }

  // Step 2: Create reservations
  console.log('\n\n📝 PASO 2: Creando reservaciones...');
  console.log('=====================================');

  let totalSuccess = 0;
  let totalFailed = 0;
  let reservationIndex = 0;

  for (const raffle of RAFFLES) {
    const result = await createReservations(
      raffle.id,
      raffle.name,
      reservationsPerRaffle,
      reservationIndex
    );
    totalSuccess += result.success;
    totalFailed += result.failed;
    reservationIndex += reservationsPerRaffle;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\n=============================================');
  console.log('📊 RESUMEN FINAL');
  console.log('=============================================');
  console.log(`✅ Reservaciones creadas: ${totalSuccess}`);
  console.log(`❌ Fallidas: ${totalFailed}`);
  console.log(`🎫 Boletos reservados: ${totalSuccess * CONFIG.TICKETS_PER_RESERVATION}`);
  console.log(`⏱️  Tiempo total: ${duration}s`);
  console.log(`📈 Rate: ${(totalSuccess / parseFloat(duration)).toFixed(2)} reservaciones/segundo`);
  console.log('\n🎉 ¡Load test completado!');
  console.log('   Ahora puedes probar el dashboard de aprobaciones');
}

main().catch(console.error);
