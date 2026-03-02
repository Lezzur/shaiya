import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Nodemailer from 'next-auth/providers/nodemailer';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { UserRole } from '@/generated/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // No adapter needed - we use JWT strategy with custom User table
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    // Credentials provider for email + password (internal users: ADMIN, TEAM)
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

        // Check password hash
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
        };
      },
    }),

    // Email provider for magic link (client users) - stub configuration
    Nodemailer({
      id: 'magic-link',
      name: 'Magic Link',
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      // This provider will be used for CLIENT role users via magic link
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.clientId = user.clientId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.clientId = token.clientId;
      }
      return session;
    },
    async authorized() {
      // Return true for all - we handle authorization in middleware
      return true;
    },
  },
});
