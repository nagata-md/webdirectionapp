import type { AnthropicTool } from "./claudeClient";
import { pageTypeLabel } from "@/lib/pages/constants";

export type MetaGenPageInput = {
  id: string;
  name: string;
  type: string;
  parentName: string | null;
  priority: number;
};

export const META_GEN_TOOL: AnthropicTool = {
  name: "submit_meta_info",
  description: "各ページのSEOメタ情報を提出する",
  input_schema: {
    type: "object",
    properties: {
      pages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pageId: { type: "string", description: "対象ページのID（入力にあるものをそのまま使う）" },
            slug: { type: "string", description: "URLスラッグ（半角英数とハイフンのみ）" },
            title: { type: "string", description: "TITLEタグ（全角30〜35文字程度を目安）" },
            description: { type: "string", description: "メタディスクリプション（全角100〜120文字程度）" },
            keywords: { type: "string", description: "キーワード（カンマ区切りで3〜5個程度）" },
          },
          required: ["pageId", "slug", "title", "description", "keywords"],
        },
      },
    },
    required: ["pages"],
  },
};

export function buildMetaGenPrompt(instruction: string, pages: MetaGenPageInput[]) {
  const system =
    "あなたはSEOに詳しいWebディレクターのアシスタントです。指示された方向性・トーンに沿って、" +
    "各ページのURLスラッグ・TITLE・ディスクリプション・キーワードを日本語で提案してください。" +
    "ページ本文やデザインの提案は不要です。あくまでメタ情報のみを提案してください。";

  const pageList = pages
    .map(
      (p) =>
        `- pageId: ${p.id} / ページ名: ${p.name} / 種別: ${pageTypeLabel(p.type)} / 親ページ: ${
          p.parentName ?? "なし"
        } / 優先度: ${p.priority}`,
    )
    .join("\n");

  const userMessage = `【サイト全体の方向性・トーン】\n${instruction}\n\n【対象ページ一覧】\n${pageList}\n\n上記の全ページについて、submit_meta_info ツールでメタ情報を提出してください。`;

  return { system, userMessage };
}
