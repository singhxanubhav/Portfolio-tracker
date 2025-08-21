"use client";

import { signOut } from "next-auth/react";

export default function Header({ email }: { email: string | null | undefined }) {
  return (
    <header className="flex justify-between items-center px-6 py-4 bg-white shadow-md rounded-lg mb-8">
      {/* Left side - Logo/Title */}
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        📊 <span>Finance Dashboard</span>
      </h1>

      {/* Right side - User info + Logout */}
      <div className="flex items-center gap-6">
        <span className="text-gray-600 text-sm">{email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
