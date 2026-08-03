# 制作進行オートメーター — masterplan.md

> `spec.md`（v1）に対する実装計画。**何を・どの順で・どう作るか**を定義する。
> 仕様の記述を正とし、本書は「実装の地図」として spec を分解・補完する。
> 記法: ⚠️ = 着手前に人間判断が要る箇所 / ✅ = spec で確定済み / 📌 = 受け入れ基準に直結。

---

## 実装状況（2026-08-01）

Phase 0・Phase 1に着手し、以下まで完了。

- Next.js 16（App Router）+ TypeScript + Tailwind CSS v4でプロジェクトを作成（`create-next-app`。npmパッケージ名の制約上、内部的なpackage名は`seisaku-shinko-automator`）。
- **Next.js 16の破壊的変更を確認済み**：`middleware.ts`は`proxy.ts`に改名（本プロジェクトも`proxy.ts`で実装）、Tailwind v4はCSS-firstコンフィグのため`tailwind.config.ts`は使わず`app/globals.css`の`@theme`ブロックでトークンを定義、`cookies()`等は完全非同期化。
- `@supabase/supabase-js` / `@supabase/ssr`を導入。`lib/supabase/client.ts`（ブラウザ用）・`server.ts`（Server Component用、`server-only`でガード）・`admin.ts`（Service Role用、`server-only`でガード）・`middleware.ts`（セッション更新ヘルパー）を実装。
- `proxy.ts`：未ログインで保護ルートにアクセスすると`/login`へリダイレクトする最適化チェックを実装（厳密なドメイン制限はPhase 3で追加）。
- ログイン画面（`/login`）・Google OAuthコールバック（`/auth/callback`）・サインアウト（`/auth/signout`）を実装。実際のSupabaseプロジェクト・Google OAuthクライアントの接続はまだ（プレースホルダーの環境変数でのローカル動作確認のみ）。
- `DESIGN_SYSTEM.md`のトーンを`app/globals.css`の`@theme`に移植（navy/accent/グレースケール/danger/角丸/シャドウ）。フォントは`next/font/google`でNoto Sans JP・Archivoを設定。
- 共通コンポーネント：`Button`・`Panel`・`SectionLabel`・`PageHeader`・`Sidebar`・`AppShell`（モバイル768px以下でハンバーガー変形）・`AuthShell`を実装。
- ヘッドレスChromeでログイン画面・デザインプレビュー（デスクトップ幅）のスクリーンショットを確認し、配色・レイアウトが意図通りであることを確認済み。**モバイル幅でのハンバーガーボタンの見た目は、この環境のヘッドレスChromeが不安定でスクリーンショットでは確認できなかった**（生成HTMLのマークアップ自体は正しいことをcurlで確認済み。サーバー情報管理アプリのmasterplanでも同種の環境起因の問題が記録されている）。実ブラウザでの確認は未実施。

**2026-08-01 追記：git/GitHub/Supabase接続まで完了**

- ローカルでgit初期化・初回コミット済み。GitHubリポジトリ（`https://github.com/nagata-md/webdirectionapp.git`）を作成し`main`をpush済み。
- Vercel側：プロジェクトのImport（GitHub連携）は依頼済みだが、**環境変数（`NEXT_PUBLIC_SUPABASE_URL`等）の登録はまだ完了していない**。次回セッションの最初のタスクとする。
- Supabase側：新規プロジェクト（`https://dslihwmypnxihyzbwjyq.supabase.co`）を作成し、URL・publishable key・secret keyを`.env.local`に設定済み（Git管理外）。Google Cloud Console既存OAuthクライアントに、SupabaseのコールバックURL（`https://dslihwmypnxihyzbwjyq.supabase.co/auth/v1/callback`）を承認済みリダイレクトURIとして追加し、Supabase Authentication側でGoogleプロバイダーを有効化（Client ID/Secretを設定）。
- **実機での疎通確認済み**：ローカル(`npm run dev`)で`/login`→「Googleでログイン」→Google認証→`/auth/callback`→`/projects`（プレースホルダー画面）への一連のログインフローが実際に成功したことをユーザー本人が確認。
- ⚠️ **重要な未実装事項**：現時点では`marketingdept-llc.com`以外のGoogleアカウントでもログインできてしまう状態（ドメイン制限はPhase 3で実装予定のまま）。本番運用前に必ずPhase 3で対応すること。

**2026-08-03 追記：spec.mdに見積もり追加項目を追加、Phase 2（データ層）完了**

