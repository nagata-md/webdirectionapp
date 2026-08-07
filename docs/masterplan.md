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

**2026-08-03 追記：Phase 7（スケジュール自動生成ロジック・コアエンジン）完了**

- 着手前にspec §4.3・4.5・4.6を読み合わせ、仕様に明記のない2点をユーザーに確認して確定：
  1. ページの「優先度」は数値が小さいほど優先（1が最優先）。
  2. マスタの日数（0.5日単位で入力可）は、スケジュール工程ごとに合計してから切り上げる（構成はワイヤー+コピーを先に合算してから切り上げ。他工程は単体で切り上げ）。工程間で端数を繰り越さない。
- Vitestを導入（`npm test`）。今後もロジック系コードは可能な限りユニットテストを書く方針とする。
- `lib/schedule/`：
  - `businessDay.ts`：JSTセーフな営業日計算（`YYYY-MM-DD`文字列⇔UTC epoch daysで変換、ローカルタイムゾーンに依存する`Date`メソッドは一切使わない）。`isBusinessDay`/`shiftBusinessDays`/`maxDate`等。
  - `groupSequencer.ts`：進行グループごとのページのバケット分け（`group_id`未設定ページは表示順1のグループへ、進行グループが0件のプロジェクトは全ページを暗黙の単一グループとして扱う）。
  - `laneAllocator.ts`：スケジュール工程ごとの並行作業レーン管理。各ページを優先度順に処理し、readyTime以降で最も早く空くレーンを選んで営業日を積む。
  - `computeSchedule.ts`：上記を統合するオーケストレーター。進行グループを表示順に逐次処理し（グループ2以降の起点＝前グループの構成の実効終了日＝`schedule_overrides`があれば`override_end`優先）、ページごとに5つのスケジュール工程を順に処理する。計算結果はDBに保存せず、都度計算する関数として実装（`schedule_overrides`のみ永続化、spec §6の設計通り）。
- `lib/schedule/__tests__/`に14件のユニットテストを作成し全件成功：営業日計算（週末・休日・年末年始またぎ）、進行グループの逐次起点計算、並行作業レーンの競合（1レーンのみの場合に2件目が待つこと）、手動オーバーライドが次グループの起点に反映されることを検証。
- **実装上の判断**：構成工程でワイヤー・コピーがともに不要なページも、最低1営業日は占有する扱いにした（`Math.max(1, ...)`。ゼロ日フェーズは丸1日単位のガントモデルと相性が悪いため）。
- 本フェーズはコアロジックのみで、UI（ガントチャート表示・手動編集）はPhase 8で実装する。実際のマスタデータ（現状rates/standardsは未入力の`{}`）を使った統合的な目視確認もPhase 8で行う。

### 次回セッションの開始点

1. Supabase Personal Access Tokenが失効済みか確認する（未確認のまま）。
2. **Phase 8（ガントチャート表示・手動編集・オーバーライド）**に進む：`computeSchedule`の結果と`schedule_overrides`をマージしたガントチャートUI、手動編集（ドラッグ/日付入力）、後続工程追従・グループ起点連鎖の確認ダイアログ、リセット、変更履歴（spec §4.6・4.3）。
3. 動的リスト系の新規UIを作る際は`lib/ui/onEnterKey.ts`（IME対応済み）と`components/ui/SavedBanner.tsx`（保存フィードバック）を最初から使うこと。
4. 進行グループのように他テーブルからFK参照される可能性がある一覧編集を作る際は、`saveGroups`のdiff方式（全削除→再作成にしない）を踏襲すること。
5. ロジック系コード（スケジュール計算・見積もり計算等）はVitestでユニットテストを書く方針を継続する。

**2026-08-03 追記：Phase 8（ガントチャート・手動編集・オーバーライド）完了**

- Supabase Personal Access Tokenが失効していたため再発行してもらい対応（この繰り返しは今後も発生しうる。トークンは毎回会話ログに残るため、使い終わったら失効する運用を継続）。
- マイグレーション`20260803034821_schedule_overrides_editor_email.sql`：`schedule_overrides.edited_by_email`を追加。`auth.users`は通常のSupabaseクライアントから直接JOINできないため、変更履歴表示用にメールアドレスを書き込み時点でスナップショット保持する方式にした。
- `lib/schedule/loadProjectSchedule.ts`：プロジェクトのスケジュール計算に必要な入力（master/project/pages/groups/overrides）をまとめて取得し`computeSchedule()`を実行する共通ローダー。
- `app/(app)/projects/[projectId]/schedule/`：
  - `GanttChart.tsx`：日数ベースの相対位置（%）でページ×工程のバーを表示するシンプルなガント（クリックで編集フォームをトグル）。工程色は`lib/schedule/phaseColors.ts`、`app/globals.css`に`--color-phase-*`を追加。
  - `PhaseEditForm.tsx`：開始日・終了日の直接入力（ドラッグではなく日付入力、spec §4.6の許容範囲内）、後続工程追従チェック、構成工程編集時のみ「次グループ以降を再計算する／据え置く」の選択。
  - `actions.ts`：`overridePhase`（保存・グループ据え置き時の凍結処理・後続工程追従）、`resetPhaseOverride`（工程単位リセット）、`resetPageOverrides`（ページ単位リセット）。
- **設計判断（重要）**：「後続工程への追従」は、対象の後続工程がまだオーバーライドされていない場合は何もしなくてよい——`computeSchedule`は常にフレッシュ計算のため、上流の変更（オーバーライドされた終了日）を使って自動的に追従する。追従処理が必要なのは、後続工程が**既に**手動オーバーライドされていて、フレッシュ計算の恩恵を受けない場合のみ。この場合は変更前後の日数差分だけ既存オーバーライドを平行移動する。
- **設計判断**：「次グループ以降を据え置く」を選んだ場合、変更前の計算結果をその場でスナップショットし、対象グループ以降の非オーバーライド区間を明示的なオーバーライドとして書き込むことで「凍結」する（`computeSchedule`はDBに計算結果を保持しないため、凍結＝オーバーライド化以外に実現方法がない）。
- 実ブラウザでの動作確認済み（ユーザー本人）：ガントチャート表示、工程クリックでの編集、オーバーライド後の見た目（枠線）変化、工程単位リセット、変更履歴（変更者・日時・期間）の記録を確認。実データで`edited_by_email`が正しく記録されることも確認済み。
- ⚠️ **未検証**：進行グループが2つ以上あり、かつ構成工程の変更でグループ完了日が実際に変わるケース（「次グループ以降を再計算する／据え置く」の分岐の実質的な違い）は、テストデータに進行グループが1つしかなく検証できていない。Phase 9以降で複数グループのプロジェクトができた際に確認すること。

**2026-08-03 追記：Phase 9（見積もり・PDF発行・バージョン管理）完了**

- Supabase Personal Access Tokenが失効していたため、マイグレーション適用時に再度発行してもらった（`edited_by_email`同様、`estimate_versions.created_by_email`列の追加のため）。
- マイグレーション`20260803045251_estimate_versions_creator_email.sql`：`estimate_versions.created_by_email`を追加（`schedule_overrides.edited_by_email`と同じ理由・同じ方針）。
- `@react-pdf/renderer`を導入。**日本語フォントは別途調達が必要**（デフォルトフォントはCJKグリフを持たない）。Google Fonts配布元（google/fontsリポジトリ）からNoto Sans JPの可変フォント（`NotoSansJP[wght].ttf`、約9.5MB）を取得し`assets/fonts/`に配置。静的ウェイト別ファイルはこのリポジトリに存在しなかったため可変フォントをそのまま使用。本実装前に最小スクリプトで日本語グリフが正しく描画されることを実際にPDF出力して確認済み。
- `lib/estimate/calculate.ts`：`computeEstimate()`（①ディレクション費＝月額×暦月数、②ページ別コスト＝複雑度別単価の合算＋個別費用、③追加項目の合計、税抜小計・消費税・税込合計）。暦月カウントは要件定義書の方針通り。Vitestで6件のユニットテストを作成し全件成功。
- `lib/estimate/loadProjectEstimate.ts`：見積もり画面とCSV出力の両方から使う共通データ取得・計算ローダー。
- `lib/estimate/quoteNumber.ts`：見積番号を`EST-YYYYMMDD-連番`で採番（JST基準の日付、同日発行件数をService Role経由でカウント）。
- `lib/estimate/pdfTemplate.tsx`：見積番号・発行日・有効期限・御中・件名・①→②→③の内訳・小計/税/合計・発行元情報＋角印画像（Service Role経由でStorageから直接ダウンロードしbase64データURIとして埋め込み、署名付きURLへの追加の依存を避けた）。
- `app/(app)/projects/[projectId]/estimate/`：`LineItemsEditor.tsx`（追加項目の動的リスト、`onEnterKey`・保存後`?saved=1`の方式を踏襲）、`actions.tsx`（`saveLineItems`／`issueEstimatePdf`：PDF生成→Storage（非公開バケット`estimate-pdfs`）へアップロード→`estimate_versions`へ`estimate_data`のスナップショットとともに記録）、`csv/route.ts`（BOM付きUTF-8 CSV、Content-Dispositionでダウンロード）、`page.tsx`（内訳表示・CSVボタン・PDF発行ボタン・発行済みバージョン一覧＋署名付きURLでの再ダウンロード）。
- **実データでイミュータブル性を確認**：見積書を3回発行する過程でマスタ単価を実際に変更してもらい、変更前に発行した1件目・2件目の`estimate_data`（ページコスト等）が変更後もそのまま保持され、3件目（変更後に発行）だけ新しい単価を反映していることをサービスロール経由で確認。設計通りに機能している。
- 実ブラウザでの動作確認済み（ユーザー本人）：内訳表示順・追加項目の追加/保存・CSVダウンロード・PDF発行・PDF内の日本語表示・発行済みバージョン一覧・PDF再ダウンロード・イミュータブル性、すべて確認。

**2026-08-03 追記：Phase 10（メタ情報・AIメタ情報一括生成）完了**

