import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const EXPORTS_DIR = resolve(__dirname, '../../../exports');

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

    // ── BodyPart ─────────────────────────────────────────────────
    const bodyParts = await prisma.bodyPart.findMany({ orderBy: { name: 'asc' } });
    writeFileSync(
      `${EXPORTS_DIR}/body-parts.csv`,
      toCsv(
        ['id', 'name', 'isActive'],
        bodyParts.map((r) => [r.id, r.name, String(r.isActive)]),
      ),
      'utf-8',
    );
    console.log(`BodyPart   : ${bodyParts.length} registros → ${EXPORTS_DIR}/body-parts.csv`);

    // ── Equipment ────────────────────────────────────────────────
    const equipments = await prisma.equipment.findMany({ orderBy: { name: 'asc' } });
    writeFileSync(
      `${EXPORTS_DIR}/equipments.csv`,
      toCsv(
        ['id', 'name', 'isActive'],
        equipments.map((r) => [r.id, r.name, String(r.isActive)]),
      ),
      'utf-8',
    );
    console.log(`Equipment  : ${equipments.length} registros → ${EXPORTS_DIR}/equipments.csv`);

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
    console.log(`Muscle     : ${muscles.length} registros → ${EXPORTS_DIR}/muscles.csv`);

    // ── Exercise (con relaciones) ─────────────────────────────────
    const exercises = await prisma.exercise.findMany({
      orderBy: { name: 'asc' },
      include: { bodyParts: true, equipments: true, muscles: true },
    });
    writeFileSync(
      `${EXPORTS_DIR}/exercises.csv`,
      toCsv(
        ['id', 'exerciseId', 'name', 'nameEn', 'gifUrl', 'isActive', 'bodyParts', 'equipments', 'muscles'],
        exercises.map((r) => [
          r.id,
          r.exerciseId ?? '',
          r.name,
          r.nameEn ?? '',
          r.gifUrl ?? '',
          String(r.isActive),
          r.bodyParts.map((b) => b.name).join('|'),
          r.equipments.map((e) => e.name).join('|'),
          r.muscles.map((m) => m.name).join('|'),
        ]),
      ),
      'utf-8',
    );
    console.log(`Exercise   : ${exercises.length} registros → ${EXPORTS_DIR}/exercises.csv`);

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