- spec.md §4.7に「追加項目」（素材費・値引き等の手入力行、`label`+`amount`の正負自由入力）を追加。表示順は**①ディレクション費→②ページ別コスト→③追加項目**で画面・CSV・PDFとも統一することを確定（spec §4.7・§4.11・§6）。新規テーブル`estimate_line_items`を追加。
- **Supabase CLIの認証**：この環境では`supabase login`のブラウザ自動フローが使えない（非TTY）ため、Personal Access Tokenで`supabase login --token ...`を実行して認証した。**このトークンは会話ログに残っているため、作業完了後に失効（Revoke）すること**（ユーザー未対応であれば次回冒頭で確認）。
- `supabase link --project-ref dslihwmypnxihyzbwjyq`でプロジェクトをリンクし、`supabase/migrations/`に2本のマイグレーションを作成・適用した。
  - `20260803015113_initial_schema.sql`：spec §6準拠の全11テーブル（`master`/`projects`/`project_owners`/`project_links`/`progress_groups`/`pages`/`estimate_line_items`/`schedule_overrides`/`ai_meta_generation_logs`/`estimate_versions`/`share_links`）、インデックス、`updated_at`自動更新トリガー、`is_team_member()`ヘルパー、全テーブルのRLS（`marketingdept-llc.com`ドメインの認証済みユーザーのみ読み書き可）、`authenticated`ロールへのテーブル権限付与。
  - `20260803015206_storage_buckets.sql`：Storageバケット`estimate-pdfs`・`stamps`（いずれも非公開）と、チームメンバーのみアクセス可能なRLSポリシー。
  - **`master.ai_api_key`の列単位アクセス制御（重要・DB層で実装済み）**：`revoke select (ai_api_key) on public.master from authenticated`により、`authenticated`ロールでの`select('*')`は`ai_api_key`列を含むため失敗する設計にした（RLSの行単位制御に加えた多層防御）。`service_role`には明示的に`select`を許可済み。
  - `master`テーブルはユニークインデックス（定数式）でシングルトン制約を実装。2件目の作成が`409 duplicate key`で拒否されることを確認済み。
  - `supabase db push --include-seed`で`supabase/seed.sql`（マスタの初期1行）を投入し、サービスロールキーで実際にレコードが取得できることを確認済み。
  - anon（未ログイン）キーでの`projects`/`master`取得はRLSにより空配列が返ることを確認済み（データは一切漏れない）。
  - ⚠️ **未検証**：`authenticated`ロールでの`select('*')`が実際に`ai_api_key`列で失敗すること自体は、実ログインセッションでのテストが必要でまだ未実施（Phase 4のマスタ設定画面実装時に実ブラウザで確認する）。

### 次回セッションの開始点

1. ~~Vercel環境変数の設定~~ → 完了（Production環境に`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`を登録済み。Preview/Developmentへの追加は現状の運用では不要と判断し保留）。
2. Supabase Personal Access Tokenの失効：未確認。次回冒頭で確認する。
3. ~~Phase 3（認証・セッション管理）のドメイン制限~~ → 完了（下記参照）。

**2026-08-03 追記：Phase 3（ドメイン制限）完了**

- `lib/auth/domainGuard.ts`：`requireTeamMember()`を実装。未ログインなら`/login`へ、`marketingdept-llc.com`以外のメールドメインならSupabaseセッションをサインアウトした上で`/login?error=domain`へリダイレクトする。
- `app/(app)/layout.tsx`のTODOコメントをこの関数呼び出しに置き換え。
- ログイン画面にエラーバナー表示を追加（`LoginForm.tsx`を分離し`useSearchParams`で`?error=domain`を検知。Next.js推奨に従い`Suspense`でラップ）。
- **設計判断**：proxy.ts（旧middleware）側にも同じドメインチェックを追加しかけたが、サインアウト時のクッキー引き渡しが複雑になり`requireTeamMember()`とロジックが重複するため撤回。Next.js公式ドキュメントが「Proxyは厳密な認可判定に使うべきではない」としている通り、proxy.tsは「ログイン有無」のみの簡易チェックに留め、ドメイン制限の正式な判定と セッションのサインアウトは`requireTeamMember()`に一本化した。
- ローカルで`/login?error=domain`のエラーバナー表示、未ログイン時の`/projects`→`/login`リダイレクト（307）を確認済み。**実際の他ドメインGoogleアカウントでのサインアウト動作は未検証**（テスト用の他ドメインアカウントがなかったため）。Phase 4以降の実利用の中で気づいたら報告してほしい。

**2026-08-03 追記：Phase 4（マスタ設定）完了**

- `lib/master/constants.ts`：複雑度(S/M/L)・コスト工程（ワイヤー/コピー/デザイン/コーディング/テストアップ/公開）・スケジュール工程（構成/デザイン/コーディング/テストアップ/公開）の定数・型を定義。DBのCHECK制約と同じ日本語ラベルをjsonbキーにもそのまま使い、変換テーブルを持たない設計にした。
- `lib/crypto.ts`：AES-256-GCMで`ai_api_key`を暗号化/復号。
- `lib/master/data.ts`：`getMasterSettings()`（`ai_api_key`を含まない列だけを明示的に指定してSELECT）、`getAiKeyStatus()`（Service Role経由でのみ復号し、`{configured, masked}`という安全な形にしてから返す。生の値・復号値は関数の外に一切出ない）。
- `app/(app)/master/`：Server Actions（`actions.ts`）5本（スケジュール系マスタ／休日・定休日／ディレクション費・税率／発行元情報＋角印画像アップロード／AI設定）と、それらを使うフォーム主体の`page.tsx`、動的な休日リスト用のクライアントコンポーネント`HolidaysEditor.tsx`を実装。
- 更新系アクションはいずれも`.update().select()`をチェーンしていない（`return=minimal`）ため、`ai_api_key`列のSELECT禁止に抵触せず動作することを確認。
- サービスロールで実際のjsonb形状（日本語キー）を投入・確認後、元のシード状態にリセット。
- **実ブラウザでの動作確認済み**（ユーザー本人によるテスト）：単価表・標準待機日数・並行作業人数・休日カレンダー・定休日・ディレクション費/税率・発行元情報＋角印画像アップロード・AI APIキーのマスク表示、いずれも保存→リロードで値が保持されることを確認。
- **バグ修正**：単価入力の`step`属性が`1000`固定になっており、7500円のような1000円単位でない金額がHTML5のネイティブバリデーションで弾かれる不具合を発見。`step="1"`に修正。

**2026-08-03 追記：Phase 5（プロジェクト管理・基本情報）完了**

