// 预约确认函生成器（纯前端，两栏排版）
// 依赖：同目录 template.jpeg（或 template.png）
// 输出：PNG（与模板同尺寸，微信发图清晰不变形）

// ====== 画布尺寸：建议与模板一致（你这张模板为 1024×1536）======
const CANVAS_W = 1024;
const CANVAS_H = 1536;

// ====== 文本区域（金框内留白区，按你新图测量）======
const TEXT_BOX = {
  x: 81,
  y: 406,
  w: 855,
  h: 790,
};

// ====== 两栏配置 ======
const COLUMNS = 2;
const GUTTER = 52;        // 两栏之间间距（可微调：40~70）
const PADDING = 44;       // 文字离金框边距（可微调：36~56）
const LINE_HEIGHT = 1.45; // 行距

// 字号范围
const MAX_FONT = 42;
const MIN_FONT = 22;

const inputEl = document.getElementById("input");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const btnGenerate = document.getElementById("btnGenerate");
const btnDownload = document.getElementById("btnDownload");

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

let lastDataURL = null;

// ====== 模板加载 ======
const templateImg = new Image();
// 如果你的文件名是 template.png，把这里改成 "./template.png"
templateImg.src = "./template.jpeg";

templateImg.onload = () => {
  renderToCanvas("请在左侧粘贴预约信息，然后点击「生成图片」");
};
templateImg.onerror = () => {
  alert(
    "模板加载失败：请确认 reservation-maker 目录下存在 template.jpeg（或 template.png），且文件名大小写完全一致。"
  );
};

btnGenerate.addEventListener("click", () => {
  const text = (inputEl.value || "").trim();
  if (!text) return alert("请先粘贴预约信息");
  renderToCanvas(text);
  btnDownload.disabled = false;
});

btnDownload.addEventListener("click", () => {
  if (!lastDataURL) return;
  const a = document.createElement("a");
  a.href = lastDataURL;
  a.download = `预约确认函_${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// ====== 渲染 ======
function renderToCanvas(rawText) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

  drawAutoFitTextTwoColumns(rawText, TEXT_BOX);

  lastDataURL = canvas.toDataURL("image/png");
}

// ====== 核心：两栏自动适配 ======
function drawAutoFitTextTwoColumns(text, box) {
  const innerW = box.w - PADDING * 2;
  const innerH = box.h - PADDING * 2;

  const colW = (innerW - GUTTER) / 2; // 两栏平均宽
  const colX = [
    box.x + PADDING,
    box.x + PADDING + colW + GUTTER,
  ];

  // 预处理：保留换行、统一冒号、清理 TAB
  const cleaned = (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[：]\s*/g, "：")
    .trim();

  ctx.save();
  ctx.fillStyle = "#F2F2F2";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  let fontSize = MAX_FONT;

  while (fontSize >= MIN_FONT) {
    ctx.font = `600 ${fontSize}px "PingFang SC","Microsoft YaHei","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;

    const lines = wrapTextByWidth(cleaned, colW, ctx);
    const lineHpx = fontSize * LINE_HEIGHT;
    const maxLinesPerCol = Math.floor(innerH / lineHpx);
    const capacity = maxLinesPerCol * COLUMNS;

    if (lines.length <= capacity) {
      // 可以完整放入两栏：绘制 + 垂直居中
      const leftLines = lines.slice(0, maxLinesPerCol);
      const rightLines = lines.slice(maxLinesPerCol);

      const usedLeftH = leftLines.length * lineHpx;
      const usedRightH = rightLines.length * lineHpx;
      const usedH = Math.max(usedLeftH, usedRightH);

      // 两栏统一的 startY（让整体上下留白相等）
      const startY = box.y + PADDING + Math.max(0, (innerH - usedH) / 2);

      drawLines(leftLines, colX[0], startY, lineHpx);
      drawLines(rightLines, colX[1], startY, lineHpx);

      ctx.restore();
      return;
    }

    fontSize -= 2;
  }

  // 仍然超：用最小字号 + 截断 + 省略号
  const fontSizeMin = MIN_FONT;
  ctx.font = `600 ${fontSizeMin}px "PingFang SC","Microsoft YaHei","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;

  const lines = wrapTextByWidth(cleaned, colW, ctx);
  const lineHpx = fontSizeMin * LINE_HEIGHT;
  const maxLinesPerCol = Math.floor(innerH / lineHpx);
  const capacity = maxLinesPerCol * COLUMNS;

  let clipped = lines.slice(0, capacity);
  if (clipped.length > 0) {
    clipped[clipped.length - 1] = addEllipsisToFit(clipped[clipped.length - 1], colW, ctx);
  }

  const leftLines = clipped.slice(0, maxLinesPerCol);
  const rightLines = clipped.slice(maxLinesPerCol);

  const usedLeftH = leftLines.length * lineHpx;
  const usedRightH = rightLines.length * lineHpx;
  const usedH = Math.max(usedLeftH, usedRightH);
  const startY = box.y + PADDING + Math.max(0, (innerH - usedH) / 2);

  drawLines(leftLines, colX[0], startY, lineHpx);
  drawLines(rightLines, colX[1], startY, lineHpx);

  ctx.restore();
}

// ====== 绘制多行 ======
function drawLines(lines, x, y, lineH) {
  let yy = y;
  for (const line of lines) {
    ctx.fillText(line, x, yy);
    yy += lineH;
  }
}

// ====== 换行：按宽度折行（保留原换行） ======
function wrapTextByWidth(text, maxWidth, ctx) {
  const paragraphs = text.split("\n");
  const lines = [];

  for (const p of paragraphs) {
    if (!p.trim()) {
      lines.push(""); // 保留空行
      continue;
    }

    const tokens = splitKeepAsciiWords(p);
    let line = "";

    for (const t of tokens) {
      const test = line ? (line + t) : t;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = t.trimStart(); // 新行去掉前导空格
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

// 中文/日文按字符拆；英文数字等按“词”保留整体
function splitKeepAsciiWords(str) {
  const out = [];
  let buf = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const isAscii = /[A-Za-z0-9@._\-'/]/.test(ch);

    if (isAscii) {
      buf += ch;
    } else {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      out.push(ch);
    }
  }
  if (buf) out.push(buf);

  return out;
}

// 让最后一行加省略号且不超宽
function addEllipsisToFit(line, maxWidth, ctx) {
  const ell = "…";
  if (ctx.measureText(line + ell).width <= maxWidth) return line + ell;

  let s = line;
  while (s.length > 0 && ctx.measureText(s + ell).width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + ell;
}
