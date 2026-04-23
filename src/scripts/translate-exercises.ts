import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { translate } from '@vitalets/google-translate-api';

const BATCH_SIZE = 15;       // nombres por petición a Google
const BATCH_DELAY_MS = 3000; // espera entre lotes en primera pasada
const RETRY_DELAY_MS = 10000; // espera entre lotes en reintento

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Separador que Google no va a traducir
const SEP = '|||';

/**
 * Traduce un lote de textos en una sola petición.
 * Une con SEP, traduce, parte por SEP.
 * Si el recuento no cuadra, lanza excepción.
 */
async function translateBatch(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  const joined = texts.join(`\n${SEP}\n`);
  const result = await translate(joined, { from: 'en', to: 'es' });
  const parts = result.text.split(SEP).map((s) => s.replace(/^\n+|\n+$/g, '').trim());
  if (parts.length !== texts.length) {
    throw new Error(
      `Recuento de partes incorrecto: esperado ${texts.length}, recibido ${parts.length}`,
    );
  }
  return parts;
}

interface FailedBatch {
  model: string;
  items: Array<{ id: string; originalName: string; nameEn?: string }>;
}

async function processBatches(
  model: string,
  items: Array<{ id: string; name: string; nameEn?: string | null }>,
  delayMs: number,
  updateFn: (id: string, translated: string, originalName: string, nameEn?: string | null) => Promise<void>,
): Promise<{ success: number; failedBatches: FailedBatch[] }> {
  let success = 0;
  const failedBatches: FailedBatch[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    if (i > 0) await sleep(delayMs);

    try {
      const originals = batch.map((it) => it.name);
      const translated = await translateBatch(originals);

      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        await updateFn(item.id, translated[j], item.name, item.nameEn);
        console.log(`  [${i + j + 1}/${items.length}] "${item.name}" → "${translated[j]}"`);
        success++;
      }
      process.stdout.write(`\r  Lote ${batchNum}/${totalBatches} OK`);
      console.log('');
    } catch (err: any) {
      console.error(`\n  Lote ${batchNum}/${totalBatches} ERROR: ${err.message}`);
      failedBatches.push({
        model,
        items: batch.map((it) => ({
          id: it.id,
          originalName: it.name,
          nameEn: it.nameEn ?? undefined,
        })),
      });
    }
  }

  return { success, failedBatches };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let totalSuccess = 0;
  let allFailedBatches: FailedBatch[] = [];

  try {
    await prisma.$connect();
    console.log('Conectado a la base de datos.\n');

    // ── BodyParts ───────────────────────────────────────────────
    const bodyParts = await prisma.bodyPart.findMany({ orderBy: { name: 'asc' } });
    console.log(`=== BodyPart (${bodyParts.length} — ${Math.ceil(bodyParts.length / BATCH_SIZE)} lotes) ===`);
    const bpResult = await processBatches(
      'BodyPart',
      bodyParts,
      BATCH_DELAY_MS,
      async (id, translated) => {
        await prisma.bodyPart.update({ where: { id }, data: { name: translated } });
      },
    );
    totalSuccess += bpResult.success;
    allFailedBatches.push(...bpResult.failedBatches);

    // ── Equipment ────────────────────────────────────────────────
    const equipments = await prisma.equipment.findMany({ orderBy: { name: 'asc' } });
    console.log(`\n=== Equipment (${equipments.length} — ${Math.ceil(equipments.length / BATCH_SIZE)} lotes) ===`);
    const eqResult = await processBatches(
      'Equipment',
      equipments,
      BATCH_DELAY_MS,
      async (id, translated) => {
        await prisma.equipment.update({ where: { id }, data: { name: translated } });
      },
    );
    totalSuccess += eqResult.success;
    allFailedBatches.push(...eqResult.failedBatches);

    // ── Muscle ───────────────────────────────────────────────────
    const muscles = await prisma.muscle.findMany({ orderBy: { name: 'asc' } });
    console.log(`\n=== Muscle (${muscles.length} — ${Math.ceil(muscles.length / BATCH_SIZE)} lotes) ===`);
    const muResult = await processBatches(
      'Muscle',
      muscles,
      BATCH_DELAY_MS,
      async (id, translated) => {
        await prisma.muscle.update({ where: { id }, data: { name: translated } });
      },
    );
    totalSuccess += muResult.success;
    allFailedBatches.push(...muResult.failedBatches);

    // ── Exercise ─────────────────────────────────────────────────
    const exercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } });
    console.log(`\n=== Exercise (${exercises.length} — ${Math.ceil(exercises.length / BATCH_SIZE)} lotes) ===`);
    const exResult = await processBatches(
      'Exercise',
      exercises,
      BATCH_DELAY_MS,
      async (id, translated, originalName, nameEn) => {
        await prisma.exercise.update({
          where: { id },
          data: {
            name: translated,
            ...(!nameEn ? { nameEn: originalName } : {}),
          },
        });
      },
    );
    totalSuccess += exResult.success;
    allFailedBatches.push(...exResult.failedBatches);

    // ── Reintento de lotes fallidos (10s entre lotes) ────────────
    if (allFailedBatches.length > 0) {
      const totalFailed = allFailedBatches.reduce((s, b) => s + b.items.length, 0);
      console.log(`\n=== Reintentando ${allFailedBatches.length} lotes fallidos (${totalFailed} items) — delay ${RETRY_DELAY_MS / 1000}s ===`);
      const stillFailed: FailedBatch[] = [];

      for (let bi = 0; bi < allFailedBatches.length; bi++) {
        const fb = allFailedBatches[bi];
        if (bi > 0) await sleep(RETRY_DELAY_MS);

        try {
          const originals = fb.items.map((it) => it.originalName);
          const translated = await translateBatch(originals);

          for (let j = 0; j < fb.items.length; j++) {
            const item = fb.items[j];
            try {
              if (fb.model === 'BodyPart') {
                await prisma.bodyPart.update({ where: { id: item.id }, data: { name: translated[j] } });
              } else if (fb.model === 'Equipment') {
                await prisma.equipment.update({ where: { id: item.id }, data: { name: translated[j] } });
              } else if (fb.model === 'Muscle') {
                await prisma.muscle.update({ where: { id: item.id }, data: { name: translated[j] } });
              } else if (fb.model === 'Exercise') {
                await prisma.exercise.update({
                  where: { id: item.id },
                  data: {
                    name: translated[j],
                    ...(!item.nameEn ? { nameEn: item.originalName } : {}),
                  },
                });
              }
              console.log(`  [${fb.model}] "${item.originalName}" → "${translated[j]}" ✓`);
              totalSuccess++;
            } catch (err: any) {
              console.error(`  [${fb.model}] "${item.originalName}" — error DB: ${err.message}`);
              stillFailed.push({ model: fb.model, items: [item] });
            }
          }
        } catch (err: any) {
          console.error(`  Lote ${bi + 1}/${allFailedBatches.length} sigue fallando: ${err.message}`);
          stillFailed.push(fb);
        }
      }

      allFailedBatches = stillFailed;
    }

    // ── Resumen ──────────────────────────────────────────────────
    const totalItems = bodyParts.length + equipments.length + muscles.length + exercises.length;
    const finalFailed = allFailedBatches.reduce((s, b) => s + b.items.length, 0);

    console.log('\n=== RESUMEN ===');
    console.log(`  Total items        : ${totalItems}`);
    console.log(`  Traducidos OK      : ${totalSuccess}`);
    console.log(`  Fallidos finales   : ${finalFailed}`);

    if (finalFailed > 0) {
      console.log('\n  Items que fallaron:');
      for (const fb of allFailedBatches) {
        for (const item of fb.items) {
          console.log(`    - [${fb.model}] "${item.originalName}"`);
        }
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