- `app/(app)/projects/actions.ts`：`createProject`／`deleteProject`（プロジェクトが1件のみの場合は削除不可のバリデーションをサーバー側でも実施）／`updateProjectBasicInfo`／`saveOwners`／`saveProjectLinks`（`category`で`server`/`figma`を判定）を実装。
- `app/(app)/projects/page.tsx`：プロジェクト一覧・新規作成フォーム。プロジェクトが1件の場合は削除ボタンを`disabled`にしてUIレベルでも防止。
- `app/(app)/projects/[projectId]/page.tsx`：基本情報（クライアント名・プロジェクト名・着手日）編集フォーム、`OwnersEditor`（自社担当者）・`ProjectLinksEditor`（サーバー情報リンク／Figmaリンク、同一コンポーネントを`category`違いで2回利用）を配置。
- **バグ修正・重要**：実ブラウザテストで「自社担当者・リンクの追加→保存→リロードで消える」不具合が発覚。原因は2つ複合していた。
  1. 動的リスト入力欄でEnterキーを押すと、フォーム内の`type="submit"`ボタンが暗黙的に発火し、「+追加」を押す前の空の状態のまま送信されていた。
  2. Enterキー対策として`preventDefault`+追加処理を入れたところ、**日本語IME変換確定のEnter（`isComposing`中）まで誤って追加処理を発火してしまい**、変換途中の文字列（例: 苗字だけ）で追加されてしまう新たな不具合を発生させた。`lib/ui/onEnterKey.ts`という共通ヘルパーを作り、`e.nativeEvent.isComposing`を見て変換確定中のEnterは無視するように修正。3コンポーネント（`HolidaysEditor`／`OwnersEditor`／`ProjectLinksEditor`）に適用。
- **UX改善（ユーザー要望、Phase 4にも遡って適用）**：保存の成否が画面上わかりにくいという指摘を受け、`components/ui/SavedBanner.tsx`を新設。保存系Server Actionはすべて処理後に`redirect("<path>?saved=1")`する方式に統一し、バナーが「✓ 保存しました」を数秒表示してからURLの`?saved=1`を消す。Phase 4（マスタ設定）の5アクションもこの方式に統一済み。
- 実データで最終確認：プロジェクト2件、自社担当者4件、サーバー/Figmaリンク各1件が正しく保存されていることをサービスロール経由で確認。

**2026-08-03 追記：Phase 6（ディレクトリマップ・進行グループ管理）完了**

- プロジェクト詳細画面をタブ構成に変更：`components/layout/ProjectTabs.tsx`（`usePathname`でアクティブタブ判定）＋`app/(app)/projects/[projectId]/layout.tsx`（プロジェクト名のPageHeader・タブ・SavedBannerを共通化。既存の基本情報`page.tsx`からは重複していたPageHeader/SavedBannerを削除）。今後スケジュール／見積もり／メタ情報／共有リンクのタブもここに追加していく。
- `lib/pages/constants.ts`：ページ種別（TOP/下層/LP/ブログ/その他）の表示ラベル変換、`isDescendant()`（親ページ選択時の循環参照防止：自分自身・自分の子孫を親にできないようチェック）。
- `app/(app)/projects/[projectId]/directory-map/`：`actions.ts`（`createPage`/`updatePage`/`deletePage`/`saveGroups`）、`GroupsEditor.tsx`（進行グループの追加・削除・↑↓並び替え）、`PageForm.tsx`（新規ページ追加）、`PageRow.tsx`（表示⇄インライン編集切り替え、子ページを再帰的にレンダリング）、`page.tsx`。
- **設計判断**：進行グループは`pages.group_id`から参照されるFKのため、`saveOwners`/`saveProjectLinks`のような「全削除→再作成」方式は使えない（IDが変わり紐付けが壊れる）。`saveGroups`は既存IDの有無で更新/新規作成を振り分け、送信されなかった既存IDのみ削除するdiff方式にした。
- ページの親削除時は`ON DELETE SET NULL`（migration側で設定済み）により子ページは消えず、親なし＝トップレベル扱いになる（削除しても子を巻き込まない設計を実データで確認）。
- 実ブラウザでの動作確認済み（ユーザー本人）：進行グループの追加・並び替え・保存後の保持、ページ追加・親子階層のツリー表示、編集での進行グループ割当・バッジ反映、削除確認ダイアログ、親削除時に子がトップレベルに残ることを確認。
- Enterキー誤送信対策（`onEnterKey`）・保存フィードバック（`SavedBanner`）を新規コンポーネント（`GroupsEditor`）にも最初から適用。

### 次回セッションの開始点

1. Supabase Personal Access Tokenが失効済みか確認する（未確認のまま）。
2. **Phase 7（スケジュール自動生成ロジック・コアエンジン）**に進む：営業日計算（JST）・進行グループ逐次起点計算・工程別レーン割当ロジック（spec §4.3・4.5・4.6、本アプリの中核かつ最複雑）。着手前にspec該当箇所を読み合わせること（masterplan §6参照）。
3. 動的リスト系の新規UIを作る際は`lib/ui/onEnterKey.ts`（IME対応済み）と`components/ui/SavedBanner.tsx`（保存フィードバック）を最初から使うこと。
4. 進行グループのように他テーブルからFK参照される可能性がある一覧編集を作る際は、`saveGroups`のdiff方式（全削除→再作成にしない）を踏襲すること。

以降、各フェーズ完了ごとに本セクションへ実績・発見事項・バグ修正を追記していく（`サーバー情報管理アプリ_masterplan.md`と同様の運用）。

---

## 0. 前提と現状

- ✅ 確定済みコア技術：**Next.js（App Router）+ TypeScript**、**Supabase**（Postgres + Auth + Storage + RLS）、**Vercel**、**Tailwind CSS**、**Claude API（Anthropic）**、**`@react-pdf/renderer`**（spec §7）。
- ✅ 参照ドキュメント：`spec.md`（本書の元仕様、v1）、`要件定義書_制作進行オートメーター.md`（背景）、`DESIGN_SYSTEM.md`（見た目の基準・Tailwindへ移植して踏襲、spec §12）。
- ✅ 認証：Supabase Auth の Google OAuth。ログイン後、メールドメインが `marketingdept-llc.com` であることをサーバーサイドで検証（spec §2・§7）。

