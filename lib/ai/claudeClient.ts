import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";

const DEFAULT_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// マスタ設定のai_api_key(暗号化済み)をService Role経由で復号し、Claude APIを呼び出す。
// 復号したキー・呼び出し結果はこの関数の外（DBの永続化や画面表示）に生の形で漏らさないこと。
async function getAiCredentials(): Promise<{ apiKey: string; model: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("master").select("ai_api_key, ai_model").single();

  if (error || !data?.ai_api_key) {
    throw new Error(
      "Claude APIキーが未設定です。マスタ設定画面の「AI連携設定」から登録してください。",
    );
  }

  return {
    apiKey: decrypt(data.ai_api_key as string),
    model: data.ai_model || DEFAULT_MODEL,
  };
}

export type AnthropicTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export async function callClaudeForStructuredOutput<T>(params: {
  system: string;
  userMessage: string;
  tool: AnthropicTool;
  maxTokens?: number;
}): Promise<T> {
  const { apiKey, model } = await getAiCredentials();

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      messages: [{ role: "user", content: params.userMessage }],
      tools: [params.tool],
      tool_choice: { type: "tool", name: params.tool.name },
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`Claude APIの呼び出しに失敗しました（HTTP ${response.status}）: ${bodyText}`);
  }

  const json = await response.json();
  const toolUse = (json.content as Array<{ type: string; name?: string; input?: unknown }>)?.find(
    (block) => block.type === "tool_use" && block.name === params.tool.name,
  );

  if (!toolUse?.input) {
    throw new Error("Claude APIから構造化データを取得できませんでした");
  }

  return toolUse.input as T;
}
