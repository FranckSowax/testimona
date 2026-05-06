import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __testimona_prisma__: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  });

export const prisma: PrismaClient =
  globalThis.__testimona_prisma__ ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__testimona_prisma__ = prisma;
}

export type {
  Prisma,
  User,
  Memorial,
  Testimonial,
  Photo,
  Donation,
  Chapter,
  Funeral,
  FuneralEvent,
  Biography,
  AuthenticationMode,
  UserRole,
  DonationStatus,
} from '@prisma/client';