### 着手前に確定が必要な事項（spec §10 の ⚠️）→ 現時点の状態

| # | 事項 | 状態 |
|---|---|---|
| D1 | テストアップ・公開のページ単位要否フラグの要否 | 未解決。v1では未実装のまま進める。必要になった時点で追加要件として起票し、該当フェーズ（Phase 6・9）に差し込む |
| D2 | 共有URLの有効期限デフォルト値・パスワード必須化の是非 | 未解決。90日・パスワード任意で仮実装し（Phase 11）、リリース前に確定する |
| D3 | Claude API利用コストの妥当性 | 未解決。Phase 10実装後、実際のプロンプト量・想定ページ数で実測する |
| D4 | 想定同時利用人数・データ量の上限目安 | 未解決。Phase 2着手前にヒアリングして確定することが望ましいが、致命的なブロッカーではないため並行して進めてよい |

> D1〜D4は未解決のまま実装を開始する。spec §10と同期を取り、確定次第この表を更新する。

---

## 1. アーキテクチャ全体像

```
app/
├─ (public)/                        -- 未ログインでアクセス可能なルートグループ
│  ├─ login/page.tsx                -- ログイン画面
│  ├─ auth/callback/route.ts        -- Supabase OAuthコールバック（ドメイン検証含む）
│  └─ share/[token]/page.tsx         -- 外部共有閲覧画面（spec §4.10）
├─ (app)/                           -- 要ログイン（proxy.tsでガード。Next.js 16でmiddlewareはproxyに改名）
│  ├─ layout.tsx                    -- サイドバー＋メインのレイアウトシェル（spec §12）
│  ├─ projects/
│  │  ├─ page.tsx                   -- プロジェクト選択・作成・切替・削除
│  │  └─ [projectId]/
│  │     ├─ layout.tsx              -- プロジェクト内共通ナビ
│  │     ├─ page.tsx                -- 基本情報（担当者・サーバーリンク・Figmaリンク）
│  │     ├─ directory-map/page.tsx  -- ディレクトリマップ・進行グループ（spec §4.2・4.3）
│  │     ├─ schedule/page.tsx       -- ガントチャート（spec §4.6）
│  │     ├─ estimate/page.tsx       -- 見積もり・PDF発行・バージョン一覧（spec §4.7・4.11）
│  │     ├─ meta/page.tsx           -- メタ情報・AI一括生成（spec §4.8・4.9）
│  │     └─ shares/page.tsx         -- 共有リンク管理（spec §4.10）
│  └─ master/page.tsx               -- マスタ設定（spec §4.4）
├─ api/
│  ├─ schedule/recalculate/route.ts
│  ├─ estimate/issue-pdf/route.ts   -- 「確定してPDF発行」（spec §4.11）
│  ├─ meta/ai-generate/route.ts     -- AIメタ情報一括生成（spec §4.9）
│  ├─ share/[token]/verify/route.ts -- パスワード照合・セクション別データ返却
│  └─ master/rate-change-impact/route.ts -- ライブ共有への影響件数チェック（spec §4.10）
components/
├─ layout/ (Sidebar, AppShell, AuthShell, PageHeader)
├─ ui/ (Button, Panel, FilterBar, Tag, FieldList, Table, FormRow)
├─ directory-map/ (Tree, GroupBadge)
├─ schedule/ (GanttChart, PhaseBar, CascadeDialog, GroupCascadeDialog)
├─ estimate/ (EstimateTable, VersionList)
└─ meta/ (MetaEditor, AiGeneratePanel, GenerationPreviewTable)
proxy.ts                            -- 認証ガード（Next.js 16、旧middleware.ts相当）
lib/
├─ supabase/ (client.ts, server.ts, middleware.ts)
├─ schedule/ (businessDay.ts, groupSequencer.ts, laneAllocator.ts)
├─ estimate/ (calculate.ts, pdfTemplate.tsx, quoteNumber.ts)
├─ ai/ (claudeClient.ts, metaPrompt.ts)
├─ crypto.ts                        -- ai_api_key の暗号化/復号（AES-256-GCM）
└─ auth/ (domainGuard.ts)
supabase/
├─ migrations/*.sql                 -- spec §6 準拠の全テーブル・RLS
└─ seed.sql                         -- 開発用ダミーデータ
```

### データフローの要点

- **一覧・詳細表示**：Next.jsのサーバーコンポーネントでSupabaseから直接取得。クライアントコンポーネントは編集操作（フォーム送信・ドラッグ編集）に限定。
- **スケジュール計算**：`lib/schedule/`配下で完結させ、UIからは計算結果（`computed_*`）とオーバーライド（`schedule_overrides`）をマージした表示用データのみを受け取る。
- **AI一括生成**：クライアント→`api/meta/ai-generate`→サーバーサイドで`master.ai_api_key`を復号しClaude APIへ→構造化JSONを受け取りクライアントへプレビュー返却→ユーザー確認後に別リクエストで`pages`へ反映。
- **PDF発行**：クライアント→`api/estimate/issue-pdf`→サーバーサイドで現在の計算結果を凍結し`estimate_versions`に保存→`@react-pdf/renderer`でPDF生成→Supabase Storage（非公開バケット）へアップロード→`pdf_url`を記録。
- **外部共有閲覧**：`share/[token]`→パスワード入力→`api/share/[token]/verify`（Service Role経由）でトークン・パスワードを照合→`include_sections`と`mode`に応じたデータのみ返却（`estimateVersion`モードなら`estimate_versions.estimate_data`、それ以外のセクションは常に最新データ）。

---

## 2. 実装フェーズ（順序付き）

