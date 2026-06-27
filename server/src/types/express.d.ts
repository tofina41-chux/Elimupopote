import { Role } from "@prisma/client";

// Augments Express's Request type so every controller gets typed access to
// `req.user` after the `authenticate` middleware has run.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;          // local User.id (not the Supabase auth id)
        authUserId: string;  // Supabase auth.users.id
        tenantId: string | null;
        role: Role;
        phone: string;
      };
    }
  }
}

export {};
