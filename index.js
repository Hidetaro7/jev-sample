// Jev 最小サンプル：届いた「お問い合わせ」を仕分ける
// 実行方法:  node --env-file=.env index.js

import { TypeSafeClient, noul, choice, score } from "@typesafe-ai/sdk";

// APIキーは .env の TYPESAFE_API_KEY から自動で読み込まれます
const jev = new TypeSafeClient();

// ① state ＝ Jevに「見せる材料」。ここを書き換えて遊んでみてください
const state = {
  inquiry:
    "御社のようなデザイン会社様と一緒にお仕事がしたく、ご連絡しました。弊社は中小企業向けの集客支援をしており、制作パートナーを募集しています。ご登録いただくと、弊社のお客様からの制作案件をご紹介できます。まずは資料をお送りしてもよろしいでしょうか。",
};

// ② questions ＝ 材料についての「質問カード」。型は3種類だけ
const questions = {
  // choice：選択肢から1つ選ばせる
  kind: choice("`inquiry` はどんな種類の連絡ですか？", {
    request: "制作・デザインの仕事の依頼や見積もり相談",
    sales: "こちらに何かを売り込む営業メール",
    recruit: "採用への応募や、働きたいという連絡",
    other: "上のどれにも当てはまらない、または情報不足",
  }),

  // noul：はい／いいえ を「確率」で答えさせる（0〜1）
  wantsLogo: noul("`inquiry` はロゴやブランドづくりを求めていますか？"),
  wantsWebsite: noul("`inquiry` はWebサイトの制作や改修を求めていますか？"),
  isSales: noul(
    "`inquiry` は、送り主が自社の商品やサービスをこちらに売り込む営業メールですか？",
  ),

  // score：段階評価。0番目から順に「ものさしの目盛り」を書く
  urgency: score("`inquiry` への返信はどのくらい急ぎですか？", [
    "急ぎではない。期限の記載がない",
    "数週間以内に返事がほしい様子",
    "今週中など、すぐに返事が必要",
  ]),
};

// ③ 聞く（質問は何個あっても1回の呼び出しでまとめて答えが返る）
const { answers } = await jev.systemOne({ state, questions });

// ④ 答えを使う。文章ではなく「決まった形のデータ」で返ってくるのがJevの特徴
const pct = (n) => Math.round(n * 100) + "%";

console.log(
  "種類        :",
  answers.kind.choice,
  `（自信 ${pct(answers.kind.confidence)}）`,
);
console.log("ロゴ希望    :", pct(answers.wantsLogo.noul));
console.log("Web希望     :", pct(answers.wantsWebsite.noul));
console.log("セールス可能性:", pct(answers.isSales.noul));
console.log("緊急度      :", answers.urgency.score, "/ 2");

// ⑤ 答えをもとに、次の動きを自分のルールで決める
if (answers.kind.choice === "request" && answers.kind.confidence > 0.7) {
  console.log(
    answers.urgency.score >= 1.5
      ? "→ 今日中に返信する"
      : "→ 通常の返信リストへ",
  );
} else {
  console.log("→ 判断があいまい。人が目で確認する");
}

//console.dir(answers, { depth: null });
