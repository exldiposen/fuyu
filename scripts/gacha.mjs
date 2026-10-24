#!/usr/bin/env node
/**
 * 抽卡：按 docs/design/cg-shots.json 的清单调用 Pollinations 免费接口。
 * 免费档限流 1 张 / 45 秒 / IP，脚本自动间隔；已存在的草稿自动跳过。
 * 草稿存 assets/cg/drafts/，并刷新 docs/design/cg-drafts.html 供人工挑图。
 *
 *   node scripts/gacha.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shotsFile = join(root, "docs/design/cg-shots.json");
const draftsDir = join(root, "assets/cg/drafts");
const reviewFile = join(root, "docs/design/cg-drafts.html");
const GAP_MS = 48_000;

// 全部 CG 共享的风格尾巴：色温、光线、质感统一由此保证
const STYLE_TAIL =
  "cold blue fog, dark fantasy, muted desaturated palette, single warm light source, " +
  "cinematic composition, painterly anime style, no text, no watermark";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pull(url, file, tries = 2) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 5000) {
          writeFileSync(file, buf);
          return true;
        }
        console.log(`    异常小响应（${buf.length}B）`);
      } else {
        console.log(`    HTTP ${res.status}`);
      }
    } catch (error) {
      console.log(`    网络错误：${error.message}`);
    }
    if (attempt < tries) await sleep(50_000);
  }
  return false;
}

const shots = JSON.parse(readFileSync(shotsFile, "utf8"));
mkdirSync(draftsDir, { recursive: true });

let made = 0;
let skipped = 0;
let failed = 0;

for (const shot of shots) {
  if (shot.skip) continue;
  for (const seed of shot.seeds) {
    const name = `${shot.id}-s${seed}.jpg`;
    const file = join(draftsDir, name);
    if (existsSync(file)) {
      skipped += 1;
      continue;
    }
    const prompt = `${shot.prompt}, ${STYLE_TAIL}`;
    const query = new URLSearchParams({
      width: String(shot.w || 1024),
      height: String(shot.h || 576),
      nologo: "true",
      seed: String(seed),
    });
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${query}`;
    console.log(`▸ ${name}`);
    if (await pull(url, file)) {
      made += 1;
      console.log("    已保存");
    } else {
      failed += 1;
    }
    await sleep(GAP_MS);
  }
}

// 刷新草稿审查页（按清单分组，把 drafts 里已有的图排进去）
const byShot = new Map();
for (const name of readdirSync(draftsDir)) {
  const match = name.match(/^(.*)-s\d+\.jpg$/);
  if (!match) continue;
  const list = byShot.get(match[1]) || [];
  list.push(name);
  byShot.set(match[1], list);
}

const sections = shots
  .filter((shot) => !shot.skip)
  .map((shot) => {
    const files = (byShot.get(shot.id) || []).sort();
    if (!files.length) return "";
    const imgs = files
      .map((f) => `      <figure><img src="../../assets/cg/drafts/${f}" alt="${shot.id} 草稿" loading="lazy"><figcaption>${f}</figcaption></figure>`)
      .join("\n");
    return `    <section>
      <h2>${shot.id} <span>${shot.note || ""}</span></h2>
      <div class="row">
${imgs}
      </div>
    </section>`;
  })
  .filter(Boolean)
  .join("\n");

writeFileSync(
  reviewFile,
  `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CG 草稿 · 抽卡池</title>
<style>
  :root { --bg:#060a12; --card:#0c1320; --line:rgba(216,221,232,.14); --ink:#d8dee8; --dim:#93a0b4; --warm:#f2c777; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--ink); font-family:"Inter","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif; line-height:1.7; padding:28px clamp(14px,4vw,48px) 60px; }
  header { max-width:1180px; margin:0 auto 24px; }
  .kicker { font-size:11px; letter-spacing:.32em; color:var(--dim); }
  h1 { font-size:clamp(20px,3vw,26px); font-weight:500; letter-spacing:.12em; margin:6px 0 4px; }
  .sub { color:var(--dim); font-size:13px; }
  main { max-width:1180px; margin:0 auto; }
  section { margin-bottom:34px; }
  h2 { font-size:15px; font-weight:500; letter-spacing:.08em; border-bottom:1px solid var(--line); padding-bottom:8px; margin-bottom:14px; }
  h2 span { color:var(--dim); font-weight:400; font-size:12px; margin-left:10px; }
  .row { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
  figure { background:var(--card); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  figure img { width:100%; display:block; }
  figcaption { padding:8px 12px; color:var(--dim); font-size:11px; font-family:Consolas,monospace; }
</style>
</head>
<body>
  <header>
    <p class="kicker">FUYU · NINE LAMPS — CG DRAFTS</p>
    <h1>CG 草稿 · 抽卡池</h1>
    <p class="sub">由 scripts/gacha.mjs 自动生成。挑中的图告诉我文件名，我负责后期调色、裁水印与接入。</p>
  </header>
  <main>
${sections}
  </main>
</body>
</html>
`
);

console.log(`\n完成：新抽 ${made}，已有 ${skipped}，失败 ${failed}。挑图页：docs/design/cg-drafts.html`);
