import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Mapeos ────────────────────────────────────────────────────────────────────

const equipmentMap = [
  { name: 'Sin equipamiento', aliases: ['peso corporal'] },
  { name: 'Calistenia', aliases: ['asistido'] },
  { name: 'Barras', aliases: ['barra con pesas', 'barra de pesas', 'barra olímpica', 'barra trampa'] },
  { name: 'Mancuernas', aliases: ['martillo', 'pesa', 'weighted'] },
  { name: 'Máquina', aliases: ['cable', 'máquina de apalancamiento', 'maquina smith', 'maquina eliptica', 'maquina de esquiar', 'máquina de paso a paso', 'máquina de trineo', 'bicicleta estacionaria', 'ergómetro de la parte superior del cuerpo'] },
  { name: 'Banda elástica', aliases: ['banda', 'banda de resistencia'] },
  { name: 'Funcional', aliases: ['pesa rusa', 'balón medicinal', 'pelota bosu', 'pelota de estabilidad', 'rodillo', 'wheel roller', 'soga', 'neumático'] },
];

const bodyPartMap = [
  { name: 'Brazos', aliases: ['antebrazos', 'brazos superiores'] },
  { name: 'Piernas', aliases: ['piernas inferiores', 'piernas superiores'] },
  { name: 'Espalda', aliases: ['espalda', 'atrás', 'cuello'] },
  { name: 'Pecho', aliases: ['pecho'] },
  { name: 'Hombros', aliases: [] },
  { name: 'Core/Abdomen', aliases: ['cintura', 'cardio'] },
];

