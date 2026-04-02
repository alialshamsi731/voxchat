const { PrismaClient } = require('@prisma/client');

// Singleton pattern – reuse the same Prisma instance across modules
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;
