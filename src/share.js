/**
 * 浮屿 · 星图分享图
 *
 * 把记忆星图画到一张 1080×1080 的 Canvas 上，让玩家把这一趟航行带走。
 * 全程序化绘制，不加载任何图片或字体。
 */

const SIZE = 1080;
const PAD = 96;

function paintStar(ctx, x, y, fragment, found) {
  if (!found) {
    ctx.fillStyle = "rgba(174, 182, 196, 0.35)";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 26);
  glow.addColorStop(0, "rgba(242, 199, 119, 0.85)");
  glow.addColorStop(1, "rgba(242, 199, 119, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f6d99a";
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();

  if (fragment.glyph) {
    ctx.font = "600 30px 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "rgba(246, 217, 154, 0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(fragment.glyph, x + 13, y - 10);
  }
}

/**
 * @param {{ allFragments: Array, foundIds: string[], links: Array<[string, string]>,
 *           title?: string, subtitle?: string }} options
 * @returns {HTMLCanvasElement}
 */
export function drawConstellationChart({ allFragments = [], foundIds = [], links = [], title = "记忆星图", subtitle = "" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const found = new Set(foundIds);
  const byId = new Map(allFragments.map((fragment) => [fragment.id, fragment]));
  const plot = PAD + 8;
  const span = SIZE - plot * 2;
  const px = (n) => plot + (n / 100) * span;

  const sky = ctx.createLinearGradient(0, 0, 0, SIZE);
  sky.addColorStop(0, "#070d18");
  sky.addColorStop(1, "#04080f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 网格
  ctx.strokeStyle = "rgba(216, 221, 233, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    const at = plot + (span / 6) * i;
    ctx.beginPath();
    ctx.moveTo(at, plot);
    ctx.lineTo(at, SIZE - plot);
    ctx.moveTo(plot, at);
    ctx.lineTo(SIZE - plot, at);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(216, 221, 233, 0.16)";
  ctx.strokeRect(plot, plot, span, span);

  // 连线
  for (const [a, b] of links || []) {
    const from = byId.get(a);
    const to = byId.get(b);
    if (!from || !to) continue;
    const lit = found.has(a) && found.has(b);
    ctx.strokeStyle = lit ? "rgba(242, 199, 119, 0.55)" : "rgba(174, 182, 196, 0.14)";
    ctx.lineWidth = lit ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(px(from.star[0]), px(from.star[1]));
    ctx.lineTo(px(to.star[0]), px(to.star[1]));
    ctx.stroke();
  }

  // 星
  for (const fragment of allFragments) {
    paintStar(ctx, px(fragment.star?.[0] ?? 50), px(fragment.star?.[1] ?? 50), fragment, found.has(fragment.id));
  }

  // 标题区
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "500 26px 'SFMono-Regular', Consolas, monospace";
  ctx.fillStyle = "rgba(174, 182, 196, 0.75)";
  ctx.fillText("FUYU · FLOATING ISLE", PAD, PAD - 34);

  ctx.font = "900 74px 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillStyle = "#f4f6fa";
  ctx.fillText(title, PAD - 4, 74);

  if (subtitle) {
    ctx.font = "400 28px 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "rgba(242, 199, 119, 0.9)";
    ctx.textAlign = "right";
    ctx.fillText(subtitle, SIZE - PAD + 4, 74);
  }

  ctx.textAlign = "center";
  ctx.font = "400 24px 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillStyle = "rgba(174, 182, 196, 0.6)";
  ctx.fillText("每颗星都是一段想起来的记忆", SIZE / 2, SIZE - 44);

  return canvas;
}

/**
 * 生成并下载星图 PNG。返回是否成功触发下载。
 */
export function downloadConstellationChart(options) {
  const canvas = drawConstellationChart(options);
  try {
    const link = document.createElement("a");
    link.download = "fuyu-star-chart.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    return true;
  } catch {
    return false; // 某些浏览器在 dataURL 过大时会抛错；静默失败即可
  }
}
