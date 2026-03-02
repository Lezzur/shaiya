import { UserRole } from '@/generated/prisma';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    role: UserRole;
    clientId: string | null;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      clientId: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    clientId: string | null;
  }
}
