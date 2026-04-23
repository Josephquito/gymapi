import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const BASE_URL = 'https://oss.exercisedb.dev/api/v1/exercises';
const LIMIT = 25;
const DELAY_MS = 1000;

interface ApiExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
}

interface ApiMeta {
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
}

interface ApiResponse {
  data: ApiExercise[];
  meta: ApiMeta;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(after: string, retries = 5): Promise<ApiResponse> {
  const url = `${BASE_URL}?limit=${LIMIT}&after=${after}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json() as Promise<ApiResponse>;
    if (res.status === 429) {
      const waitMs = 2000 * Math.pow(2, attempt);
      process.stdout.write(`\n  Rate limited — esperando ${waitMs / 1000}s...`);
      await sleep(waitMs);
      continue;
    }
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  throw new Error(`Agotados los reintentos para ${url}`);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await prisma.$connect();
    console.log('Conectado a la base de datos.');

    // --- Paginar y recopilar todos los ejercicios ---
    const allExercises: ApiExercise[] = [];
    let cursor = '';
    let page = 0;

    console.log('Descargando ejercicios de ExerciseDB...');
    while (true) {
      const response = await fetchPage(cursor);
      allExercises.push(...response.data);
      page++;
      const total = response.meta?.total ?? '?';
      process.stdout.write(`\r  Página ${page} — ${allExercises.length}/${total} ejercicios descargados`);

      if (!response.meta?.hasNextPage || !response.meta?.nextCursor) break;
      cursor = response.meta.nextCursor;
      await sleep(DELAY_MS);
    }
    console.log(`\nDescarga completa: ${allExercises.length} ejercicios totales.\n`);

    // --- Recopilar valores únicos de catálogos ---
    const bodyPartNames = new Set<string>();
    const equipmentNames = new Set<string>();
    const muscleNames = new Set<string>();

    for (const ex of allExercises) {
      ex.bodyParts?.forEach((b) => bodyPartNames.add(b));
      ex.equipments?.forEach((e) => equipmentNames.add(e));
      ex.targetMuscles?.forEach((m) => muscleNames.add(m));
      ex.secondaryMuscles?.forEach((m) => muscleNames.add(m));
    }

    // --- Upsert catálogos ---
    console.log(`Sincronizando catálogos...`);
    console.log(`  BodyParts: ${bodyPartNames.size}`);
    for (const name of bodyPartNames) {
      await prisma.bodyPart.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }

    console.log(`  Equipments: ${equipmentNames.size}`);
    for (const name of equipmentNames) {
      await prisma.equipment.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }

    console.log(`  Muscles: ${muscleNames.size}`);
    for (const name of muscleNames) {
      await prisma.muscle.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }
    console.log('Catálogos sincronizados.\n');

    // --- Cargar mapas nombre → id ---
    const bodyPartMap = new Map<string, string>();
    const equipmentMap = new Map<string, string>();
    const muscleMap = new Map<string, string>();

    (await prisma.bodyPart.findMany()).forEach((b) => bodyPartMap.set(b.name, b.id));
    (await prisma.equipment.findMany()).forEach((e) => equipmentMap.set(e.name, e.id));
    (await prisma.muscle.findMany()).forEach((m) => muscleMap.set(m.name, m.id));

    // --- Upsert ejercicios ---
    console.log(`Sincronizando ${allExercises.length} ejercicios...`);
    let created = 0;
    let errors = 0;

    for (let i = 0; i < allExercises.length; i++) {
      const ex = allExercises[i];
      process.stdout.write(`\r  ${i + 1}/${allExercises.length} — errores: ${errors}`);

      try {
        const bodyPartsConnect = (ex.bodyParts ?? [])
          .map((n) => bodyPartMap.get(n))
          .filter(Boolean)
          .map((id) => ({ id: id! }));

        const equipmentsConnect = (ex.equipments ?? [])
          .map((n) => equipmentMap.get(n))
          .filter(Boolean)
          .map((id) => ({ id: id! }));

        const musclesConnect = [
          ...(ex.targetMuscles ?? []),
          ...(ex.secondaryMuscles ?? []),
        ]
          .map((n) => muscleMap.get(n))
          .filter(Boolean)
          .map((id) => ({ id: id! }));

        await prisma.exercise.upsert({
          where: { exerciseId: ex.exerciseId },
          create: {
            exerciseId: ex.exerciseId,
            name: ex.name,
            nameEn: ex.name,
            gifUrl: ex.gifUrl,
            instructions: [],
            isSystem: true,
            isActive: true,
            bodyParts: { connect: bodyPartsConnect },
            equipments: { connect: equipmentsConnect },
            muscles: { connect: musclesConnect },
          },
          update: {
            name: ex.name,
            nameEn: ex.name,
            gifUrl: ex.gifUrl,
            bodyParts: { set: bodyPartsConnect },
            equipments: { set: equipmentsConnect },
            muscles: { set: musclesConnect },
          },
        });
        created++;
      } catch (err) {
        errors++;
        console.error(`\n  Error en ejercicio "${ex.name}" (${ex.exerciseId}):`, err);
      }
    }

    console.log(`\n\n=== RESUMEN ===`);
    console.log(`  Ejercicios procesados : ${allExercises.length}`);
    console.log(`  Ejercicios upserted   : ${created}`);
    console.log(`  Errores               : ${errors}`);
    console.log(`  BodyParts             : ${bodyPartNames.size}`);
    console.log(`  Equipments            : ${equipmentNames.size}`);
    console.log(`  Muscles               : ${muscleNames.size}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
