// Jev 最小サンプル（入力中に反応するフォーム）
// 実行方法:  npm run live  →  ブラウザで http://localhost:3000 を開く
// 打つのを少し止めるたびに、文章がトンマナ（文体のルール）に合っているかをJevが採点します

import { createServer } from "node:http";
import { TypeSafeClient, noul } from "@typesafe-ai/sdk";

const jev = new TypeSafeClient();

// ① トンマナのルール。ここを書き換えると、自分のルールで採点できます
//    label = 画面に出す名前 / ask = Jevへの質問（「はい」＝守れている）/ hint = 守れていないときに出す一言
const rules = [
  {
    label: "です・ます調",
    ask: "`text` は最後まで「です・ます」調で書かれていますか？",
    hint: "文末を「です・ます」にそろえましょう",
  },
  {
    label: "やさしい言葉",
    ask: "`text` は専門用語や難しいカタカナ語を使わず、中学生にも分かる言葉で書かれていますか？",
    hint: "専門用語を、ふだんの言葉に言い換えましょう",
  },
  {
    label: "やわらかさ",
    ask: "`text` は読み手を責めたり見下したりしない、やわらかい言い方になっていますか？",
    hint: "相手を責めているように読めます。言い方をやわらげましょう",
  },
  {
    label: "短い文",
    ask: "`text` の文は、どれも短く区切られていて読みやすいですか？",
    hint: "一文が長いようです。途中で区切りましょう",
  },
];

// ② 文章をJevに渡して、ルールごとの結果を1つのテキストにまとめる
async function judge(text) {
  const questions = Object.fromEntries(rules.map((r, i) => ["q" + i, noul(r.ask)]));
  const { answers } = await jev.systemOne({ state: { text }, questions });

  return rules
    .map((r, i) => {
      const p = answers["q" + i].noul; // 0〜1。「守れている」確率
      const bar = "█".repeat(Math.round(p * 10)).padEnd(10, "░");
      const line = `${bar} ${String(Math.round(p * 100)).padStart(3)}%  ${r.label}`;
      return p < 0.6 ? `${line}\n      → ${r.hint}` : line;
    })
    .join("\n");
}

// ③ 画面。入力欄と結果の表示だけ。打つのが0.4秒止まったら、文章をサーバーに送る
const page = `<!doctype html>
<meta charset="utf-8">
<title>Jev 入力中に反応するフォーム</title>
<p><textarea id="text" rows="8" cols="60" placeholder="ここに文章を打ってみてください"></textarea></p>
<pre id="result"></pre>
<script>
  const text = document.getElementById("text");
  const result = document.getElementById("result");
  let timer;
  let latest = 0; // 何番目の問い合わせか。古い返事で新しい結果を上書きしないための番号

  text.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (text.value.trim() === "") { result.textContent = ""; return; }
      const mine = ++latest;
      const res = await fetch("/judge", { method: "POST", body: text.value });
      const body = await res.text();
      if (mine === latest) result.textContent = body;
    }, 400);
  });
</script>`;

// ④ サーバー本体： / は画面、 /judge は採点結果のテキストを返す
createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/judge") {
    let text = "";
    for await (const chunk of req) text += chunk;
    let result;
    try {
      result = await judge(text);
    } catch (e) {
      result = "エラー: " + e.message;
    }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(result);
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page);
}).listen(3000, () => console.log("http://localhost:3000 を開いてください"));
