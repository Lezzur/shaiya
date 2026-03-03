import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days (for "remember me")
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [], // Providers added in auth.ts (not edge-compatible)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.clientId = user.clientId;
        token.rememberMe = user.rememberMe ?? false;
      }
      // Short-lived session (24h) if "Remember Me" was not checked
      if (!token.rememberMe) {
        const oneDayFromNow = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        token.exp = oneDayFromNow;
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
} satisfies NextAuthConfig;
