import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = 'josephadmin';
  const email = 'josequito037@gmail.com';
  const password = 'Ellayyo.123';

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log('❌ El admin ya existe');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      username,
      email,
      password: hashed,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('✅ Admin creado:');
  console.log(`   Username : ${admin.username}`);
  console.log(`   Email    : ${admin.email}`);
  console.log(`   Password : ${password}`);
  console.log(`   Role     : ${admin.role}`);
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
