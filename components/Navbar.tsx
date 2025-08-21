"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-gray-100 shadow">
      <h1 className="text-xl font-bold">Finance App</h1>
      {session ? (
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Sign Out
        </button>
      ) : (
        <button
          onClick={() => signIn()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Sign In
        </button>
      )}
    </nav>
  );
}
