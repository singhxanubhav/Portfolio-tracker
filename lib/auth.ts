import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Called whenever a user signs in
    async signIn({ user }) {
      await prisma.user.upsert({
        where: { email: user.email! },
        update: { name: user.name },
        create: {
          email: user.email!,
          name: user.name,
        },
      });
      return true;
    },

    // Called whenever a JWT token is created/updated
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        token.id = dbUser?.id ?? undefined; // ✅ Fixed: use undefined instead of null
      }
      return token;
    },

    // Called whenever a session is checked/created
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string; // safe because token.id is string | undefined
      }
      return session;
    },
  },
};