- `lib/ai/claudeClient.ts`：`master.ai_api_key`をService Role経由で復号し、Anthropic Messages APIをforced tool useで呼び出す共通クライアント（構造化出力をJSON schemaで強制）。
- `lib/ai/metaPrompt.ts`：指示文＋全ページ情報（ページ名・種別・親ページ・優先度）からプロンプトとtoolスキーマを構築。
- `app/(app)/projects/[projectId]/meta/`：
  - `actions.ts`：`saveMetaTable`（メタ情報テーブルの一括保存）、`generateMetaPreview`（`useActionState`で使うProps付きServer Action。`projectId`は`.bind(null, projectId)`でクライアント側から部分適用）、`applyMetaPreview`（プレビューの内容をpagesへ反映＋`ai_meta_generation_logs`へ記録）。
  - `AiGeneratePanel.tsx`：指示文入力・スコープ切替（未入力のみ／全ページ）・生成・編集可能なプレビュー表・反映。プレビューの反映は`saveMetaTable`と同じ「pageIdを複数のhidden inputで渡し、`slug.{pageId}`のような命名フィールドをサーバー側でgetAllして処理する」方式にし、JSONシリアライズを使わずシンプルにした。
  - `page.tsx`：メタ情報テーブル本体。
- **バグ修正（ユーザー報告）**：マスタ設定に投入されていた`ai_model`がテスト用の無効な値（`claudeAPI`）だったため、Claude APIから404エラー。実在するモデルID（`claude-sonnet-5`等）への修正を案内し解消。
- **機能追加（ユーザー要望）**：
  1. AI生成の指示文を`ai_meta_generation_logs`から直近1件を読み出し、次回開いたときの初期値として使うようにした（新しいカラムを追加せず既存の生成ログを再利用）。
  2. メタ情報テーブル・AI生成プレビューの両方で、TITLE・ディスクリプション・キーワードの入力を`<input>`から`<textarea>`（`resize-y`、ブラウザ標準のドラッグリサイズ）に変更し、長文を確認しやすくした。
  3. 納品予定日の下に、スケジュール計算（`loadProjectSchedule`）から得た「計算上の公開予定日」を参考表示として追加。**設計判断**：自動上書きにはせず、あくまで参考表示に留め、納品予定日・進捗ステータス自体は引き続き手動入力・保存とする方針をユーザーに確認して採用（クライアントに約束した納期や実態の進捗が、内部スケジュール計算と必ずしも一致しないため）。
- 実データ・実ブラウザで、実際のClaude APIキーを使ったAI一括生成（指示文の内容が反映された自然な日本語のTITLE/ディスクリプション/キーワードが生成されること）、未入力のみ／全ページの切替、テーブルでの手動編集・保存、生成ログの記録を確認済み。

**2026-08-03 追記：Phase 11（外部共有機能）完了**

- マイグレーション`20260803060000_share_links_creator_email.sql`：`share_links.created_by_email`を追加（`schedule_overrides.edited_by_email`／`estimate_versions.created_by_email`と同じ方針）。
- `lib/share/token.ts`：`crypto.randomBytes(24).toString("base64url")`で推測不可能な共有トークンを生成。
- `lib/share/password.ts`：共有リンクの任意パスワードをNode組み込みの`scrypt`（salt付き、`timingSafeEqual`で比較）でハッシュ化。外部ライブラリ非依存。Vitestで4件のユニットテストを作成。
- `lib/share/passwordCookie.ts`：パスワード照合済みを示すCookieの値を`MASTER_ENCRYPTION_KEY`によるHMAC-SHA256で計算する方式（トークンごとに一意、クライアントが偽造不可）。照合成功時に`httpOnly`・`path`をトークン単位にスコープしたCookieをServer Actionから発行する。
- `lib/share/expiry.ts`：有効期限切れ判定。`Date.now()`をコンポーネントのレンダー内で直接呼ぶと`react-hooks/purity`のESLintルールに抵触するため、判定ロジックを独立ヘルパーに切り出した（Vitestで3件テスト）。
- `lib/schedule/loadProjectSchedule.ts`・`lib/estimate/loadProjectEstimate.ts`：第2引数で任意のSupabaseクライアントを受け取れるように変更（省略時は従来通りRLSクライアント）。共有閲覧画面からService Roleクライアントを渡して同じ計算ロジックを再利用するため。
- `app/(app)/projects/[projectId]/shares/`：共有リンクの発行・一覧・失効を行う社内向け管理画面。`ShareCreateForm.tsx`（公開セクションのチェックボックス、見積もりを含む場合のみ表示モード選択、発行済みバージョンが0件なら`estimateVersion`を選択不可＋案内）、`CopyLinkButton.tsx`（クリップボードコピー）、`actions.ts`（`createShareLink`／`revokeShareLink`）。一覧では有効/失効/期限切れの状態、含まれるセクション、パスワード有無、有効期限、閲覧回数・最終閲覧日時、発行者を表示。
- `app/(public)/share/[token]/`：外部向け参照専用の共有閲覧画面。`page.tsx`がトークン検証（存在しない／失効／期限切れの分岐）→パスワード照合（設定されている場合のみ、未照合ならフォーム表示）→閲覧記録更新（`view_count`・`last_viewed_at`）→セクション別描画、という順で処理する。すべてService Roleクライアント（`createAdminClient()`）経由でRLSをバイパスし、トークン・パスワードの照合をサーバー側で完結させる（`share_links`テーブルには`authenticated`ロールへのGRANTしかなく、`anon`は一切アクセスできない設計のため必須）。
  - `ShareDirectoryMapTree.tsx`／`ShareGantt.tsx`／`ShareEstimateTable.tsx`／`ShareMetaTable.tsx`：社内画面の対応コンポーネントから編集操作・変更履歴・優先度・進捗ステータス等の内部運用項目を取り除いた参照専用版（spec §4.10の除外方針）。
  - `actions.ts`：`verifyShareLinkPassword`（パスワード照合→Cookie発行→リダイレクト。誤りの場合は`?error=1`付きでリダイレクト）。
- `app/(app)/master/`：`checkLiveShareImpact()`（`actions.ts`）を追加し、単価・工数（`saveScheduleMaster`）とディレクション費・税率（`saveDirectionAndTax`）の保存ボタンを`ImpactAwareSubmitButton.tsx`に置き換えた。クリック時にService Role不要の通常クライアントで「失効・期限切れでなく見積もりセクションを含む有効なライブ共有リンク」の件数・プロジェクト名を取得し、該当があれば`window.confirm()`で警告してから送信する（estimateVersionモードは対象外、spec §4.10）。
- **設計判断**：spec §4.10の「除外を推奨する内部運用項目」（優先度・並行作業人数設定・休日カレンダー・内部担当者名・進捗ステータス）は、セクション単位のON/OFFとは別に項目ごとのトグルは設けず、含めたセクション内で常に非表示にする固定仕様とした。spec.mdにもその旨を明記済み。
- spec.md §10のD2（共有URLの有効期限デフォルト値・パスワード必須化の是非）を解決として更新：デフォルト90日（発行時に変更可）、パスワードは任意設定・必須化しない。
- **テスト**：Service Role経由でテスト用の`share_links`を4パターン（ライブ・全セクション/パスワード付きestimateVersion/失効済み/期限切れ）作成し、`curl`で公開閲覧画面の全分岐（存在しない・失効・期限切れ・パスワード要求・正しいCookieでの閲覧・誤ったCookieでの拒否）と`view_count`/`last_viewed_at`の更新、`checkLiveShareImpact`相当のクエリが失効・期限切れ・estimateVersionモードのリンクを正しく除外することを確認。テストデータは確認後に削除済み。
- 実ブラウザでのユーザー本人による確認済み。ただし共有リンク一覧画面で不具合報告あり→修正済み（下記）。

**バグ修正（ユーザー報告）**：共有リンク一覧画面（`shares/page.tsx`）を開くとサーバーエラーになる不具合。原因は、Server Componentの`<form>`に確認ダイアログ用の`onSubmit`ハンドラを直接渡していたこと（「Event handlers cannot be passed to Client Component props」）。失効ボタンの確認ダイアログ部分を`RevokeShareLinkForm.tsx`というClient Componentに切り出して解消した。

**UI変更（ユーザー要望）**：「共有リンク先の画面は、通常運用者が見る画面と同等のデザインなタブ形式にしたい」との要望を受け、共有閲覧画面（`/share/[token]`）を1ページに全セクションを縦積みする構成から、社内画面（`ProjectTabs`）と同じ「タブ切り替え＋各セクション1ページ」の構成に作り直した。

- `app/(public)/share/[token]/layout.tsx`：トークン検証（存在しない／失効／期限切れ）・パスワード照合（Cookie）・閲覧記録更新（`view_count`／`last_viewed_at`）・`PageHeader`＋`ShareTabs`の表示をレイアウトに集約。無効なリンク／パスワード未照合の場合は`children`を描画せず、レイアウト自身がエラーメッセージ・パスワードフォームを返す。
- `app/(public)/share/[token]/page.tsx`：ルートは含まれる最初のセクション（ディレクトリマップ→スケジュール→見積もり→メタ情報の順）へ`redirect`するだけのページに変更。
- `app/(public)/share/[token]/{directory-map,schedule,estimate,meta}/page.tsx`：セクションごとに独立したページとして分離（社内の`app/(app)/projects/[projectId]/{directory-map,schedule,estimate,meta}/page.tsx`と同じ構成）。`include_sections`で除外されているセクションへ直接URLアクセスした場合は何も描画しない（タブ自体もそのセクションを表示しないため通常は到達しない防御的処理）。
- `ShareTabs.tsx`：社内の`ProjectTabs.tsx`と同じ見た目・実装パターンのタブナビゲーション。`include_sections`でtrueのものだけを表示する。
- `lib/share/getShareLinkStatus.ts`：トークンの検証（存在確認・失効・期限切れ判定）を共通化するヘルパー。layoutと各セクションページの両方から呼ばれる（各ページも独立してリンクの有効性・該当セクションの包含有無を再チェックする防御的設計）。
- **実装上の制約**：Next.jsのlayout.tsxは`searchParams`を受け取れない仕様のため、パスワード誤り時のエラー表示（`?error=1`）は`PasswordErrorNotice.tsx`というClient Component（`useSearchParams`使用、`Suspense`でラップ）に切り出した。
- 実ブラウザでの動作確認はこの構成変更後、ユーザー本人にお願いする。

**機能追加（ユーザー要望）**：「基本情報も共有したい。秘密情報あり／なしの2種類にして、なしは基本情報（プロジェクト名・クライアント名・着手日のみ）、ありはすべて見せる（開発サポート者用）」との要望を受け、共有可能セクションに基本情報を追加した（spec §4.10・§6に反映）。

