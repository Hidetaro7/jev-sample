// Jev 最小サンプル（Web画面版）：ブラウザで文章を入力して仕分ける
// 実行方法:  npm run web  →  ブラウザで http://localhost:3000 を開く

import { createServer } from "node:http";
import { TypeSafeClient, noul, choice, score } from "@typesafe-ai/sdk";

const jev = new TypeSafeClient();

// 質問カード（index.js と同じ内容）
const questions = {
  kind: choice("`inquiry` はどんな種類の連絡ですか？", {
    request: "制作・デザインの仕事の依頼や見積もり相談",
    sales: "こちらに何かを売り込む営業メール",
    recruit: "採用への応募や、働きたいという連絡",
    other: "上のどれにも当てはまらない、または情報不足",
  }),
  wantsLogo: noul("`inquiry` はロゴやブランドづくりを求めていますか？"),
  wantsWebsite: noul("`inquiry` はWebサイトの制作や改修を求めていますか？"),
  isSales: noul(
    "`inquiry` は、送り主が自社の商品やサービスをこちらに売り込む営業メールですか？",
  ),
  urgency: score("`inquiry` への返信はどのくらい急ぎですか？", [
    "急ぎではない。期限の記載がない",
    "数週間以内に返事がほしい様子",
    "今週中など、すぐに返事が必要",
  ]),
};

// 入力された文章をJevに聞いて、結果を1つのテキストにまとめる
async function judge(inquiry) {
  const { answers } = await jev.systemOne({ state: { inquiry }, questions });
  const pct = (n) => Math.round(n * 100) + "%";

  let next = "→ 判断があいまい。人が目で確認する";
  if (answers.kind.choice === "request" && answers.kind.confidence > 0.7) {
    next = answers.urgency.score >= 1.5 ? "→ 今日中に返信する" : "→ 通常の返信リストへ";
  }

  return [
    `種類          : ${answers.kind.choice}（自信 ${pct(answers.kind.confidence)}）`,
    `ロゴ希望      : ${pct(answers.wantsLogo.noul)}`,
    `Web希望       : ${pct(answers.wantsWebsite.noul)}`,
    `セールス可能性: ${pct(answers.isSales.noul)}`,
    `緊急度        : ${answers.urgency.score} / 2`,
    next,
  ].join("\n");
}

// 画面のHTML。入力欄と送信ボタン、その下に結果のテキストを出すだけ
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const page = (inquiry = "", result = "") => `<!doctype html>
<meta charset="utf-8">
<title>Jev サンプル</title>
<form method="post">
  <p><textarea name="inquiry" rows="8" cols="60" required>${esc(inquiry)}</textarea></p>
  <p><button>判定する</button></p>
</form>
<pre>${esc(result)}</pre>`;

// サーバー本体：画面を開いたら入力欄を、送信されたら結果つきの画面を返す
createServer(async (req, res) => {
  let inquiry = "";
  let result = "";

  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    inquiry = new URLSearchParams(body).get("inquiry") ?? "";
    try {
      result = await judge(inquiry);
    } catch (e) {
      result = "エラー: " + e.message;
    }
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page(inquiry, result));
}).listen(3000, () => console.log("http://localhost:3000 を開いてください"));
