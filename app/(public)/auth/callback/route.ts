import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase Auth（Google OAuth）のコールバック。
// ドメイン制限（marketingdept-llc.com）の検証はPhase 3で追加する。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/projects";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
