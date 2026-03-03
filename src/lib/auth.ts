import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { UserRole } from '@/generated/prisma';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const rememberMe = credentials.rememberMe === "true";

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        // Only ADMIN and TEAM can use password login
        if (user.role !== UserRole.ADMIN && user.role !== UserRole.TEAM) {
          return null;
        }

        if (!user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId,
          rememberMe,
        };
      },
    }),
    // TODO: Add Nodemailer provider for magic link when email is configured
  ],
});
