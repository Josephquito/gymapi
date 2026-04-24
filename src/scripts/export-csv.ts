import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const EXPORTS_DIR = resolve(__dirname, '../../../exports');
const BATCH_SIZE = 100;

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = headers.map(escape).join(',');
  const body = rows.map((r) => r.map(escape).join(',')).join('\n');
  return header + '\n' + body;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await prisma.$connect();
    mkdirSync(EXPORTS_DIR, { recursive: true });
    mkdirSync(`${EXPORTS_DIR}/exercises-batches`, { recursive: true });

    // ── BodyPart ─────────────────────────────────────────────────
    const bodyParts = await prisma.bodyPart.findMany({
      orderBy: { name: 'asc' },
    });
    writeFileSync(
      `${EXPORTS_DIR}/body-parts.csv`,
      toCsv(
        ['id', 'name', 'isActive'],
        bodyParts.map((r) => [r.id, r.name, String(r.isActive)]),
      ),
      'utf-8',
    );
    console.log(`BodyPart   : ${bodyParts.length} registros → body-parts.csv`);

    // ── Equipment ────────────────────────────────────────────────
    const equipments = await prisma.equipment.findMany({
      orderBy: { name: 'asc' },
    });
    writeFileSync(
      `${EXPORTS_DIR}/equipments.csv`,
      toCsv(
        ['id', 'name', 'isActive'],
        equipments.map((r) => [r.id, r.name, String(r.isActive)]),
      ),
      'utf-8',
    );
    console.log(`Equipment  : ${equipments.length} registros → equipments.csv`);

    // ── Muscle ───────────────────────────────────────────────────
    const muscles = await prisma.muscle.findMany({ orderBy: { name: 'asc' } });
    writeFileSync(
      `${EXPORTS_DIR}/muscles.csv`,
      toCsv(
        ['id', 'name', 'isActive'],
        muscles.map((r) => [r.id, r.name, String(r.isActive)]),
      ),
      'utf-8',
    );
    console.log(`Muscle     : ${muscles.length} registros → muscles.csv`);

    // ── Exercise completo ─────────────────────────────────────────
    const exercises = await prisma.exercise.findMany({
      orderBy: { name: 'asc' },
      include: { bodyParts: true, equipments: true, muscles: true },
    });

    const exerciseHeaders = [
      'id',
      'exerciseId',
      'name',
      'nameEn',
      'gifUrl',
      'isActive',
      'bodyParts',
      'equipments',
      'muscles',
    ];
    const exerciseRows = exercises.map((r) => [
      r.id,
      r.exerciseId ?? '',
      r.nameEn ?? r.name,
      r.nameEn ?? '',
      r.gifUrl ?? '',
      String(r.isActive),
      r.bodyParts.map((b) => b.name).join('|'),
      r.equipments.map((e) => e.name).join('|'),
      r.muscles.map((m) => m.name).join('|'),
    ]);

    writeFileSync(
      `${EXPORTS_DIR}/exercises.csv`,
      toCsv(exerciseHeaders, exerciseRows),
      'utf-8',
    );
    console.log(`Exercise   : ${exercises.length} registros → exercises.csv`);

    // ── Lotes para traducción ─────────────────────────────────────
    // name actual → se usa como nameEn (inglés original)
    // ChatGPT devolverá: id, name_es, alias_1, alias_2, alias_3
    const totalBatches = Math.ceil(exercises.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const batch = exercises.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const batchNum = String(i + 1).padStart(3, '0');

      writeFileSync(
        `${EXPORTS_DIR}/exercises-batches/batch_${batchNum}.csv`,
        toCsv(
          ['id', 'name', 'bodyParts', 'equipments', 'muscles'],
          batch.map((r) => [
            r.id,
            r.nameEn ?? r.name, // ← toma nameEn, si no tiene cae a name
            r.bodyParts.map((b) => b.name).join('|'),
            r.equipments.map((e) => e.name).join('|'),
            r.muscles.map((m) => m.name).join('|'),
          ]),
        ),
        'utf-8',
      );
    }

    console.log(
      `\nLotes      : ${totalBatches} archivos de ${BATCH_SIZE} → exports/exercises-batches/`,
    );
    console.log(`\nArchivos exportados en: ${EXPORTS_DIR}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