const muscleMap = [
  { name: 'Abdominales', aliases: ['abdominals', 'abs', 'core', 'lower abs', 'obliques'] },
  { name: 'Abductores', aliases: ['abductors'] },
  { name: 'Aductores', aliases: ['adductors', 'inner thighs', 'groin'] },
  { name: 'Antebrazos', aliases: ['forearms', 'wrist extensors', 'wrist flexors', 'wrists', 'hands', 'grip muscles'] },
  { name: 'Bíceps', aliases: ['biceps', 'brachialis'] },
  { name: 'Cardio', aliases: ['cardiovascular system'] },
  { name: 'Cuello', aliases: ['levator scapulae', 'sternocleidomastoid'] },
  { name: 'Cuádriceps', aliases: ['quadriceps', 'quads'] },
  { name: 'Dorsales', aliases: ['latissimus dorsi', 'lats'] },
  { name: 'Espalda', aliases: ['back', 'upper back', 'rhomboids', 'serratus anterior', 'rotator cuff'] },
  { name: 'Femoral', aliases: ['hamstrings'] },
  { name: 'Gemelos', aliases: ['calves', 'soleus', 'ankles', 'ankle stabilizers', 'shins', 'feet'] },
  { name: 'Glúteos', aliases: ['glutes'] },
  { name: 'Hombros', aliases: ['shoulders', 'deltoids', 'delts', 'rear deltoids'] },
  { name: 'Lumbar', aliases: ['lower back', 'spine', 'hip flexors'] },
  { name: 'Pecho', aliases: ['chest', 'pectorals', 'upper chest'] },
  { name: 'Trapecio', aliases: ['trapezius', 'traps'] },
  { name: 'Tríceps', aliases: ['triceps'] },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await prisma.$connect();
  console.log('Conectado a la base de datos.\n');

  // A) Obtener todos los ejercicios con relaciones actuales
  console.log('A) Cargando ejercicios con relaciones...');
  const exercises = await prisma.exercise.findMany({
    include: { bodyParts: true, equipments: true, muscles: true },
  });
  console.log(`   ${exercises.length} ejercicios cargados.\n`);

  // B) Desconectar todas las relaciones
  console.log('B) Desconectando relaciones de ejercicios...');
  for (let i = 0; i < exercises.length; i++) {
    await prisma.exercise.update({
      where: { id: exercises[i].id },
      data: { bodyParts: { set: [] }, equipments: { set: [] }, muscles: { set: [] } },
    });
    if ((i + 1) % 100 === 0) process.stdout.write(`\r   ${i + 1}/${exercises.length}`);
  }
  console.log(`\r   ${exercises.length}/${exercises.length} relaciones desconectadas.\n`);

  // C) Eliminar catálogos existentes
  console.log('C) Eliminando catálogos existentes...');
  const [bpDel, eqDel, muDel] = await Promise.all([
    prisma.bodyPart.deleteMany(),
    prisma.equipment.deleteMany(),
    prisma.muscle.deleteMany(),
  ]);
  console.log(`   BodyParts eliminados: ${bpDel.count}`);
  console.log(`   Equipments eliminados: ${eqDel.count}`);
  console.log(`   Muscles eliminados: ${muDel.count}\n`);

  // D) Crear nuevos catálogos con aliases
  console.log('D) Creando nuevos catálogos...');
  const newBodyParts = await Promise.all(
    bodyPartMap.map((bp) => prisma.bodyPart.create({ data: { name: bp.name, aliases: bp.aliases } })),
  );
  const newEquipments = await Promise.all(
    equipmentMap.map((eq) => prisma.equipment.create({ data: { name: eq.name, aliases: eq.aliases } })),
  );
  const newMuscles = await Promise.all(
    muscleMap.map((m) => prisma.muscle.create({ data: { name: m.name, aliases: m.aliases } })),
  );
  console.log(`   BodyParts creados: ${newBodyParts.length}`);
  console.log(`   Equipments creados: ${newEquipments.length}`);
  console.log(`   Muscles creados: ${newMuscles.length}\n`);

  // E) Reasignar relaciones
  console.log('E) Reasignando relaciones por alias...');
  let processed = 0;
  let unmatchedBp = 0, unmatchedEq = 0, unmatchedMu = 0;

  for (const exercise of exercises) {
    const newBodyPartIds = new Set<string>();
    const newEquipmentIds = new Set<string>();
    const newMuscleIds = new Set<string>();

    for (const bp of exercise.bodyParts) {
      const match = newBodyParts.find((n) =>
        n.aliases.some((a) => a.toLowerCase() === bp.name.toLowerCase()),
      );
      if (match) newBodyPartIds.add(match.id);
      else unmatchedBp++;
    }

    for (const eq of exercise.equipments) {
      const match = newEquipments.find((n) =>
        n.aliases.some((a) => a.toLowerCase() === eq.name.toLowerCase()),
      );
      if (match) newEquipmentIds.add(match.id);
      else unmatchedEq++;
    }

    for (const m of exercise.muscles) {
      const match = newMuscles.find((n) =>
        n.aliases.some((a) => a.toLowerCase() === m.name.toLowerCase()),
      );
      if (match) newMuscleIds.add(match.id);
      else unmatchedMu++;
    }

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: {
        bodyParts: { set: [...newBodyPartIds].map((id) => ({ id })) },
        equipments: { set: [...newEquipmentIds].map((id) => ({ id })) },
        muscles: { set: [...newMuscleIds].map((id) => ({ id })) },
      },
    });

    processed++;
    process.stdout.write(
      `\r   [${processed}/${exercises.length}] ${exercise.name.slice(0, 40).padEnd(40)} → bp:${newBodyPartIds.size} eq:${newEquipmentIds.size} mu:${newMuscleIds.size}`,
    );
  }

  console.log('\n');

  // F) Resumen
  console.log('✅ Reestructuración completada');
  console.log(`   Ejercicios procesados : ${exercises.length}`);
  console.log(`   BodyParts creados     : ${newBodyParts.length}`);
  console.log(`   Equipments creados    : ${newEquipments.length}`);
  console.log(`   Muscles creados       : ${newMuscles.length}`);
  if (unmatchedBp + unmatchedEq + unmatchedMu > 0) {
    console.log(`\n⚠️  Sin match en alias:`);
    console.log(`   BodyParts sin match  : ${unmatchedBp}`);
    console.log(`   Equipments sin match : ${unmatchedEq}`);
    console.log(`   Muscles sin match    : ${unmatchedMu}`);
  }
}

main()
  .catch((err) => {
    console.error('\nError fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