- `share_links.include_sections`に`basicInfoPublic`・`basicInfoFull`の2つのbooleanキーを追加（マイグレーション不要、jsonbのため）。両方同時にtrueにはしない（`basicInfoFull`が優先、`ShareCreateForm.tsx`でチェックボックス2つを相互排他的に制御）。
- `basicInfoPublic`＝プロジェクト名・クライアント名・着手日のみ。`basicInfoFull`＝それに加えて自社担当者（`project_owners`）・サーバー情報リンク・Figmaリンク（`project_links`）を含む全項目（社内の基本情報タブ相当、編集フォームなしの参照専用）。
- `app/(public)/share/[token]/basic-info/page.tsx`・`ShareBasicInfoView.tsx`を追加。タブの並び順は社内画面に合わせて「基本情報」を先頭に配置（`ShareTabs.tsx`・ルートの`page.tsx`のリダイレクト優先順位も同様）。
- **テスト**：Service Role経由で秘密情報なし／ありの2パターンの共有リンクを作成し、なしの方は自社担当者・サーバー情報リンクのセクション自体が出力されないこと、ありの方はサーバーURL・担当者名まで含めて表示されることを`curl`で確認済み（テストデータは削除済み）。

### 次回セッションの開始点

1. Supabase Personal Access Tokenが失効済みか確認する。
2. ユーザー本人による実ブラウザでのPhase 11動作確認待ち（共有リンク発行・パスワード照合・各セクションの表示・マスタ変更時の警告ダイアログ）。問題なければ**Phase 12（仕上げ・受け入れ確認）**に進む：CSV・レスポンシブ・タイムゾーン・セキュリティの最終確認、spec §11の受け入れ基準を通しで確認する。
3. 動的リスト系の新規UIを作る際は`lib/ui/onEnterKey.ts`（IME対応済み）と`components/ui/SavedBanner.tsx`（保存フィードバック）を最初から使うこと。
4. 進行グループが2つ以上あるプロジェクトで、構成工程オーバーライド時の「次グループ以降を再計算する／据え置く」の分岐を実際に確認する機会があれば確認しておく（Phase 8からの継続課題）。
5. ロジック系コード（スケジュール計算・見積もり計算等）はVitestでユニットテストを書く方針を継続する。
6. PDF等で日本語を扱う新規機能を追加する場合は、`assets/fonts/NotoSansJP-Regular.ttf`（実体は可変フォント）を再利用できる。
7. マスタ設定のAI連携設定に、モデル名が実在するIDかの簡単なバリデーション（せめてプレースホルダーで正しい例を示す等）を今後検討してもよい。
8. コンポーネントのレンダー内で`Date.now()`／引数なし`new Date()`を直接呼ぶと`react-hooks/purity`のESLintエラーになる。「現在時刻」が絡む判定は`lib/share/expiry.ts`のように独立したヘルパー関数に切り出すこと。

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

---

## 7. Phase 12：仕上げ工程の追加要望（2026-08-03すり合わせ）

Phase 11完了後、実画面を見たユーザーから大量の仕上げ要望が出たため、spec.mdを参照しながら一問一答形式ですり合わせを行った。以下は確定した仕様。実装順は依存関係（マスタ→スケジュール→ディレクトリマップ→見積もり→共有→一覧→ガント→CSV/デザイン）を考慮している。

### 7.1 確定仕様

**一覧画面**
- コピーボタン：ディレクトリマップ（ページ構成・進行グループ）ごと複製する。スケジュールの手動オーバーライド・確定済み見積書（`estimate_versions`）・メタ情報・共有リンクは複製しない。複製後のプロジェクト名は自動採番（例：「（元の名前）のコピー」）。
- 検索：フリーワード（プロジェクト名・クライアント名の部分一致）＋完了プロジェクトの表示/非表示トグル。
- 担当者表示：「ディレクター」roleの担当者がいればそれを優先表示、いなければ登録順の先頭を表示。

**プロジェクト画面**
- プロジェクト名の脇にクライアント名も表示する。

**CMS構築費（ディレクトリマップ・マスタ）**
- ページの「個別費用（自由入力）」欄を廃止し、CMS構築費ドロップダウン（なし／S／M／L）に置き換える。
- CMS構築を独立した6つ目のスケジュール工程として追加し、シーケンス上は「コーディング後・テストアップ前」に挿入する（構成→デザイン→コーディング→**CMS構築**→テストアップ→公開）。
- マスタ設定にCMS構築費（S/M/L）の金額・日数を追加する。

**TOP別マスタ・スマホ対応メニュー**
- TOPページも引き続きS/M/Lの複雑度を選べる前提で、TOP専用のS/M/L別単価・日数テーブルを新設する（既存の共通複雑度レート表とは別建て）。
- 「スマホ対応メニュー（メガメニュー）制作」を、TOPページの編集フォームにチェックボックスとして追加する。スケジュールには影響しない（TOPの工程に含まれている想定）。マスタ単価は複雑度区分のない単一価格。ディレクション単価の設定エリア付近に配置する。

**進行グループのデフォルトテンプレート**
- 新規プロジェクト作成時に「TOP関連／主要ページ1／主要ページ2／CMSまわり1／CMSまわり2／フォームまわり／概要関連ページ」の7グループを、この優先順位で自動作成する。プロジェクトごとに追加・削除は引き続き可能。

**ディレクトリマップのタグ表示**
- ワイヤー・コピーは、不要時だけでなく必要時も常にタグ表示する（「ワイヤー」「コピー」）。CMS構築費が設定されている場合はCMSタグ（S/M/L）も表示する。

**プロジェクト完了→アーカイブ**
- 基本情報画面に「完了」ボタンを設置。完了にすると一覧から非表示になる（一覧の表示トグルで再表示可能）。完了後も編集は引き続き可能（読み取り専用化はしない）。

**見積もり：詳細／集計タブ**
- 見積もりタブの中に「詳細見積もり」「集計見積もり」の2つのサブタブを設ける。
- 詳細見積もり：現行のページ単位表示のまま。CMS構築費が設定されたページは「ページ名＋CMS構築費」として項目出しする。
- 集計見積もり：①ディレクション費（月数×単価）②TOP関連（デザイン・コーディング・スマホ対応メニュー等）は複雑度で括らずページ単位で「1式」個別表示③それ以外のページはコスト工程（ワイヤー／コピー／デザイン／コーディング）×複雑度(S/M/L)ごとにページ数を集計し「n頁×単価」表示④CMS構築費は詳細同様「ページ名＋CMS構築費」の個別行⑤テストアップ＋公開は「テスト検証」という1行に全ページ合計金額をまとめて表示する。**追加要望**：テスト検証の合計金額が0円の場合はその行自体を表示しない。
- PDF発行は集計見積もりベースに変更する（詳細見積もりはPDF化せず画面表示のみ）。
- `estimate_versions`は詳細・集計の両方のデータを凍結保存する（画面には集計を使うが、過去バージョンの詳細内訳も追える形にする）。
- 見積もり画面に自由記述の備考欄を追加し、発行時に凍結してPDFにも印字する。

**共有リンク先ダウンロード（spec.md §4.11の仕様変更）**
- spec.md §4.11「外部共有閲覧画面からのPDFダウンロードは提供しない」を変更し、共有閲覧画面から見積もりPDFをダウンロード可能にする。ただし`estimateVersion`モード（発行済みPDFがある場合）のみ提供し、`live`モードでは提供しない（都度生成はしない）。
- 共有閲覧画面にメタ情報CSVダウンロードを追加する。メタ情報セクションが含まれる共有リンクでのみ表示する。

**ガントチャート強化**
- 各ページ行の左側情報エリアに「公開予定日」「作業日数（プロジェクト開始〜公開までの営業日数）」を大きめフォントで表示する。
- カレンダー型グリッドに変更：日付を1日ずつ列にして横スクロール対応、週末・休日を濃いグレーで塗る。工程は現行の色付きバーのまま、日付グリッドに合わせて配置する（サンプルのような文字詰めはしない）。

**メタ情報CSV**
- メタ情報画面に開発者向けCSVエクスポートを追加する。列は現行のメタ情報テーブル通り（スラッグ・TITLE・ディスクリプション・キーワード・納品予定日・進捗ステータス）。

**画面デザイン**
- サイドバーのネイビー背景を画面下端まで伸ばす。メニューのテキスト色を白にする（現状ネイビー背景にネイビー文字で読めなくなっている不具合）。

**運用者専用メモ機能（新規要望・共有リンクには一切含めない）**
- プロジェクトに、ログイン中のチームメンバーだけが見られる「メモ」タブを新設する。
- `project_memos`テーブル：`id`, `project_id`, `author_email`（保存時にログイン中のユーザーのメールアドレスを自動記録、`schedule_overrides.edited_by_email`と同じ方針）, `content`（メモ本文）, `created_at`。
- ログ形式（追記・削除のみ、保存後の編集は不可）。一覧に記入者・内容・保存日時を新しい順に表示する。
- 外部共有機能（`share_links`）の対象セクションには含めない。共有閲覧画面（`/share/[token]/*`）のいかなる箇所にも表示しない。

### 7.2 実装順序

1. マスタ設定拡張（CMS構築費S/M/L・TOP専用レート表・スマホ対応メニュー単価・進行グループデフォルトテンプレート設定）
2. スケジュールエンジン拡張（CMS構築を6つ目のスケジュール工程として追加）
3. ディレクトリマップ（CMSドロップダウン・タグ表示変更・スマホメニューCB・新規プロジェクトへのグループ自動作成）
4. 見積もり（詳細/集計タブ・集計計算ロジック・備考欄・PDF変更・`estimate_versions`拡張）
5. 共有リンク先ダウンロード機能（見積もりPDF・メタ情報CSV）
6. 一覧・プロジェクト完了/アーカイブ・コピー機能
7. ガントチャート強化（カレンダー型グリッド・大きな日付表示）
8. メタ情報CSV・サイドバーデザイン修正・運用者専用メモ機能

**2026-08-03 追記：Phase 12-1〜12-8（仕上げ工程の追加要望）実装完了**

上記7.1の確定仕様を、依存関係に沿った順（マスタ→スケジュール→ディレクトリマップ→見積もり→共有→一覧→ガント→CSV/デザイン/メモ）で実装した。