各フェーズは独立検証可能な単位。先頭ほど他に依存される基盤。

### Phase 0 — 基盤セットアップ
**ゴール**：ログイン画面にアクセスすると、Supabase接続済みの最小Next.jsアプリが表示される。
1. Next.js（App Router）+ TypeScriptでプロジェクトを作成し、Vercelへのデプロイパイプラインを接続する。
2. Supabaseプロジェクトを作成。環境変数（URL・anon key・service role key）をVercel／ローカル`.env`に設定する（service role keyはサーバーサイドのみで使用し、クライアントバンドルに含めない）。
3. `lib/supabase/client.ts`（ブラウザ用）・`lib/supabase/server.ts`（サーバー用、Service Role含む）を分離して用意する。
4. Google Cloud ConsoleでOAuthクライアントを発行し、Supabase AuthのGoogleプロバイダに設定。リダイレクトURIをローカル・本番の両方に登録する。
5. Tailwind CSSを導入する（詳細なトークン移植はPhase 1）。
**完了条件**：`/login`からGoogleログインへ遷移でき、コールバック後にSupabaseセッションが確立する（ドメイン制限は未実装で可、Phase 3で対応）。

### Phase 1 — デザインシステム移植
**ゴール**：`DESIGN_SYSTEM.md`と同じトーン（配色・サイドバー構成・情報密度・角丸/シャドウ）の共通レイアウトがTailwind/Reactで再現される（spec §12）。
1. 本プロジェクトのTailwindはv4（CSS-firstコンフィグ）のため`tailwind.config.ts`は使わず、`app/globals.css`の`@theme`ブロックに`DESIGN_SYSTEM.md`§1〜§3のカラー・角丸・シャドウをCSS変数として移植する（`navy`/`accent`は本ツール用に変更可、グレースケール・dangerは共通、spec §12）。
2. フォント（Noto Sans JP / Archivo）を`next/font`で設定する。
3. 共通レイアウトコンポーネント：`Sidebar`・`AppShell`（モバイル768px以下でハンバーガー変形、`DESIGN_SYSTEM.md`§4.1）。
4. 汎用UIコンポーネント：`Button`・`Panel`・`PageHeader`・`FilterBar`・`Tag`・`FieldList`・`Table`（`table-scroll`ラッパー含む）を`DESIGN_SYSTEM.md`§5相当でReact化する。
5. ログイン画面用の`AuthShell`（中央カード、サイドバーなし）。
**完了条件**：空のページでも`DESIGN_SYSTEM.md`のトーンで表示される。ヘッドレスブラウザでPC幅(1280px)・タブレット幅・スマホ幅(390px)のスクリーンショットを確認し、崩れがないことを確認する。📌 受け入れ基準 §12。

### Phase 2 — データ層（Supabase / Postgres）
**ゴール**：spec §6準拠の全テーブルが作成され、RLSポリシーが機能する。
1. `supabase/migrations/`にマイグレーションSQLを作成：`master` / `projects` / `project_owners` / `project_links` / `progress_groups` / `pages` / `estimate_line_items` / `schedule_overrides` / `estimate_versions` / `share_links` / `ai_meta_generation_logs`（spec §6）。
2. インデックス：`pages(project_id)` / `pages(parent_id)` / `pages(group_id)` / `project_links(project_id, category)` / `estimate_line_items(project_id)` / `schedule_overrides(page_id, phase_key)` / `estimate_versions(project_id)` / `share_links(token)` unique / `share_links(project_id)`。
3. RLSポリシー：チーム共有テーブルは認証済みかつメールドメインが`marketingdept-llc.com`のユーザーのみ読み書き可（spec §6）。`share_links`はチームメンバーのみ読み書き可、共有閲覧はService Role経由のサーバー処理に閉じ、クライアントから直接テーブルを読ませない。
4. **`master`テーブルへのSELECTは`ai_api_key`列を含まないこと**を保証する構成にする（明示列挙のクエリ、または`ai_api_key`を除外したビュー`master_public`）。`select('*')`を使う実装を全面的に禁止する（spec §6・§8、重要）。
5. Supabase Storageバケット：`estimate-pdfs`（非公開）・`stamps`（非公開）を作成し、署名付きURLのみでアクセス可能にする。
6. 開発用シードデータ（マスタ1件、プロジェクト数件、ページ・進行グループ）投入スクリプトを用意する。
**完了条件**：マイグレーションがローカル/本番Supabaseに適用される。非チームメンバー・未ログインでのテーブル直接アクセスが拒否される。`ai_api_key`がクライアントから取得不能であることを確認する。

### Phase 3 — 認証・セッション管理
**ゴール**：📌 `marketingdept-llc.com`ドメインのGoogleアカウントのみログインでき、他ドメインは拒否される。
1. Supabase AuthのGoogle OAuthコールバック処理（`app/(public)/auth/callback/route.ts`）。
2. ログイン成功後、`proxy.ts`（Next.js 16、旧middleware）または各保護ルートのサーバーコンポーネントで、セッションユーザーの`email`ドメインを検証する。不一致なら強制サインアウト＋ログイン画面へリダイレクト＋エラーメッセージを表示する。
3. 保護ルートグループ`(app)/`全体を`proxy.ts`でガードする（未ログイン時は`/login`へ）。
4. ログアウト処理。
**完了条件**：許可ドメインはログイン後プロジェクト選択画面に到達し、非許可ドメインは拒否されメッセージが表示される。📌 spec §11。

