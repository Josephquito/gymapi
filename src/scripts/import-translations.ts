import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';

async function main() {
  const batchFile = process.argv[2];
  if (!batchFile) {
    console.error('❌ Debes pasar el archivo CSV como argumento');
    console.error(
      '   Uso: npx ts-node import-translations.ts batch_001_aliases_latam.csv',
    );
    process.exit(1);
  }

  const filePath = resolve(
    __dirname,
    '../../../exports/exercises-batches/translated',
    batchFile,
  );
  const content = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''); // quita BOM

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as {
    id: string;
    name_es: string;
    alias_1: string;
    alias_2: string;
    alias_3: string;
  }[];

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    await prisma.$connect();
    console.log(
      `\n📂 Procesando: ${batchFile} (${records.length} ejercicios)\n`,
    );

    for (const row of records) {
      try {
        // Arma el array de aliases limpio sin vacíos ni duplicados
        const aliases = [row.alias_1, row.alias_2, row.alias_3]
          .map((a) => a?.trim())
          .filter((a) => a && a !== row.name_es);

        // Busca el ejercicio
        const exercise = await prisma.exercise.findUnique({
          where: { id: row.id },
        });

        if (!exercise) {
          console.warn(`⚠️  No encontrado: ${row.id}`);
          skipped++;
          continue;
        }

        await prisma.exercise.update({
          where: { id: row.id },
          data: {
            name: row.name_es, // nombre principal en español latino
            nameEn: exercise.nameEn ?? exercise.name, // conserva el nameEn si ya existe
            aliases,
          },
        });

        console.log(
          `✅ ${row.name_es.padEnd(45)} aliases: [${aliases.join(', ')}]`,
        );
        updated++;
      } catch (err) {
        console.error(`❌ Error en ${row.id}:`, err);
        errors++;
      }
    }

    console.log(`\n─────────────────────────────────────`);
    console.log(`✅ Actualizados : ${updated}`);
    console.log(`⚠️  No encontrados: ${skipped}`);
    console.log(`❌ Errores      : ${errors}`);
    console.log(`─────────────────────────────────────\n`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
