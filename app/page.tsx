import { redirect } from "next/navigation";

export default function RootPage() {
  // TODO(Phase 3): ログイン済みなら /projects へ、未ログインなら /login へ出し分ける
  redirect("/login");
}
