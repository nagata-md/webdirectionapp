"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySharePassword } from "@/lib/share/password";
import { sharePasswordCookieName, sharePasswordCookieValue } from "@/lib/share/passwordCookie";

export async function verifyShareLinkPassword(formData: FormData) {
  const token = String(formData.get("token"));
  const password = String(formData.get("password") ?? "");

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("share_links")
    .select("password_hash")
    .eq("token", token)
    .maybeSingle();

  if (!link?.password_hash || !verifySharePassword(password, link.password_hash)) {
    redirect(`/share/${token}?error=1`);
  }

  const cookieStore = await cookies();
  cookieStore.set(sharePasswordCookieName(token), sharePasswordCookieValue(token), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
    path: `/share/${token}`,
  });

  redirect(`/share/${token}`);
}
