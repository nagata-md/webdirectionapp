"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <>
      <p className="mb-6 text-[13px] text-muted">
        marketingdept-llc.com のGoogleアカウントでログインしてください
      </p>
      {error === "domain" && (
        <p className="mb-4 rounded-control bg-danger-tint px-3 py-2 text-[13px] text-danger">
          marketingdept-llc.com 以外のアカウントではログインできません
        </p>
      )}
      <Button
        variant="primary"
        className="w-full justify-center"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "リダイレクト中…" : "Googleでログイン"}
      </Button>
    </>
  );
}
