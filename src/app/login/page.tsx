"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.endsWith(".edu")) {
      setMessage("Only .edu email addresses are allowed");
      return;
    }

    setMessage("Sending login link...");

    await signIn("email", {
      email,
      callbackUrl: "/",
      redirect: false,
    });

    setMessage("Check your email for a login link!");
  };

  const handleSkipAuth = () => {
    router.push("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Login to EduChat</h1>
        <p className="text-center text-gray-600">
          Enter your .edu email to get started
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="your.name@university.edu"
            />
          </div>

          {message && (
            <div className="text-sm text-center font-medium text-indigo-600">
              {message}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Send login link
            </button>
            {process.env.NODE_ENV === "development" && (
              <button
                type="button"
                onClick={handleSkipAuth}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Skip Auth (Dev)
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