### Phase 4 — マスタ設定
**ゴール**：📌 チーム共有の単価・工数・休日・AI連携・発行元情報を管理でき、APIキーが安全に扱われる。
1. `app/(app)/master/page.tsx`：単価・工数マスタ（複雑度×コスト工程のグリッド編集）、標準待機日数、休日カレンダー（追加/削除）、定休日、月額ディレクション費、工程別並行作業人数デフォルト、消費税率のCRUD UI（spec §4.4）。
2. 発行元情報セクション：会社名・住所・電話番号・角印画像（Supabase Storage `stamps`バケットへアップロード、spec §4.11）。
3. AI連携設定セクション：Claude APIキー入力欄（保存時のみ暗号化して`ai_api_key`に格納。画面には常にマスク表示「設定済み（下4桁）」／「未設定」とし、**生の値を返すSELECTを絶対に書かない**、spec §6・§8）、使用モデル名。
4. `lib/crypto.ts`：APIキーの暗号化/復号（Node.jsの`crypto`、AES-256-GCM）。復号は`api/meta/ai-generate`等サーバーサイドの処理からのみ呼び出す。
**完了条件**：マスタ設定が保存・反映される。マスタ設定画面のネットワークレスポンス（開発者ツールで確認）に`ai_api_key`の生の値が一切含まれないことを確認する。

### Phase 5 — プロジェクト管理・基本情報
**ゴール**：プロジェクトの作成・切替・削除・基本情報編集ができる（spec §4.1）。
1. `app/(app)/projects/page.tsx`：プロジェクト一覧・新規作成・切替・削除（最後の1件は削除不可バリデーション）。
2. プロジェクト詳細（基本情報）：クライアント名・プロジェクト名（必須）・着手日・自社担当者（役割別複数、`project_owners`）。
3. サーバー情報リンク／Figmaリンクセクション：`project_links`のCRUD（`category`で表示を分岐、ラベル＋URL、複数登録・並び替え、spec §4.1）。
**完了条件**：プロジェクトの作成・切替・削除・基本情報編集が動作し、最後の1件削除がブロックされる。サーバー情報リンク・Figmaリンクをそれぞれ複数登録できる。📌 spec §11。

### Phase 6 — ディレクトリマップ・進行グループ管理
**ゴール**：ページの追加・編集・削除・親子階層・進行グループ設定・ツリー表示が動作する（spec §4.2・4.3）。
1. `pages`のCRUD（ページ名・種別・複雑度・親ページ・ワイヤー/コピー要否・個別費用・優先度）。
2. ツリー表示コンポーネント（親子階層インデント、ワイヤー/コピー不要・進行グループのバッジ表示）。
3. 進行グループのCRUD（名前・表示順）、ページへの割当UI（未設定ページはデフォルト＝表示順1のグループ扱い、spec §4.3）。
**完了条件**：ページ追加・階層設定・進行グループ割当がツリーに反映される。📌 spec §11。

### Phase 7 — スケジュール自動生成ロジック（コアエンジン）
**ゴール**：📌 営業日ベース・工程別レーン制約・進行グループ逐次計算に基づき、スケジュールが自動生成される。本アプリの中核であり複雑度が最も高いフェーズ。
1. `lib/schedule/businessDay.ts`：休日カレンダー・定休日を考慮した営業日加算/判定。**すべてJSTのdate文字列（`YYYY-MM-DD`）で計算し、タイムゾーン変換を伴う`Date`演算は避ける**（spec §8、重要）。
2. `lib/schedule/groupSequencer.ts`：進行グループを表示順に逐次処理し、各グループの起点日を決定する（グループ1＝プロジェクト開始日、グループ2以降＝前グループの構成完了日の実効値——オーバーライドがあれば`override_end`優先、なければ`computed_end`、spec §4.3）。
3. `lib/schedule/laneAllocator.ts`：ページを優先度順に処理し、スケジュール工程ごとに並行作業レーンへ割り当てる（spec §4.5）。
4. マスタの標準日数・チェックバック・バッファを適用し、各ページ・各工程の`computed_start`/`computed_end`を算出する。`schedule_overrides`が存在する工程区間は計算結果を採用せず、`override_start`/`override_end`をそのまま使う。
**完了条件**：休日・定休日を除いた営業日で日数が積まれる。進行グループ2以降の起点が前グループの構成完了日（実効値）と一致する。単体テストで、休日跨ぎ・年末年始・オーバーライドあり/なしのケースを網羅して確認する。📌 spec §11。

> ⚠️ 進め方の指針：着手前にspec §4.3・§4.5・§4.6のロジックを実装者間で読み合わせ、疑義があれば実装前に人間に確認する（§6参照）。

### Phase 8 — ガントチャート表示・手動編集・オーバーライド
**ゴール**：📌 ガントチャートの手動編集・オーバーライド管理・グループ起点への連鎖が仕様通り動作する（spec §4.6・4.3）。
1. ガントチャートUI（ページ行×時系列、工程別色分け、制作期間/待機期間の区別）。
2. ドラッグ操作／日付入力での手動編集→`schedule_overrides`へ保存（`cascade_following`選択ダイアログ：「後続工程も追従」／「この区間だけ」）。
3. **グループ起点への連鎖**（spec §4.3）：編集対象が構成工程かつ、その変更が所属グループの構成完了日（最大値）を変化させる場合、追加の確認ダイアログ（「次グループ以降の自動計算区間を再計算する」／「このページの区間だけ変更する」）を表示し、選択に応じて後続グループの非オーバーライド区間を再計算する。次グループ以降の既存オーバーライド区間は常に据え置く。
4. リセット操作（ページ単位・工程単位でオーバーライド解除→自動計算に復帰）。
5. 変更履歴ログ（`schedule_overrides`の`edited_by`/`edited_at`を一覧表示する簡易画面）。
**完了条件**：手動編集がオーバーライドとして保持され、マスタ変更後も上書きされない。グループ起点への連鎖ダイアログが仕様通り分岐し、次グループ以降の既存オーバーライドが保護される。📌 spec §11。

