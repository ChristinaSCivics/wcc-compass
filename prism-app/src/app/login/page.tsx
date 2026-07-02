"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PrismMark } from "@/components/PrismMark";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();

    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: name } },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email or password doesn't match — or switch to \"First time here\" to create your account."
          : error.message
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center horizon px-6">
      <PrismMark size={48} />
      <h1 className="mt-6 text-3xl">Enter the Compass</h1>

      <div className="mt-8 flex gap-1 rounded-full border border-borderline p-1 text-sm">
        <button
          onClick={() => setMode("signin")}
          className={`px-5 py-1.5 rounded-full transition-all ${
            mode === "signin" ? "bg-gold text-background" : "text-muted hover:text-foreground"
          }`}
        >
          Returning
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`px-5 py-1.5 rounded-full transition-all ${
            mode === "signup" ? "bg-gold text-background" : "text-muted hover:text-foreground"
          }`}
        >
          First time here
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 w-full max-w-sm flex flex-col gap-3 fade-up">
        {mode === "signup" && (
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="bg-surface border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-gold transition-colors"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="bg-surface border border-borderline rounded-lg px-4 py-3
                     focus:outline-none focus:border-gold transition-colors"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Choose a password (8+ characters)" : "Password"}
          className="bg-surface border border-borderline rounded-lg px-4 py-3
                     focus:outline-none focus:border-gold transition-colors"
        />
        <button
          type="submit"
          disabled={busy}
          className="border border-gold text-gold rounded-lg py-3
                     hover:bg-gold hover:text-background transition-all disabled:opacity-40"
        >
          {busy ? "One moment…" : mode === "signup" ? "Create my account" : "Sign in"}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <p className="text-xs text-muted mt-2 text-center">
          Founding-circle prototype — forgot your password? Ask Christina to reset it.
        </p>
      </form>
    </main>
  );
}
