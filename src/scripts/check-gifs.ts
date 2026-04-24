import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const EXPORTS_DIR = resolve(__dirname, '../../../exports');

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  await prisma.$connect();
  mkdirSync(EXPORTS_DIR, { recursive: true });

  const exercises = await prisma.exercise.findMany({
    where: { gifUrl: { not: null } },
    select: { id: true, name: true, gifUrl: true },
    orderBy: { name: 'asc' },
  });

  console.log(`Verificando ${exercises.length} GIFs...\n`);

  const failed: { id: string; name: string; gifUrl: string }[] = [];
  const BATCH = 20;

  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (ex) => {
        const ok = await checkUrl(ex.gifUrl!);
        if (!ok) failed.push({ id: ex.id, name: ex.name, gifUrl: ex.gifUrl! });
      }),
    );
    process.stdout.write(
      `\r  Progreso: ${Math.min(i + BATCH, exercises.length)}/${exercises.length}`,
    );
  }

  console.log(`\n\n✅ Verificación completa`);
  console.log(`   GIFs ok     : ${exercises.length - failed.length}`);
  console.log(`   GIFs fallidos: ${failed.length}`);

  if (failed.length > 0) {
    const csv = ['id,name,gifUrl']
      .concat(
        failed.map(
          (r) => `"${r.id}","${r.name.replace(/"/g, '""')}","${r.gifUrl}"`,
        ),
      )
      .join('\n');

    const path = `${EXPORTS_DIR}/failed-gifs.csv`;
    writeFileSync(path, csv, 'utf-8');
    console.log(`\n   Exportado en: ${path}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