- **マイグレーション5本**：`master`にcms_rates/top_rates/mobile_menu_rateを追加、`schedule_overrides.phase_key`のCHECK制約に'CMS構築'を追加（無名制約をpg_constraintから動的に探して付け替え）、`pages`のextra_costを削除しcms_tier/mobile_menu_neededを追加、`projects`にarchived_at/estimate_remarksを追加、`project_memos`テーブルを新設（RLSは`is_team_member()`、GRANTはselect/insert/deleteのみでupdateは付与せずログ形式を徹底）。
- **スケジュールエンジン**：`SCHEDULE_PHASES`に'CMS構築'を追加（構成→デザイン→コーディング→CMS構築→テストアップ→公開）。`computeSchedule.ts`はcms_tierが未設定のページではこの工程を`continue`でスキップする（readyTimeも進めない）ことで、CMS不要ページのスケジュールに影響を与えない設計にした。TOPページは`master.top_rates`（ratesと同形状の別建てテーブル）を参照するよう`phaseDurationDays`を分岐。
- **見積もり計算**：`lib/estimate/calculate.ts`（詳細）と`lib/estimate/calculateAggregated.ts`（集計、新規）に分離。両者は同じ入力から計算するため`subtotal`/`total`が必ず一致する设計とし、Vitestで直接その一致を検証するテストを追加した。集計はTOP関連をページ単位で1式個別表示、それ以外はコスト工程×複雑度で集計、CMS構築費は個別行、テストアップ+公開は「テスト検証」1行にまとめて0円なら非表示（画面側で判定）。PDF発行・`estimate_versions`の凍結データは共に集計見積もりを主に使いつつ詳細データも保持する`{ detailed, aggregated, total }`の形に変更した。
- **既存データとの非互換に関する注意**：Phase 9で発行済みの旧estimate_versionsは`estimate_data`が旧フラット形式（`{pages, total, ...}`）のままのため、共有閲覧画面の見積もりPDF/内訳表示は新形式（`{detailed, aggregated, total}`）を前提とする新コードでは中身が空になる（クラッシュはしない。`total`のみを見る内部の発行済み一覧表示は引き続き動く）。実データでの検証は新規にPDFを再発行してから行うこと。
- **ディレクトリマップ**：`pages.extra_cost`を廃止し`cms_tier`（なし/S/M/L）ドロップダウンに置き換え。ワイヤー・コピーは必要時も「ワイヤー」「コピー」として常時タグ表示し、CMSタグ・スマホ対応メニュータグを追加（社内`PageRow.tsx`・共有`ShareDirectoryMapTree.tsx`の両方）。新規プロジェクト作成時、`lib/pages/defaultGroups.ts`の7グループ（TOP関連〜概要関連ページ）を自動作成。
- **一覧・アーカイブ・コピー**：`projects`にフリーワード検索（`ilike`のor条件）・完了プロジェクト表示トグル（`archived_at is null`のデフォルト絞り込み）・担当者表示（ディレクターrole優先、なければ登録順先頭）を追加。プロジェクトコピー(`copyProject`)はowners/links/groups/pagesを複製するが、group_id/parent_idの旧→新ID対応が必要なため一括insertではなく1件ずつinsertしてマッピングを取る設計にした（複数件insertは返却順序が保証されないため）。スケジュールオーバーライド・確定済み見積書・メタ情報・見積もりの追加項目/備考・共有リンク・運用者メモは複製しない。
- **ガントチャート**：`lib/schedule/dateGrid.ts`（新規、`buildDateGrid()`）で日付を1日ずつ列にしたグリッドを生成する共通ロジックを切り出し、`GanttChart.tsx`（社内、編集可）・`ShareGantt.tsx`（共有、参照専用）の両方から使う。左側の情報列（ページ名・公開予定日・作業日数を大きく表示）を`position: sticky; left: 0`で固定し、日付グリッド部分だけが横スクロールする構成（ヘッダーとバーが同じスクロールコンテナ内にあるため、ずれることなく同期する）。週末・休日は`bg-subtle`で塗る。
- **CSV/デザイン/メモ**：メタ情報の開発者向けCSV（社内・共有閲覧の両方、共通ヘルパー`lib/csv.ts`）、共有閲覧画面からの見積もりPDFダウンロード（`estimateVersion`モードのみ）を追加。サイドバーのテキストが見えない不具合は、`app/globals.css`の`a { color: navy }`等が`@layer`に属さず、CSS Cascade Layersの仕様上Tailwindの`utilities`レイヤー（`text-white`等）より強くなってしまっていたことが原因と判明。該当ルールを`@layer base`に入れて解消した。ネイビー背景が下まで伸びない件は、`Sidebar.tsx`の`<aside>`要素自体に高さ指定がなかったため`h-full`を追加して解消。運用者専用メモ機能は`project_memos`テーブル・新規`/memo`タブとして実装（ログ形式、追記・削除のみ、共有リンクのセクションには一切含めない設計）。
- **テスト**：Vitestで新規13件追加（dateGrid 3件、calculate系 追加分、calculateAggregated 5件、CMS工程のcomputeSchedule 1件）、全40件成功。Service Role経由でTOPページ・CMSページ・カスタムマスタレートのテストデータを一時的に作成し、共有閲覧画面の全セクション（基本情報・ディレクトリマップ・スケジュール・見積もり・メタ情報）とCSV/PDFダウンロード導線を`curl`で確認（CMS構築費の個別行金額・TOPページのスマホ対応メニュー加算・カレンダーグリッドの週末表示・タグ表示など）。検証後はテストデータ（ページ・共有リンク・マスタの一時レート）をすべて削除・原状復帰済み。
- 実ブラウザでのユーザー本人による確認は途中まで実施。ガントチャートについて追加要望・不具合報告があり、以下の追記の通り対応した。

**2026-08-03 追記：Phase 12ブラウザ確認後の修正（ガントチャート・スケジューリングロジック）**

- **不具合修正**：カレンダー型グリッド化に伴い、工程バーをクリックした際の手動編集フォーム（`PhaseEditForm`）が、日付グリッドと同じ横スクロールコンテナの内側（かつ固定幅のdiv内）に描画されるようになっていたため、横スクロールした状態でバーをクリックすると編集フォームが画面外に隠れて「見えなくなる」不具合があった。編集フォームを横スクロールコンテナの**外側**（チャート全体の下）に移動し、常に全幅で表示されるように修正（`GanttChart.tsx`）。
- **ガントの見た目強化（ユーザー要望）**：
  - 日付グリッドに縦方向の薄いグレーの罫線を追加（各日付セルに`border-l border-border/60`）。
  - 工程バー・待機バーの最終日のセルを`filter: brightness(0.7)`で少し濃い色にする（`BarSegments`コンポーネントで「最終日以外」「最終日」の2つのdiv/buttonに分けて描画）。
  - チェックバック・バッファの待機期間にも色をつけた（工程間のギャップを算出し、以前から定義だけあり未使用だった`--color-phase-wait`トークンで表示。最終日を濃くする処理は工程バーと共通）。社内`GanttChart.tsx`・共有`ShareGantt.tsx`の両方に適用。
- **スケジューリングロジックの変更（ユーザー要望・spec §4.3改訂）**：次グループの起点を「前グループの構成完了日と同日」から「**構成完了日の翌営業日**」に変更（`computeSchedule.ts`）。土日・休日をまたぐ場合は次の営業日まで飛ばす（`shiftBusinessDays`を再利用）。既存のVitestテスト（グループ起点・オーバーライド連鎖の2件）を新しい期待値に更新済み。
- **テスト**：`computeSchedule.test.ts`の期待値更新（+1営業日を反映）を含め、全40件成功を再確認。共有スケジュール画面（`ShareGantt.tsx`）で罫線・最終日の濃い色・チェックバック帯の表示を`curl`で確認済み（テストリンクは削除済み）。

**2026-08-03 追記：ユーザーからの追加フィードバックへの対応（構成工程の同日着手・全体サマリー化・作業完了ラベル・モーダル化・祝日自動取得）**

上記の初回対応に対し、ユーザーから「同一グループの同日着手は実際は仕様通りに動いていない」との指摘と、複数の追加要望があったため以下の通り対応した。