### Phase 9 — 見積もり・PDF発行・バージョン管理
**ゴール**：📌 見積もり自動算出・CSVエクスポート・PDF発行・バージョン管理が仕様通り動作する（spec §4.7・4.11）。
1. 見積もり計算（ディレクション費（暦月カウント）＋ページ別コスト＋追加項目＋税抜/税込合計、マスタの消費税率を使用、spec §4.7）。**画面・CSV・PDFとも「①ディレクション費→②ページ別コスト→③追加項目」の表示順で統一する**。
2. `estimate_line_items`のCRUD UI（項目名・金額の手入力行を追加/編集/削除。金額は正負自由入力で、値引きは負の値として入力、spec §4.7）。
3. CSVエクスポート（①→②→③の順、追加項目も内訳に含める）。
4. `lib/estimate/pdfTemplate.tsx`：`@react-pdf/renderer`で見積書テンプレート（見積番号・発行日・有効期限・御中・件名・①ディレクション費→②ページ別内訳→③追加項目の内訳・小計/税/合計・発行元情報＋角印画像、spec §4.11）。
5. 「確定してPDF発行」アクション（`api/estimate/issue-pdf/route.ts`）：押下時点の計算結果（ページ別コスト・ディレクション費・`estimate_line_items`のスナップショットを含む）を`estimate_data`として`estimate_versions`に保存し、`quote_number`を採番（例：`EST-YYYYMMDD-連番`）、`valid_until`をマスタの`estimate_validity_days`から算出、PDFを生成して`estimate-pdfs`バケットへ保存し`pdf_url`に記録する。
6. バージョン一覧UI（見積番号・発行日・有効期限・合計金額・発行者、署名付きURLでの再ダウンロード）。
**完了条件**：発行済み`estimate_versions`がイミュータブルであることを確認する（発行後にマスタ単価・追加項目を変更し、既存バージョンのデータ・PDFが変化しないことをテストする）。📌 spec §11（新規追加項目含む）。

> ⚠️ 進め方の指針：テンプレートのビジュアル（角印配置・レイアウト）は先に簡易モックで確認してから本実装に進めると手戻りが少ない（§6参照）。

### Phase 10 — メタ情報・進行管理 + AIメタ情報一括生成
**ゴール**：📌 メタ情報編集とAI一括生成（Claude API）が仕様通り動作する（spec §4.8・4.9）。
1. メタ情報編集UI（スラッグ・TITLE・ディスクリプション・キーワード・優先度・納品予定日・進捗ステータス、ページと1対1連動）。
2. `lib/ai/claudeClient.ts`：マスタの`ai_api_key`（サーバーサイドで復号）・`ai_model`を使いClaude APIを呼び出す共通クライアント。
3. AI一括生成パネル：指示文入力欄、生成対象スコープ切替（未入力のみ／全ページ上書き、デフォルト未入力のみ）、「生成」ボタン→`api/meta/ai-generate/route.ts`がディレクトリマップの全ページ情報＋指示文を構造化プロンプトとしてClaude APIに送信し、JSON構造化出力（各ページのslug/title/description/keywords）を受け取る。
4. 生成結果のレビュー画面（ページ別の編集可能なプレビュー一覧）→「反映」で`pages`テーブルに保存する。
5. `ai_meta_generation_logs`への記録（指示文・スコープ・件数・実行者・日時）。
**完了条件**：指示文を入力し生成→プレビュー→反映の一連が動作する。「未入力のみ」選択時に既存の手入力値が上書きされないことを確認する。📌 spec §11。

### Phase 11 — 外部共有機能
**ゴール**：📌 共有URL発行・失効・アクセス制御・見積バージョン紐付けが仕様通り動作する（spec §4.10）。
1. 共有リンク作成UI：セクション選択（estimate/directoryMap/schedule/meta）、モード選択（`live`/`estimateVersion`。見積もりセクションを含む場合はデフォルト`estimateVersion`で発行済み`estimate_versions`から選択、未発行なら選択不可＋案内表示。見積もりを含まない場合はデフォルト`live`）、パスワード（任意）、有効期限（デフォルト90日、⚠️D2）。
2. トークン生成（推測不可能なランダム文字列）、`share_links`保存。
3. `app/(public)/share/[token]/page.tsx`：パスワード入力フォーム→Service Role経由でトークン・パスワード照合→選択セクションのみ参照専用表示する。`estimateVersion`モードの見積もりセクションは紐付けられた`estimate_versions.estimate_data`を表示し、ディレクトリマップ・スケジュールは常に最新データを表示する（spec §4.10の混在仕様に注意）。
4. 閲覧ごとに`view_count`・`last_viewed_at`を更新する。
5. 共有管理画面：一覧・状態（有効/失効）・個別失効。
6. **マスタ単価変更時の警告**（spec §4.10）：マスタの単価・工数保存前に、影響を受ける「有効な`live`モード・見積もりセクション含む共有リンク」を検索し、件数・プロジェクト名を確認ダイアログで表示する（`estimateVersion`モードのリンクは対象外）。
**完了条件**：共有URL発行から閲覧・失効までの一連が動作し、マスタ単価変更時の警告が正しい条件（`live`のみ）で表示される。📌 spec §11。

### Phase 12 — 仕上げ・受け入れ確認
**ゴール**：📌 spec §11の受け入れ基準を全項目満たし、v1として完了する。
1. 各画面のCSVエクスポート機能の最終確認。
2. レスポンシブ（タブレット幅）での崩れ確認（PC対応必須、タブレット幅は配慮、spec §8）。
3. タイムゾーン検証：休日跨ぎ・年末年始・UTC変換ズレが起きないことをテストする（spec §8）。
4. セキュリティ確認：`ai_api_key`が画面・APIレスポンスのどこにも生の値で出ないこと、RLSポリシーの棚卸し。
5. spec §11の受け入れ基準を全項目チェックする。
**完了条件**：spec §11の受け入れ基準を全項目満たす。

