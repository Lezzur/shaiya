import { PrismaClient, UserRole, AuthMethod } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

// For seeding, use direct postgres connection (not Prisma Accelerate URL)
const connectionString =
  process.env.DIRECT_DATABASE_URL ||
  'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('FAqrN50l7=$,', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'rocketturtles.creative@gmail.com' },
    update: {},
    create: {
      email: 'rocketturtles.creative@gmail.com',
      name: 'Admin',
      role: UserRole.ADMIN,
      authMethod: AuthMethod.PASSWORD,
      passwordHash,
      skills: [],
    },
  });

  console.log('Created admin user:', adminUser.email);
  console.log('Seeding complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
