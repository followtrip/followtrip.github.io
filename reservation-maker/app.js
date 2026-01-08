/* =========================================================
   食客阿福｜预约确认生成器  app.js（删光重来版）
   依赖：index.html 里有
   - <textarea id="reservationText"></textarea>
   - <button id="generateBtn"></button>
   - <button id="downloadBtn"></button>
   - <canvas id="canvas"></canvas>
   - template.png 与 app.js 同目录
   ========================================================= */

// ====== 你需要根据模板微调的核心参数（先用默认，后面再调） ======
const TEMPLATE_SRC = "template.png";

/**
 * 文本框区域（在金色内框的“可写区域”）
 * 下面这组是通用默认值，你需要用调试框微调到最贴合你的模板。
 */
const TEXT_BOX = {
  x: 210,
  y: 470,
  w: 820,
  h: 520
};

// 文本样式（建议白字/浅金字）
const STYLE = {
  color: "#F2F2F2",              // 字色
  fontWeight: 700,               // 700 = bold
  maxFont: 44,                   // 最大字号
  minFont: 22,                   // 最小字号（太小就不好看了）
  lineHeightRatio: 1.25,         // 行高
  paragraphGap: 0.25,            // 段落额外间距（倍数 * lineHeight）
  align: "center"                // center 更像“信函居中”
};

// 打开可视化调试（会画出文本框范围）
const DEBUG = false;

// ====== DOM ======
const textarea = document.getElementById("reservationText");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");

// ====== 字体：优先使用系统黑体/苹方；如你放了字体文件可启用 loadFont() ======
const FONT_FAMILY_FALLBACK =
  '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei","Heiti SC","SimHei",sans-serif';

// 可选：如果你准备把字体文件放到 reservation-maker/fonts/ 里（推荐 woff2）
// 例：fonts/NotoSansCJKsc-Bold.woff2
async function loadFontIfProvided() {
  // 如果你没放字体文件，不用管，这里直接 return
  // 你想启用，就把下面注释打开，并确保路径/文件名正确

  /*
  try {
    const font = new FontFace("NotoSansCJKSC_Local", "url(fonts/NotoSansCJKsc-Bold.woff2)");
    await font.load();
    document.fonts.add(font);
    console.log("Font loaded:", font.family);
  } catch (e) {
    console.warn("Font load failed (fallback to system fonts):", e);
  }
  */
}

// ====== 工具：按宽度自动换行（保留用户原有换行） ======
function splitParagraphs(raw) {
  // 保留空行的意义不大，直接去掉纯空行
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function wrapLine(ctx, text, maxWidth) {
  // 逐字换行（适合中日混排）
  const out = [];
  let line = "";

  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) out.push(line);
      line = ch;
    }
  }
  if (line) out.push(line);
  return out;
}

function layoutText(ctx, rawText, box, fontSize) {
  const paragraphs = splitParagraphs(rawText);

  // 设定字体用于 measureText
  ctx.font = `${STYLE.fontWeight} ${fontSize}px ${FONT_FAMILY_FALLBACK}`;
  const lineH = Math.round(fontSize * STYLE.lineHeightRatio);
  const paraGap = Math.round(lineH * STYLE.paragraphGap);

  const lines = [];
  for (let p = 0; p < paragraphs.length; p++) {
    const wrapped = wrapLine(ctx, paragraphs[p], box.w);
    for (const l of wrapped) lines.push({ text: l, isGap: false });
    if (p !== paragraphs.length - 1) lines.push({ text: "", isGap: true }); // 段落间隔
  }

  const totalH = lines.reduce((sum, item) => sum + (item.isGap ? paraGap : lineH), 0);

  return { lines, lineH, paraGap, totalH };
}

// ====== 核心：自动缩放字号直到装得下 ======
function fitFontSize(ctx, rawText, box) {
  for (let size = STYLE.maxFont; size >= STYLE.minFont; size--) {
    const layout = layoutText(ctx, rawText, box, size);
    if (layout.totalH <= box.h) return { fontSize: size, ...layout };
  }
  // 实在装不下，就用最小字号 + 裁切风险（一般不会到这步）
  return { fontSize: STYLE.minFont, ...layoutText(ctx, rawText, box, STYLE.minFont) };
}

// ====== 绘制 ======
function drawDebugBox(ctx, box) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,255,0,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

function drawTextBlock(ctx, rawText, box) {
  const { fontSize, lines, lineH, paraGap, totalH } = fitFontSize(ctx, rawText, box);

  // 设置文本样式
  ctx.save();
  ctx.fillStyle = STYLE.color;
  ctx.font = `${STYLE.fontWeight} ${fontSize}px ${FONT_FAMILY_FALLBACK}`;
  ctx.textBaseline = "top";
  ctx.textAlign = STYLE.align; // center

  // 垂直居中：上下留白相等
  const startY = box.y + Math.max(0, (box.h - totalH) / 2);

  // 水平：center / left 可选
  const x =
    STYLE.align === "left" ? box.x :
    STYLE.align === "right" ? (box.x + box.w) :
    (box.x + box.w / 2);

  let y = startY;
  for (const item of lines) {
    if (item.isGap) {
      y += paraGap;
      continue;
    }
    ctx.fillText(item.text, x, y);
    y += lineH;
  }

  ctx.restore();
}

// ====== 加载图片（避免缓存：可加 ?v=时间戳） ======
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ====== 主流程：生成 ======
async function render() {
  const text = textarea?.value?.trim() || "";
  if (!text) {
    alert("请先粘贴预约信息。");
    return;
  }

  // 可选字体加载（如果你启用上面的 loadFontIfProvided）
  await loadFontIfProvided();

  // 加载模板
  const img = await loadImage(`${TEMPLATE_SRC}?v=${Date.now()}`);

  // 画底图
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  // 调试框
  if (DEBUG) drawDebugBox(ctx, TEXT_BOX);

  // 画文字
  drawTextBlock(ctx, text, TEXT_BOX);

  // 下载按钮可用
  if (downloadBtn) downloadBtn.disabled = false;
}

// ====== 下载 PNG ======
function downloadPNG() {
  const a = document.createElement("a");
  a.download = `reservation_${Date.now()}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

// ====== 绑定事件 ======
generateBtn?.addEventListener("click", () => {
  render().catch(err => {
    console.error(err);
    alert("生成失败：请打开控制台查看错误信息（或告诉我报错截图）。");
  });
});
downloadBtn?.addEventListener("click", downloadPNG);

// ====== 页面加载后先禁用下载 ======
if (downloadBtn) downloadBtn.disabled = true;
