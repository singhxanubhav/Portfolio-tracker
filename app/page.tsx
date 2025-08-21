"use client";

import { signIn } from "next-auth/react";

export default function Home() {
  return (
    <main className="grid h-screen w-screen place-items-center bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Take Control of Your Finances
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Track expenses, set budgets, and achieve your savings goals.
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
        >
          Get Started
        </button>
      </div>
    </main>
  );
}
