"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

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
    <AuthShell>
      <p className="mb-6 text-[13px] text-muted">
        marketingdept-llc.com のGoogleアカウントでログインしてください
      </p>
      <Button variant="primary" className="w-full justify-center" onClick={handleLogin} disabled={loading}>
        {loading ? "リダイレクト中…" : "Googleでログイン"}
      </Button>
    </AuthShell>
  );
}
