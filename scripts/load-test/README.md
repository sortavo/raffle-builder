# Load Testing - Sortavo

Scripts para pruebas de carga y stress testing del sistema.

## Requisitos

```bash
# Instalar dependencias
npm install tsx

# Instalar k6 (para load testing)
brew install k6  # macOS
# o ver: https://k6.io/docs/get-started/installation/
```

## 1. Seed de Reservaciones Masivas

Crea miles de reservaciones de prueba directamente en la base de datos.

### Configuración

```bash
# REQUERIDO: Service Role Key de Supabase
# Obtener de: https://supabase.com/dashboard/project/xnwqrgumstikdmsxtame/settings/api
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# IDs de los sorteos a poblar (separados por coma)
export RAFFLE_IDS="id1,id2,id3"

# Número de reservaciones por sorteo (default: 1000)
export RESERVATIONS_COUNT=1000

# Boletos por reservación (default: 3)
export TICKETS_PER_RESERVATION=3
```

### Ejecución

```bash
# Ver sorteos disponibles
npx tsx scripts/load-test/seed-reservations.ts

# Poblar 1000 reservaciones en 3 sorteos
export RAFFLE_IDS="uuid1,uuid2,uuid3"
export RESERVATIONS_COUNT=1000
npx tsx scripts/load-test/seed-reservations.ts
```

### Ejemplo: 5000 usuarios comprando en 3 sorteos

```bash
export SUPABASE_SERVICE_KEY="tu-service-key"
export RAFFLE_IDS="sorteo1-uuid,sorteo2-uuid,sorteo3-uuid"
export RESERVATIONS_COUNT=5000
export TICKETS_PER_RESERVATION=2
npx tsx scripts/load-test/seed-reservations.ts
```

Esto creará:
- 5,000 reservaciones × 3 sorteos = 15,000 reservaciones totales
- 15,000 × 2 boletos = 30,000 boletos reservados
- 15,000 compradores únicos

---

## 2. Load Testing con k6

Prueba de carga concurrente simulando usuarios reales.

### Configuración

```bash
# URL base (default: https://www.sortavo.com)
export BASE_URL="https://www.sortavo.com"

# Slugs de sorteos a probar
export RAFFLE_SLUGS="demo3/relojes-de-lujo,otro-sorteo"
```

### Ejecución

```bash
# Smoke test (1 usuario, 10 segundos)
k6 run scripts/load-test/k6-load-test.js

# Load test personalizado
k6 run --vus 50 --duration 2m scripts/load-test/k6-load-test.js

# Stress test (hasta 500 usuarios)
k6 run scripts/load-test/k6-load-test.js
```

### Escenarios incluidos

| Escenario | VUs | Duración | Descripción |
|-----------|-----|----------|-------------|
| Smoke | 1 | 10s | Verificar funcionamiento |
| Load | 50-100 | 3m | Carga normal |
| Stress | 200-500 | 3m | Límites del sistema |

### Métricas reportadas

- `http_req_duration` - Tiempo de respuesta HTTP
- `page_load_time` - Tiempo de carga de página
- `ticket_reservation_time` - Tiempo de reservación
- `errors` - Tasa de errores

---

## 3. Stress Test del Dashboard

Prueba del flujo de aprobaciones con Playwright.

### Prerequisitos

1. Primero poblar datos con el seed script
2. Tener credenciales de organizador

### Configuración

```bash
export TEST_ORGANIZER_EMAIL="demo1@sortavo.com"
export TEST_ORGANIZER_PASSWORD="tu-password"
export APPROVALS_TO_PROCESS=50
```

### Ejecución

```bash
# Ejecutar stress test del dashboard
npx playwright test e2e/stress-test/approval-stress.spec.ts

# Con UI para ver en vivo
npx playwright test e2e/stress-test/approval-stress.spec.ts --headed

# Solo benchmarks
npx playwright test e2e/stress-test/approval-stress.spec.ts -g "benchmark"
```

### Tests incluidos

- ✅ Carga de página con miles de pendientes
- ✅ Paginación eficiente
- ✅ Aprobación individual
- ✅ Aprobación masiva
- ✅ Búsqueda y filtrado
- ✅ Clicks rápidos consecutivos
- ✅ Métricas de rendimiento

---

## Flujo Completo de Pruebas

### Paso 1: Preparar datos

```bash
# Obtener IDs de sorteos activos
export SUPABASE_SERVICE_KEY="tu-key"
npx tsx scripts/load-test/seed-reservations.ts

# Copiar los IDs mostrados
export RAFFLE_IDS="id1,id2,id3"
export RESERVATIONS_COUNT=2000
npx tsx scripts/load-test/seed-reservations.ts
```

### Paso 2: Load test de compradores

```bash
k6 run --vus 100 --duration 5m scripts/load-test/k6-load-test.js
```

### Paso 3: Stress test del dashboard

```bash
npx playwright test e2e/stress-test/approval-stress.spec.ts --headed
```

---

## Limpieza de datos de prueba

```sql
-- Eliminar reservaciones de prueba (en Supabase SQL Editor)
DELETE FROM tickets
WHERE buyer_email LIKE '%@test.sortavo.com'
   OR buyer_email LIKE 'loadtest_%';

DELETE FROM buyers
WHERE email LIKE '%@test.sortavo.com'
   OR email LIKE 'loadtest_%';
```

---

## Thresholds esperados

| Métrica | Target | Crítico |
|---------|--------|---------|
| Page Load | < 3s | < 5s |
| Single Approval | < 2s | < 3s |
| Bulk Approval (100) | < 10s | < 15s |
| Search | < 1s | < 2s |
| Error Rate | < 1% | < 5% |