---

## 3. 受け入れ基準 ↔ フェーズ対応（spec §11）

| 受け入れ基準 | 担当フェーズ |
|---|---|
| Googleアカウント（`marketingdept-llc.com`ドメイン）でログインでき、他ドメインは拒否される | Phase 3 |
| ディレクトリマップでページ追加・親子階層・進行グループ・優先度がツリー表示される | Phase 6 |
| 進行グループの開始条件が§4.3の逐次計算ロジック通りに動作する | Phase 7 |
| スケジュールが営業日ベース・工程別レーン制約に基づき自動生成される | Phase 7 |
| ガントチャート手動編集・オーバーライド不上書き・後続工程追従の選択 | Phase 8 |
| 構成工程のオーバーライドがグループ完了日を変える場合の確認ダイアログ、既存オーバーライドの保護 | Phase 8 |
| 見積もりがページ別コスト・ディレクション費・税抜/税込合計で自動算出、CSVエクスポート | Phase 9 |
| 見積書PDF発行（見積番号・発行日・有効期限・自社情報含む）、過去バージョン再ダウンロード | Phase 9 |
| PDF発行後にマスタ単価を変更しても発行済みPDF・バージョンデータが変わらない | Phase 9 |
| メタ情報・進行管理画面でSEO情報・進捗ステータスを編集できる | Phase 10 |
| AI一括生成で指示文→プレビュー→反映が動作し、未入力のみ選択時に上書きされない | Phase 10 |
| サーバー情報リンク・Figmaリンクを複数・ラベル付きで登録できる | Phase 5 |
| 外部共有URL発行、マスタ非公開、パスワード・有効期限・失効機能、見積もりセクション含む場合はestimateVersionデフォルト | Phase 11 |
| マスタ単価変更時、影響を受ける有効なライブ共有リンクへの警告表示 | Phase 11 |
| マスタ設定画面でAPIキーが常にマスク表示される | Phase 4 |
| 営業日計算がJSTで一貫している | Phase 7 |
| `DESIGN_SYSTEM.md`のトーンに沿ったUIになっている | Phase 1（+全画面） |

---

## 4. v1スコープ境界（念押し）

**作らない**：フォーム自動返信メールの文言管理、実際のワイヤーフレーム・コピー・デザインデータそのものの生成（AI対象はメタ情報のみ）、Figma／WordPress管理画面等との自動連携（リンク登録のみ、APIサムネイル取得等は行わない）、請求書発行・会計連携、権限の細分化（次フェーズ課題）、外部共有閲覧画面からのPDFダウンロード（PDF発行・再DLは社内画面限定）。

**未解決のまま進める（§0のD1〜D4参照）**：テストアップ・公開のページ単位要否フラグ、共有URLの有効期限デフォルト値・パスワード必須化の是非、Claude API利用コストの妥当性、想定同時利用人数・データ量の上限目安。

---

## 5. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| 進行グループの逐次計算ロジックが複雑でバグが混入する | スケジュール全体の日付がずれる | Phase 7で休日跨ぎ・オーバーライドあり/なし・グループ0件時等の境界ケースを単体テストで網羅する |
| `master.ai_api_key`の漏洩 | Claude APIキーの不正利用・費用被害 | RLS（テーブル単位）＋アプリ層の列除外・マスク表示（列単位）の二重対策を徹底する（Phase 2・4） |
| ライブ共有の見積金額がマスタ単価変更で意図せず変わる | クライアントに無断で金額が変わって見える事故 | `estimateVersion`モード（見積もりは凍結）＋マスタ変更時の警告ダイアログ（Phase 9・11）で対処。デフォルトロジックにより見積もり含む共有は自動的に凍結モードになる |
| タイムゾーンのずれ（UTC/JST） | 営業日計算が1日ずれる | 全日付を`YYYY-MM-DD`文字列で統一し、タイムゾーン変換を伴う`Date`演算を避ける（Phase 7） |
| Claude API利用コストが想定を超える | 運用コスト増 | Phase 10実装後に実測し、必要なら生成対象ページ数に応じた確認ダイアログ等の追加策を検討する（D3） |
| `@react-pdf/renderer`のサーバーレス環境での処理時間・メモリ | PDF発行のタイムアウト・失敗 | Phase 9で実データボリューム（想定ページ数）でのレンダリング時間を検証する |
| Supabase Storageのアクセス権限設定ミス | 見積書PDF・角印画像の意図しない公開 | 非公開バケット＋署名付きURLを徹底し、Phase 2・9でアクセス制御をテストする |

---

## 6. 進め方の指針

1. **Phase 0→1→2→3を先に固める**（基盤・デザイン・データ・認証）。
2. **Phase 7（スケジュール自動生成ロジック）は本アプリの中核かつ最も複雑度が高い**ため、着手前にspec §4.3・§4.5・§4.6のロジックを実装者間で読み合わせ、疑義があれば実装前に人間に確認する。
3. **Phase 9（見積もりPDF/バージョン管理）**着手時、テンプレートのビジュアル（角印配置・レイアウト）は簡易モックで先方確認してから本実装に進めると手戻りが少ない。
4. 各フェーズ末で完了条件と対応する受け入れ基準を実機チェックしてから次へ進む。
5. spec §10の残存⚠️項目（§0のD1〜D4）は、対応するフェーズ着手前に確定させる。

> 次アクション候補：①Phase 0（Next.js/Supabaseプロジェクト作成） → ②`supabase/migrations/`の作成（Phase 2） → ③Google OAuth疎通確認（Phase 3）。