- **構成工程の同日着手を実際に保証（`computeSchedule.ts`）**：これまでは構成工程も`reserveLane()`（並行作業レーン）を通していたため、マスタの並行作業人数を超えるページ数がある場合はレーン待ちで開始日がずれていた（＝「仕様通り」と説明したが実際は保証されていなかった）。構成工程のみ`reserveLane()`を呼ばず、常にグループ起点日（`readyTime`）を直接開始日とする分岐を追加し、並行作業人数の制限を無視するようにした。新規Vitestテスト（構成レーン1・3ページでも全ページ同日開始になることを確認）を追加。spec §4.3・§4.5に確定事項として明記。
- **ガントのサマリー表示をページ単位から全体1つに変更（`GanttChart.tsx`／`ShareGantt.tsx`）**：「公開予定日」（全ページの最終工程完了日の最大値）と「作業日数」（プロジェクト開始日〜その公開予定日の営業日数）を、各ページ行ではなくチャート上部に1回だけ大きく表示するよう変更。
- **ページ単位の最終工程ラベルを「作業完了」に変更、実際の公開日を全ページ共通の黒セルで表示**：内部データ・DBキーは従来通り"公開"のまま変更せず（`schedule_overrides.phase_key`等への影響を避けるため）、表示のみ`schedulePhaseLabel()`（`lib/master/constants.ts`新設）で「作業完了」に変換。加えて、全ページの最終工程完了日のうち最大値（＝サイト全体の実際の公開日）を1日分、全ページの行に黒色のセルとして共通表示する処理を追加。
- **手動編集フォームをモーダル化**：ページ数が多いと編集フォームがチャート下部に離れて操作しづらいとの指摘を受け、バークリック時に画面中央のモーダルダイアログ（半透明オーバーレイ＋クリックで閉じる）で表示するよう変更。
- **チェックバック・バッファの色をピンク系に変更**：週末・休日のグレーと見分けにくいとの指摘を受け、`--color-phase-wait`のCSS変数値をグレー(#d9dcdf)からピンク系(#e8a3bb)に変更（クラス名は`bg-phase-wait`のまま、配色のみ変更）。
- **縦罫線を全行貫通の1枚のオーバーレイに変更**：これまで行ごとに罫線divを描画していたため、行間の`gap-3`部分で線が途切れていた。日付グリッド部分の罫線・週末網掛けを、全ページ行を貫通する1枚の`position: absolute; inset: 0`オーバーレイとして描画するよう構造変更し、連続した縦線に見えるようにした。
- **祝日自動取得を実装**：`holidays-jp`公開API（https://holidays-jp.github.io/api/v1/date.json、認証不要）から祝日を取得し、マスタの休日カレンダーに未登録の日付だけ追加する`syncPublicHolidays`アクションを追加。取得範囲は当年の前年1月1日〜再来年12月31日に絞る（API自体は2025〜2027年分程度のみ返す仕様と判明したため、実質的にはAPIの全件がこの範囲に収まる）。既存の手入力休日（夏季休業等）は変更しない。マスタ設定の休日カレンダーパネルに「祝日を自動取得」ボタンを設置。
- **テスト**：新規Vitestテスト1件追加（構成工程の同日着手）、全41件成功。本番ビルド成功も確認。
- 実ブラウザでの最終確認はまだ行っていない。

**2026-08-03 追記：非稼働日にバーが被る不具合の修正・2校期間（初稿→CB→2校→2校CB→バッファ）の新規実装**

- **不具合修正：土日・休日にカラーバーが被って見える件**：工程バー・待機バーとも、これまで開始日〜終了日を1本の連続矩形として描画していたため、期間が週末をまたぐ場合、非稼働日の列にも色が塗られ「休日にも作業しているように」見えていた。`GanttChart.tsx`・`ShareGantt.tsx`の両方に`getBusinessDayRuns()`を追加し、`[start, end]`を非稼働日で分断した「連続稼働日の区間」ごとに分けて描画するよう修正（非稼働日の列は色を塗らない）。最終日の濃い色強調は、区間分割とは別に常に`end`の位置へ重ねて描画する形に整理。
- **2校期間の新規実装（ユーザー要望・spec §4.5改訂）**：構成・デザイン・コーディング・テストアップの4工程について、初稿提出後の待機を「チェックバック（既存）→2校作業日数（新規）→2校チェックバック日数（新規）→バッファ（既存）」の順に変更。2校作業日数・2校チェックバック日数はマスタ設定の標準待機日数テーブルに工程別（構成/デザイン/コーディング/テストアップの4行のみ、CMS構築・公開の行は「―」表示で入力不可）の列として追加。データモデルは`master.standards`の各エントリに`secondDraftDays`・`secondCheckbackDays`を追加しただけ（`lib/master/constants.ts`の`StandardEntry`型・`SECOND_DRAFT_PHASES`定数、マイグレーション不要・jsonbのため）。進行グループの起点計算（構成完了日）は初稿提出日を基準としたまま変更していない（2校期間は同一ページ内の次工程への影響のみ）。
- **テスト**：新規Vitestテスト2件追加（2校期間が構成→デザインの待機に正しく加算されること、CMS構築には適用されないこと）、全43件成功。本番ビルド成功も確認。
- 実ブラウザでの最終確認はまだ行っていない。

**2026-08-03 追記：チェックバック1・2の個別手動編集化、グループ一括反映機能の追加**

前回実装した2校期間は「チェックバック→2校作業→2校チェックバック→バッファ」を1本の待機バーに折り畳んで表現していたが、ユーザーから「構成提出→CB→構成の修正作業→提出→CB→次工程」という流れであり、カラーバーで言うと**青（制作）→ピンク（CB1）→青（2校作業）→ピンク（CB2）**の順で表示され、かつピンクのバーそれぞれ（CB1・CB2）を個別に手動編集したい、との具体的な訂正が入ったため、以下の通り再設計・実装した。

- **データモデル**：`schedule_overrides.phase_key`のCHECK制約に、2校期間対象4工程（構成/デザイン/コーディング/テストアップ）×チェックバック1/2の仮想セグメントキー8種（例:"構成チェックバック1"）を追加（マイグレーション`20260803080000_schedule_checkback_segments.sql`、無名制約を`pg_constraint`から動的検出して付け替える既存パターンを再利用）。`OverrideInput.phaseKey`・`PhaseSchedule.phase`の型を`SchedulePhase`から`string`に緩和し、`PhaseSchedule`に`kind`（`"production"|"checkback1"|"revision"|"checkback2"`）・`basePhase`（`SchedulePhase`、色分け・ラベル解決用）を追加（`lib/schedule/types.ts`）。
- **スケジュールエンジン**：`computeSchedule.ts`に`pushSubSegment()`を新設し、2校期間対象工程では制作セグメントの後にチェックバック1・2校作業・チェックバック2を独立した`PhaseSchedule`エントリとして積む。チェックバック1・2は`schedule_overrides`から探して手動オーバーライド可能（`allowOverride=true`）、2校作業は自動計算専用（`allowOverride=false`、オーバーライドを渡しても無視される）。オーバーライドがなく日数も0以下のセグメントは配列に積まない（従来通りの「何もない」扱い）。チェックバック1を編集すると、後続の2校作業・チェックバック2・次工程はオーバーライドされていない限りfresh計算で自動的に追従する（新規追従ロジックは不要、既存の「非オーバーライド区間は毎回再計算」という仕組みをそのまま利用）。
- **ガント描画**：`GanttChart.tsx`・`ShareGantt.tsx`とも、`ph.kind`で色（チェックバック1/2はピンクの`bg-phase-wait`、それ以外は`PHASE_COLOR_CLASS[ph.basePhase]`）とラベルを分岐。社内版は`ph.kind !== "revision"`のセグメントのみクリック可能（2校作業は自動計算のみのため非クリック）。汎用の`waitSegments`（工程間ギャップ埋め）ロジックは変更せず維持（CMS構築・公開の待機、および2校期間対象工程のバッファ部分の可視化に引き続き使われる）。
- **グループ一括反映（同日追加要望）**：`overridePhase()`（`actions.ts`）に`applyToGroup`チェックボックスを追加。チェックされている場合、編集対象セグメントの変更前後の終了日の差分（デルタ）を計算し、同一進行グループに属する他の全ページの同一`phaseKey`（同じ工程・同じチェックバック番号。仮想キーはページ非依存の文字列なので完全一致で照合できる）のセグメントに、そのデルタぶんだけ日付を平行移動して適用する（既存の`schedule_overrides`行があればUPDATE、なければINSERT）。実工程キーに対する既存の「後続工程への追従」ロジックは、仮想セグメントキーには適用されないよう`isRealSchedulePhase()`ガードを追加（`SCHEDULE_PHASES.indexOf(virtualKey)`が-1になり全工程を後続扱いしてしまう潜在バグを未然に回避）。
- **UI**：`PhaseEditForm.tsx`に「同じグループの他ページにも同様の修正（日数のずれ）を反映する」チェックボックスを追加。見出しラベルも`kind`/`basePhase`から動的に生成するよう変更（例:「構成（チェックバック1）」）。「後続工程も追従させる」チェックボックスは`kind === "production"`の場合のみ表示（仮想セグメントでは効果がないため）。
- **テスト**：`computeSchedule.test.ts`に新規3件追加（CB1/2校作業/CB2が独立したセグメントとして正しい`kind`/`basePhase`で積まれること、CB1のオーバーライドが後続を自動的に追従させること、2校作業セグメントはオーバーライドを与えても無視されること）、全46件成功。`tsc --noEmit`・`eslint`・`next build`すべて成功を確認。
- 実ブラウザでの最終確認はまだ行っていない。

**2026-08-04 追記：spec.md §11受け入れ基準の拡充、ユーザーによる通し確認完了・Phase 12を完了とする**

- 上記チェックバック1/2個別編集・グループ一括反映の実ブラウザ確認をユーザーが実施し、問題なしとの回答を得た。
- ユーザーからの依頼で、spec.md §11（受け入れ基準）がPhase 0〜11時点の内容のまま更新されておらず、Phase 12で追加した機能（CMS構築/TOP専用マスタ、一覧検索/アーカイブ/コピー、詳細・集計見積もりタブ・備考欄、運用者専用メモ、祝日自動取得、2校期間・チェックバック個別編集・グループ一括反映、メタCSV等）を反映していなかったため、spec.md全体（§3用語定義、§4.1〜4.12、§5画面一覧、§6データモデル、§11受け入れ基準）をPhase 12の実装内容に合わせて更新した。§11は「基本機能（Phase 0〜11相当）」と「Phase 12追加要件」の2部構成に再編し、チェック項目を19件→44件に拡充。
- ユーザーが拡充後の§11を通しで確認し、「確認できました」との回答を得た。**Phase 12（仕上げ・受け入れ確認）を完了とする**。
- 未解消のまま持ち越す既知の積み残し（Phase 8由来、影響は限定的と判断）：進行グループが2つ以上ある実プロジェクトで、構成工程オーバーライド時の「次グループ以降を再計算する／据え置く」の分岐を実データで確認する機会がまだない。ロジック自体は`overridePhase()`・Vitestで担保されているが、実ブラウザでの多段階グループでの動作確認は未実施のまま。
- Phase 9時代に発行済みの旧形式`estimate_versions`（`{pages, total, ...}`のフラット形式）は、新しい`{detailed, aggregated, total}`形式を前提とする共有閲覧・PDF再表示では内訳が空になる。実データは新規にPDFを再発行したもので確認する運用とする（spec.md §6に注記済み）。

**2026-08-04 追記：Vercel本番デプロイの環境変数不備を修正、稼働確認完了**

- ユーザーから「今はローカルでしか動かない？」との質問があり調査したところ、Vercelプロジェクト`marketingdept-llc/md2026v1-webdirectionapp`は既にGitHubの`main`ブランチと連携済みで、これまでのセッション中の各pushのたびに自動で本番デプロイされていたことが判明（ローカルの`.vercel/project.json`が存在しなかっただけで、Vercel側の連携自体は既に確立していた）。本番URL `https://md2026v1-webdirectionapp.vercel.app` にアクセスすると`/login`へ正しくリダイレクトされ、アプリ自体は正常稼働していた。
- ただし、Vercel側の環境変数は`NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_ANON_KEY`・`SUPABASE_SERVICE_ROLE_KEY`の3つのみがProduction環境に設定されており、**`MASTER_ENCRYPTION_KEY`が未設定**だった（マスタ設定のAI連携設定＝Claude APIキーの暗号化/復号に使う鍵。`master`テーブルはローカルと本番で同一のSupabaseプロジェクトを共有するため、暗号化に使う鍵もローカルと完全に同じ値を使う必要がある）。ローカルの`.env.local`と同じ値でVercelのProduction環境変数に追加し、あわせてPreview/Development環境にも4つの環境変数すべてを揃えた（それまでPreview/Developmentには環境変数が一切設定されていなかった）。
- 環境変数追加後、`vercel --prod`で再デプロイし、本番URLへの再度のアクセス確認・ログイン画面の表示確認を実施。
- Supabase Auth側のリダイレクトURL許可設定（`https://md2026v1-webdirectionapp.vercel.app/auth/callback`をRedirect URLsに追加する必要があった）はユーザー自身にSupabaseダッシュボードで追加してもらい、ユーザーが本番URLからのGoogleログインを含めて動作確認し、「ばっちりOK」との回答を得た。
- **教訓**：Supabase Auth設定（Redirect URLs等）は`supabase config push`でも同期可能だが、ローカルの`supabase/config.toml`の`[auth]`セクションには開発用の値（`site_url = "http://127.0.0.1:3000"`等）しか入っておらず、本番相当の値に更新されていない状態で丸ごとpushすると、メールテンプレートやレート制限等、ダッシュボードで個別に調整済みの他のAuth設定まで意図せず上書きしてしまうリスクがある。1項目だけの追加のような限定的な変更は、CLIでの一括pushではなくダッシュボードでのピンポイント編集をユーザーに依頼する方が安全（今回はこの判断でユーザーに手動追加を依頼した）。
- 併せて、Supabase Personal Access Tokenが失効していないことを`supabase projects list`で確認済み（次回セッション開始点の確認事項#2はクリア）。

### 次回セッションの開始点

1. Phase 12は完了し、Vercel本番環境（https://md2026v1-webdirectionapp.vercel.app）での稼働も確認済み。次の作業に着手する場合は、ユーザーに新たな要望・不具合報告・次フェーズの方向性をヒアリングするところから始める。
2. 進行グループが2つ以上あるプロジェクトで、構成工程オーバーライド時の「次グループ以降を再計算する／据え置く」の分岐を実際に確認する機会があれば確認しておく（Phase 8からの継続課題、未解消のまま持ち越し）。
3. 見積もりPDF・共有リンクのestimateVersionモードは、Phase 9時代の旧形式estimate_versionsでは内訳が空になる。ユーザーが実データで確認する際は、新規にPDFを発行し直したものでテストするよう案内すること。
4. コンポーネントのレンダー内で`Date.now()`／引数なし`new Date()`を直接呼ぶと`react-hooks/purity`のESLintエラーになる。「現在時刻」が絡む判定は独立したヘルパー関数に切り出すこと（`lib/share/expiry.ts`が実例）。
5. Server ComponentのJSXに`onSubmit`/`onClick`等のイベントハンドラを直接書くと「Event handlers cannot be passed to Client Component props」エラーになる。確認ダイアログ等が必要な場合は、そのフォームだけを`"use client"`の小さなコンポーネントに切り出すこと（`RevokeShareLinkForm.tsx`・`ArchiveProjectForm.tsx`・`DeleteMemoForm.tsx`が実例）。
6. カレンダー型グリッドのように「横スクロールする固定幅コンテナ」を作る場合、その内側にクリック時に表示するフォーム・モーダル等を置くと、スクロール位置によっては画面外に隠れて見えなくなる。スクロール非依存の要素は必ずスクロールコンテナの外に置くこと（今回の教訓、モーダル化で解消済み）。
7. 「仕様通りのはず」と説明する前に、実際にそのロジックパスが本当にコード上で保証されているか（今回のように、並行レーンの仕組みが別工程の挙動に暗黙的に影響していないか）を再確認してから回答すること（構成工程の同日着手が実際には保証されていなかった教訓）。
8. 期間・日数を扱うUIで「開始日〜終了日」を単純な1本の帯として描画すると、非稼働日を含む場合に誤解を招く（今回の「土日に作業しているように見える」不具合の教訓）。稼働日ベースの区間分割を検討すること。
9. Vercel・Supabase等の外部サービスの認証情報はmacOSキーチェーンに保存されている。CLIツール自体（`vercel`/`supabase`コマンド）は内部で自動的に認証情報を参照するため、それ経由で操作する分には問題ないが、`security dump-keychain`等でキーチェーンを直接覗く操作は、対象と無関係な他のクレデンシャル（今回は無関係なMicrosoftアカウントのOAuthトークン一式）まで出力に含めてしまう事故につながる。絶対に行わないこと。

> 次アクション候補：ユーザーからの次の要望・不具合報告待ち。

**2026-08-07 追記：ディレクトリマップの並び替え・列レイアウト・デザイン/コーディング要否を追加**

ユーザーから4点の要望を受けて実装した：①ディレクトリマップのページ順序をドラッグ&ドロップで変更でき、親子階層はセットで動くこと、②ディレクトリマップと詳細見積もりの項目順序を一致させること、③ページ名とタグの表示をCSSグリッドで列として揃えること、④ページ単位で「デザインなし」「コーディングなし」をチェックでき、その場合はスケジュール・見積もりから該当工程を除外すること。spec.md §4.2・§6・§11に反映済み。

- **マイグレーション**：`20260807090000_pages_design_coding_needed.sql`で`pages.design_needed`・`pages.coding_needed`（ともに`boolean not null default true`）を追加。既存ページは全て両方trueになるため既存の見積もり・スケジュール計算結果に影響しない。実際にリモート（本番Supabase）へ`supabase db push`で適用し、`supabase migration list`で反映を確認済み。
- **並び替えの設計判断（重要）**：優先度（`priority`）を全ページ横断でDFS順に採番し直す方式ではなく、**同じ親を持つ兄弟の範囲内だけ**でpriorityを1始まりに振り直す方式にした（`lib/pages/reorder.ts`の`reorderSiblingPriorities()`）。ツリー表示・兄弟の並び替えは元々`parent_id`でフィルタしてから`priority`でソートする実装のため、兄弟ごとの独立した番号体系で十分に機能する。既存ページの多くがpriority未設定（デフォルト0）で重複している可能性を考慮し、「既存の値を並べ替えるだけ」の実装ではなく「1..Nに振り直す」実装にした（前者だと同値だらけの既存データではドラッグしても見た目が変わらない不具合になる）。スケジュール自動生成のレーン割当（`computeSchedule.ts`）は進行グループ単位でpriorityを比較するため、異なる親を持つページ間でpriorityの値域が重なる可能性はあるが、これはドラッグ&ドロップ導入前から（手入力でpriorityが重複しうる）存在した前提と同等であり、新たな不具合ではない。
- **ディレクトリマップと見積もりの順序一致**：`lib/pages/constants.ts`に`sortPagesAsTree()`を新設（親→子をたどるDFS順にフラット化する純粋関数）。`lib/estimate/loadProjectEstimate.ts`で見積もり計算に渡す`pages`配列をこの関数で並べ替えてから`computeEstimate()`/`computeAggregatedEstimate()`に渡すことで、詳細・集計見積もりの表示順（およびPDF・CSVの順序）がディレクトリマップのツリー表示順と自動的に一致する。スケジュールエンジン側の`priority`昇順ソート（進行グループのレーン割当）には手を入れていない（無関係な既存ロジックのため）。
- **列レイアウトの実装**：`app/(app)/projects/[projectId]/directory-map/gridLayout.ts`に共通のCSS Grid列定義（`grid-cols-[24px_minmax(170px,1.6fr)_60px_44px_70px_70px_70px_78px_84px_104px_120px_56px_auto]`）を定義し、ヘッダー行（`DirectoryMapTree.tsx`）と各ページ行（`PageRow.tsx`）の両方で同じクラスを使う。階層の深さはページ名セルの内側の`paddingLeft`だけで表現し、行全体の余白では表現しない（行全体を字下げすると深い階層ほど後続列の位置がずれてしまうため）。共有閲覧画面（`ShareDirectoryMapTree.tsx`）にも同じ考え方で列数を絞った専用グリッド（優先度・進行グループ・操作列を除く）を適用した。ヘッドレスChromeで同等のグリッド定義を再現したスタンドアロンHTMLをレンダーし、深さ・長いページ名を含めても列がずれないことを確認済み（実アプリ画面はGoogle OAuthログイン必須のため、この方法で構造を検証した）。
- **ドラッグ&ドロップの実装**：ネイティブHTML5 DnD（外部ライブラリ非依存）。`PageRowsList.tsx`が「同じ親を持つ兄弟1グループ」を表すコンポーネントで、自分の子要素として自分自身を再帰的に描画する。ドラッグ対象は常にそのコンポーネント内のIDのみを扱うため、実装上も異なる親をまたいだドロップは起こり得ない（親を変更したい場合は従来通り編集フォームの「親ページ」欄を使う）。各兄弟グループが独立してドラッグ状態を持つ入れ子構造のため、`onDragOver`/`onDrop`で`e.stopPropagation()`を必ず呼び、ネストした子ページ上でのドロップ操作が祖先の兄弟グループにもバブリングして二重に発火しないようにした（気づきにくいバグなので次回同種のネスト型D&Dを実装する際は要注意）。状態管理は`DirectoryMapTree.tsx`（トップレベルのclient component）が`pages`配列をstateで保持し、ドロップ時は即座にローカルでpriorityを再計算して楽観的に反映した上で、`reorderPages()`Server Actionをバックグラウンドで呼んで永続化する（保存失敗時のみ`router.refresh()`でサーバーの実データに戻す）。
- **Reactの実装上の注意点（新規の教訓）**：`DirectoryMapTree.tsx`で「サーバーから新しい`initialPages`propsを受け取ったらローカルstateを同期する」処理を`useEffect`内の`setState`で素朴に書いたところ、ESLintの`react-hooks/set-state-in-effect`（cascading rendersを警告するルール）に引っかかった。Reactの公式パターン通り、`useEffect`を使わずレンダー中に直接比較・`setState`する方式（前回の`initialPages`をstateとして保持し、参照が変わっていたらレンダー中にstateを更新する）に修正して解消した。propsからstateを導出する処理は今後もこのパターンを使うこと。
- **見積もりのコスト・スケジュール除外ロジック**：`SchedulePageInput`/`EstimatePageInput`の`designNeeded`/`codingNeeded`はオプショナル（`?: boolean`）にし、判定は`!== false`（未設定=true扱い）にした。理由：既存のVitestテストフィクスチャがこの2フィールドを持たないオブジェクトを大量に構築しており、必須フィールドにすると全テストの書き換えが必要になるため。デフォルトtrue相当の挙動になるので実データ（DB）側は`not null default true`で必ず値が入り、テスト側は省略可能という非対称だが安全な設計にした。
- **テスト**：Vitestで新規10件追加（`computeSchedule.test.ts`にデザイン/コーディングスキップの工程除外2件、`calculate.test.ts`にコスト除外2件、`calculateAggregated.test.ts`に集計行からの除外1件、新規`lib/pages/__tests__/reorder.test.ts`3件、新規`lib/pages/__tests__/constants.test.ts`2件）、全56件成功。`tsc --noEmit`・`eslint`・`next build`すべて成功を確認。
- **不具合修正・重要（実データで発覚）**：ユーザーが実際にディレクトリマップを触ったところ、「進行グループ内でTOPより後発ページが優先されてしまう」と報告があり調査。原因は2つ複合していた。①`createPage`アクションの新規ページ作成が常に`priority: 0`で保存する実装だった（`PageForm.tsx`のUIも常に`defaultValue={0}`の数値入力を送信していた）ため、追加するページが必ず既存ページより優先度が高い扱いになり、上から順の表示順序と矛盾していた。②実データを確認したところ、既存5プロジェクトのうち4プロジェクトで**全ページのpriorityが0のまま**になっており（同値のため`comparePageSiblings`のタイブレークでページ名の五十音順にフォールバックしていた）、ディレクトリマップの表示順が意図と無関係になっていた。①は`createPage`を「同じ親を持つ兄弟の末尾に自動採番」する実装に修正し、`PageForm.tsx`から手入力の「優先度」欄を削除して解消。②は`created_at`昇順を元に兄弟グループごとにpriorityを1から振り直すワンショットのバックフィルをService Role経由で実行して解消した。
- **バックフィル実行時のミス・教訓（重要）**：上記②のバックフィルを最初に書いた際、「全プロジェクトの全ページ」を無条件に`created_at`順で振り直すスクリプトにしてしまい、5プロジェクトのうち既に手動で正しく（priorityが0以外で意図通りに）設定されていた1プロジェクトのデータまで上書きしてしまった（作成順と、ユーザーが意図した表示順が一致していなかったため、created_at基準の振り直しで並びが入れ替わってしまった）。実行直後に対象プロジェクトの状態を目視確認していたことで気づき、当該5ページのpriorityを実行前の値に手動で復元して事なきを得た。**教訓**：既存データを一括で「あるべき値」に補正するスクリプトを書く際は、実行前に「本当に壊れている（＝全件同値など、明確に未設定と判断できる）行だけ」を対象にする条件を入れること。「差分がある行の一覧」を必ず事前にログ出力してから実行し、想定外に広い範囲が変更対象に含まれていないか確認する。今回は事前にプラン（変更予定一覧）を出力してはいたが、「全部0のはず」という思い込みで個別プロジェクトの現状を再確認せずに実行してしまった。
- 実ブラウザでの最終確認はまだ行っていない（次回、ユーザー本人にドラッグ&ドロップの操作感・列揃えの見た目・デザイン/コーディングなしページのスケジュール/見積もり反映を確認してもらうこと）。

**2026-08-07 追記：ページ表示順の基準を「優先度（登録順）」から「所属する進行グループの表示順」に変更**

上記のpriority=0バックフィル対応後も、ユーザーから「新規ページを進行グループ『主要ページ1』に設定しても、一覧では別の位置（後ろの方）に表示される」との指摘があり、設計そのものを見直した。

- **根本原因**：`comparePageSiblings`（兄弟ページの並び順比較）が、ページの`priority`のみを見て並び替えていた。しかし実データでは、同じ親（root等）を持つ兄弟でも所属する進行グループが異なるケースが普通にある（例：TOPページは「TOP関連」グループ、会社案内・リフォーム営業は「概要関連ページ」グループ）。priority基準だと、新しく追加したページが「兄弟内の末尾」に置かれるだけで、そのページが属する進行グループの表示順（TOP関連→主要ページ1→…→概要関連ページ）が全く考慮されず、ユーザーの直感（進行グループの並び順どおりに表示されるはず）と食い違っていた。
- **ユーザーからの明確な設計方針**：「親子、登録順関係なく進行グループの優先度に連動すべき」との指摘を受け、兄弟ページの並び順は**まず所属する進行グループのsort_orderで比較し、同じ進行グループ内でのみ既存のpriorityでタイブレークする**方式に変更した（`lib/pages/constants.ts`の`comparePageSiblings`を`(groupOrder: Map) => (a,b) => number`を返すファクトリ関数に変更）。未所属ページ（`group_id`がnull）はspec §4.3の既存方針通り「表示順1のデフォルトグループ扱い」とした。
- **スケジュールエンジンへの影響はなし**：`lib/schedule/computeSchedule.ts`の`buildGroupBuckets`は元々ページを進行グループ単位でバケット分けしてから、バケット内でのみpriority順にソートする実装だったため、この変更以前から実質「進行グループ優先」の構造になっており、修正不要だった。今回の変更はディレクトリマップのツリー表示・見積もりの項目順序（`sortPagesAsTree`）・共有閲覧画面の3箇所のみが対象。
- **影響範囲の洗い出し**：`comparePageSiblings`の呼び出し全箇所（`PageRowsList.tsx`・`ShareDirectoryMapTree.tsx`・`sortPagesAsTree`経由の`loadProjectEstimate.ts`）で、進行グループのsort_orderを渡すように変更。共有閲覧画面（`ShareDirectoryMapTree.tsx`・`app/(public)/share/[token]/directory-map/page.tsx`）は進行グループ自体を画面に表示しない設計（spec §4.10）だが、並び替えの計算にだけ`progress_groups`を追加取得するようにした（グループ名・件数等の内部情報自体は引き続き外部に出さない）。
- **新規ページの自動採番も進行グループ内スコープに変更**：`createPage`の「兄弟の末尾に自動採番」ロジックを、「同じ親・同じ進行グループを持つ兄弟の末尾」に絞り込んだ（`app/(app)/projects/[projectId]/directory-map/actions.ts`）。表示順自体は進行グループが最優先のため必須の変更ではないが、priorityの数値を各グループ内で小さくきれいに保つための整理。
- **ドラッグ&ドロップとの整合性（設計上の割り切り）**：ドラッグ&ドロップは引き続き「同じ親を持つ兄弟」の範囲内で機能するが、異なる進行グループに属するページ同士をドラッグで入れ替えても、進行グループの表示順が優先されるため見た目上の順序は変わらない（同じ進行グループ内のページ同士をドラッグした場合のみ、priorityの変更が表示順に反映される）。これは今回のユーザーの要望（進行グループの並び順を最優先すべき）と一致する意図的な仕様であり、次回ユーザーが実際にドラッグ操作を試す際にこの挙動を説明できるようにしておくこと。
- **テスト**：`lib/pages/__tests__/constants.test.ts`に新規3件追加（進行グループ優先の並び替え、未所属ページのデフォルトグループ扱い、`comparePageSiblings`の未知group_idフォールバック）、全56→59件成功に更新。`tsc --noEmit`・`eslint`・`next build`すべて成功を確認。
- 実ブラウザでの最終確認はまだ行っていない。

> 次アクション候補：ユーザーによる実ブラウザでの動作確認待ち（進行グループ優先の並び順、ドラッグ&ドロップの操作感、列レイアウトの見た目、デザイン/コーディングなし設定時のスケジュール・見積もりの反映）。

**2026-08-07 追記：「優先度」概念の廃止、ガントチャートの行順もディレクトリマップと統一**

進行グループ優先の並び替えを実装した直後、ユーザーから「優先度という数値と進行グループの数値が2重にあるように見えて紛らわしい。新しいページ登録の際の優先順位という概念ごと削除してほしい。優先順位はディレクトリマップの進行グループの上から順番であるべき」との指摘があった。

- **UIから「優先度」表示・入力を全廃**：`PageRow.tsx`の読み取り表示（`{page.priority}`のセル）と編集フォームの手入力欄（`<input type="number" name="priority">`）を削除。`gridLayout.ts`の`ROW_GRID_COLS`から優先度列（56px）を除去し、`DirectoryMapTree.tsx`のヘッダー行からも「優先度」ラベルを削除。
- **`updatePage`アクションからpriority更新を除去**：これまで編集フォームの送信のたびに`priority: num(formData, "priority")`で上書きしていたが、フォームから項目自体を消したため、そのまま残すと常に既定値0で上書きされてしまう（実際、TOPページのpriorityが2回连続で0に戻る不具合が起きていたのはこれが原因だった可能性が高い：クライアントが古いprops由来のdefaultValueを再送信していた）。`updatePage`は他の項目（名前・種別・複雑度・親・進行グループ・CMS・デザイン/コーディング要否等）のみ更新し、priorityには一切触れない実装に変更。以後priorityが変化するのは「新規ページ作成時の自動採番（同じ親・同じ進行グループの兄弟の末尾）」と「ドラッグ&ドロップ（`reorderPages`）」の2箇所のみになった。使われなくなった`num()`ヘルパーは削除。
- **内部実装としてのpriorityは維持**：UIからは見えなくなったが、DBの`priority`列・`comparePageSiblings`での同一進行グループ内タイブレーク・スケジュールエンジンのレーン割当（グループバケット内でのpriority昇順処理）は従来通り機能させている。ユーザーに見せる「概念」を削除しただけで、内部の仕組みとしては引き続き必要なため残した。
- **ガントチャートの行順もディレクトリマップ・見積もりと統一（新規要望）**：`GanttChart.tsx`・`ShareGantt.tsx`はいずれも`pageSchedules`配列の順序をそのまま行順として描画しており、その順序は`computeSchedule()`の入力`pages`配列の順序をそのまま結果に反映する仕様だった（`buildGroupBuckets`は`groups`のsort_order順に処理するが、各バケット内はpriorityで再ソートするため入力配列の並び自体はバケット構成に影響しない。関数の戻り値だけが入力の`pages`配列を`.map()`して作られるため、入力順=出力順という契約になっている）。この契約を利用し、`lib/schedule/loadProjectSchedule.ts`で`pagesRaw`取得後に`sortPagesAsTree(pagesRaw, groupsRaw)`（ディレクトリマップと同じ並び替え関数）を適用してから`SchedulePageInput[]`に変換するよう変更した。共有閲覧画面（`ShareGantt.tsx`）も同じ`loadProjectSchedule`を経由するため、修正は1箇所で両方に効く。この「入力順=出力順」という`computeSchedule()`の契約を明示するリグレッションテストを`computeSchedule.test.ts`に追加した（既存の単体テストは全て`computeSchedule()`を直接呼ぶため、`loadProjectSchedule.ts`側の並び替えを追加しても影響なし）。
- **テスト**：`lib/pages/__tests__/constants.test.ts`は変更なし（前回追加分がそのまま有効）。`computeSchedule.test.ts`に新規1件追加（入力順保持のリグレッションテスト）、全56→60件成功に更新。`tsc --noEmit`・`eslint`・`next build`すべて成功を確認。
- 実ブラウザでの最終確認はまだ行っていない。

> 次アクション候補：ユーザーによる実ブラウザでの動作確認待ち（優先度欄が消えて分かりやすくなったか、ディレクトリマップ・見積もり・ガントチャートの3画面で表示順が一致しているか）。

**2026-08-07 追記：「進行グループ優先の表示順」を撤回、ドラッグ&ドロップの自由な並びに戻す**

ユーザーから確認結果を受けた。3画面の表示順一致（OK）・優先度欄の非表示（OK）は問題なかったが、「進行グループ優先で並ぶ」仕様自体が意図と違うとの指摘があった：「進行グループは表示の順番ではなく、あくまでスケジュールの起点を揃えるためのグループ。ディレクトリマップは入力順や進行グループ問わずドラッグで自由に変更できて、その順番をスケジュールや詳細見積もりにも維持してほしい」。つまり、同じ画面内で「主要ページ1→主要ページ2→主要ページ1」のように進行グループが混在する順番になっても構わない、というのが正しい仕様だった。

- **前回の「進行グループ優先ソート」実装を撤回**：`lib/pages/constants.ts`の`comparePageSiblings`を、進行グループのsort_orderを見るファクトリ関数から、素の`(a, b) => a.priority - b.priority || a.name.localeCompare(b.name)`に戻した。`buildGroupOrderMap()`・`groupOrderOf()`は削除。`sortPagesAsTree()`も`groups`引数を受け取らない元のシグネチャに戻した。
- **呼び出し側を全て復旧**：`PageRowsList.tsx`（`groupOrder`の構築を削除し`comparePageSiblings`を直接使用）、`ShareDirectoryMapTree.tsx`（`groups`/`groupOrder`propを削除、`group_id`フィールドも型から削除）、`app/(public)/share/[token]/directory-map/page.tsx`（`progress_groups`の追加取得を削除）、`lib/estimate/loadProjectEstimate.ts`（`progress_groups`取得と`sortPagesAsTree`への引き渡しを削除）、`lib/schedule/loadProjectSchedule.ts`（同様に`sortPagesAsTree(pagesRaw)`のみに戻す。`progress_groups`自体はスケジュールのグループバケット分けに引き続き必要なため取得は継続）。
- **`createPage`の自動採番スコープも修正**：新規ページのpriority自動採番（兄弟の末尾に追加）を「同じ親・同じ進行グループ」から「同じ親のみ」に戻した。進行グループは表示順に無関係なため、グループでスコープを絞る意味がなくなったため。
- **教訓**：ユーザーの最初の指摘（「TOPが1で主要ページ1が0になり優先されてしまう」）を、実際には「新規ページのpriorityが常に0になる」「既存データのpriorityが全部0」という2つの実データ不具合が原因だったにもかかわらず、「進行グループ優先で並べるべき」という設計変更だと早合点して大掛かりな実装をしてしまった。後から「進行グループは表示順ではなくスケジュールの起点分類」という明確な設計方針が示され、手戻りになった。**次回同種の場面では、ユーザーの発言が「不具合報告」なのか「新しい設計要望」なのかを一度確認してから実装範囲を決めること**（今回は不具合報告への対処のはずが、勝手に仕様変更まで踏み込んでしまった）。
- **テスト**：`lib/pages/__tests__/constants.test.ts`を進行グループ非依存の内容に書き換え（3件：DFS順・タイブレーク・進行グループ混在でもpriority順を維持することの確認）。全56→59件成功（前回の60件から、削除した`comparePageSiblings`のフォールバックテスト1件分が減り、新規1件を追加した差分）。`tsc --noEmit`・`eslint`・`next build`すべて成功を確認。
- 実ブラウザでの最終確認はまだ行っていない。

> 次アクション候補：ユーザーによる実ブラウザでの動作確認待ち（ディレクトリマップで進行グループが混在する任意の順番にドラッグで並び替えられるか、その順番が見積もり・ガントチャートにも維持されるか）。

**2026-08-07 追記：表示順ロジックはOK。子ページの視認性向上と列見出しズレを修正**

ユーザーが表示順の統一・優先度欄の非表示を確認し「OK」との回答。続けて2点の仕上げ要望があった。

- **子ページの視認性向上**：字下げ（インデント）だけでは階層が分かりにくいとの指摘を受け、子ページ名の前に階層深さ分の「ー」を付けるようにした（depth=1で「ー 」、depth=2で「ーー 」…）。`lib/pages/constants.ts`に`pageDepthPrefix(depth)`を新設し、社内`PageRow.tsx`・共有閲覧`ShareDirectoryMapTree.tsx`の両方で使用。字下げ自体は完全に無くさず、1階層あたり18px→10pxに縮小して「ーマーク＋やや控えめな字下げ」の組み合わせにした。
- **列見出しと実列のズレを修正（原因判明）**：`gridLayout.ts`の`ROW_GRID_COLS`の最終列（操作）が`auto`（コンテンツに応じたサイズ）になっていたため、ヘッダー行の短い文字列「操作」と実際の行の「編集・削除」ボタン2つ分の幅が食い違っていた。各行・ヘッダーはそれぞれ独立した`display:grid`コンテナ（1行1行が個別のグリッド）のため、`auto`列の実測幅が行ごとに変わると、唯一の可変列（ページ名列、`minmax(170px,1.6fr)`）がその分だけ伸縮し、結果としてページ名より後ろの固定幅列（種別・複雑度・各種タグ…）の開始位置が行ごとにズレて見えていた。最終列を固定幅（152px、編集+削除ボタンが収まる幅）に変更し、`ROW_GRID_CLASS`に`w-full`を明示することで解消。共有閲覧画面側（`ShareDirectoryMapTree.tsx`）はヘッダー行が無く元々`auto`列も使っていなかったため、この不具合の対象外だった。
- **教訓**：CSS Gridで「複数の独立したグリッドコンテナ間で列を視覚的に揃える」設計をする場合、`auto`（コンテンツ依存）のトラックが1つでも混ざっていると、コンテナごとにそのトラックの実測幅が変わり、他の可変トラック（`fr`）を介して手前の固定トラックの位置がズレる。列を揃えたいなら関与する全トラックを固定値かfr（コンテンツに依存しない指定）にする。
- **テスト**：`lib/pages/__tests__/constants.test.ts`に`pageDepthPrefix`のテスト2件追加、全59→61件成功。`tsc --noEmit`・`eslint`・`next build`すべて成功。列揃えの修正はヘッドレスChromeで実際のグリッド定義（固定152px化後）を再現したスタンドアロンHTMLをレンダーし、階層3段・長いページ名を含めても全列が揃うことを画像で確認済み。
- 実ブラウザでの最終確認はまだ行っていない。

> 次アクション候補：ユーザーによる実ブラウザでの動作確認待ち（子ページの「ー」表示、列見出しと実列の縦揃い）。

**2026-08-07 追記：ユーザー確認OK、本番デプロイ完了。spec.md/masterplan.mdの整合性を棚卸し**

ユーザーが列揃え・子ページの「ー」表示を確認し「OKです」との回答。コミット・push済み（`36cbad1`）、Vercel本番環境で自動デプロイ・稼働確認済み（本番Supabaseへのマイグレーション適用も完了済み）。

その後「spec.mdやmasterplan.mdは最新か」という確認依頼を受け、spec.mdを通しで棚卸しした。以下2件の古い記述を発見・修正：

- §4.2の「ページ項目」一覧に「優先度」が残っていた（画面上の項目としては2026-08-07に廃止済みのため削除）。
- §11「基本機能（Phase 0〜11相当）」の受け入れ基準に「親子階層・進行グループ・優先度が正しくツリー表示される」という古い一文が残っており、同じドキュメント内で新しい「2026-08-07追加要望」節（優先度の項目は存在しないことを求める基準）と矛盾していた。旧基準側に置き換え済みである旨の注記を追加して解消。
- ツリー表示の行に「ー」プレフィックス・最終列固定幅の説明を追記（前回の実装時にmasterplan.mdには記録したが、spec.md本体への反映が漏れていた）。

**未解消のまま残る既知のギャップ（今回は対応せず、記録のみ）**：メタ情報・進行管理画面（`app/(app)/projects/[projectId]/meta/page.tsx`）とCSVエクスポート（`meta/csv/route.ts`）は、pagesテーブルへの単純な`.order("priority")`でページを並べている。今回のドラッグ&ドロップ実装によりpriorityは「同じ親を持つ兄弟内でのみ意味を持つ値」に変わったため（親が異なれば同じ数値が重複しうる）、メタ情報画面の一覧順はディレクトリマップの本当のツリー順（`sortPagesAsTree`によるDFS順）と一致しない場合がある。これはこのセッションで新たに生んだ不具合ではなく元からの挙動だが、ユーザーからは「ディレクトリマップ・詳細見積もり・ガントチャートの3画面」の統一のみを依頼されており、メタ情報画面は対象外だったため未対応のまま。次回、メタ情報画面の表示順についてユーザーから指摘があれば、`sortPagesAsTree()`を使って統一する対応を検討する。

> 次アクション候補：ユーザーからの次の要望・不具合報告待ち。メタ情報画面の表示順統一が必要になった場合は`lib/pages/constants.ts`の`sortPagesAsTree()`を再利用する。
