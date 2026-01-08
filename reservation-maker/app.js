// 预约确认函生成器（纯前端）
// 依赖：同目录 template.png
// 输出：高清 PNG（1242×2208）
// 目标：微信发图不糊、文字不乱码（使用系统字体 + 自动缩放）

const CANVAS_W = 1242;
const CANVAS_H = 2208;
// ====== 可调参数：文字框（适配你这张黑金模板） ======
const TEXT_BOX = {
  x: 125,
  y: 470,
  w: 612,
  h: 430
};

// ====== 自动换行（按像素宽度 wrap） ======
function wrapLines(ctx, text, maxWidth) {
  const paras = String(text || "").split("\n").map(s => s.trim()).filter(Boolean);
  const lines = [];

  for (const p of paras) {
    // 对“没有空格的日文/中文”也能wrap：逐字推进
    let line = "";
    for (const ch of p) {
      const test = line + ch;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = ch;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// ====== 在框内：自动缩放字号 + 自动换行 + 上下居中 ======
function drawFittedText(ctx, text, box, options = {}) {
  const {
    fontFamily = '"Noto Sans CJK", "Noto Sans JP", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeight = 700,
    color = "#F2F2F2",
    maxFontSize = 46,
    minFontSize = 22,
    lineHeightRatio = 1.28,
    align = "left" // 你要“居中”就传 "center"
  } = options;

  // 先用最大字号尝试，放不下就逐步减小字号
  let fontSize = maxFontSize;
  let lines = [];
  let lineHeight = 0;
  let totalH = 0;

  while (fontSize >= minFontSize) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    lines = wrapLines(ctx, text, box.w);
    lineHeight = Math.round(fontSize * lineHeightRatio);
    totalH = lines.length * lineHeight;

    if (totalH <= box.h) break; // 放得下
    fontSize -= 1;
  }

  // 绘制
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = align;

  // 上下居中：让整体段落在框内垂直居中
  const startY = box.y + Math.max(0, (box.h - totalH) / 2);

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;

    let x;
    if (align === "center") x = box.x + box.w / 2;
    else if (align === "right") x = box.x + box.w;
    else x = box.x;

    ctx.fillText(lines[i], x, y);
  }
}

// ====== 你原来生成图片的函数里，画完模板图后，调用这段 ======
// 示例：假设你已经 ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height)

function renderReservationText(ctx, reservationText) {
  drawFittedText(ctx, reservationText, TEXT_BOX, {
    align: "center",        // 你说要居中
    maxFontSize: 44,        // 可调：字更大/更小
    minFontSize: 22,
    lineHeightRatio: 1.25
  });
}
const TITLE_Y = 270;  // 顶部标题大字位置（可按模板微调）

const inputEl = document.getElementById("input");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const btnGenerate = document.getElementById("btnGenerate");
const btnDownload = document.getElementById("btnDownload");

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

let lastDataURL = null;

const templateImg = new Image();
templateImg.src = "./template.png";
templateImg.onload = () => {
  // 初始渲染空白模板
  renderToCanvas("请在左侧粘贴预约信息，然后点击「生成图片」");
};
templateImg.onerror = () => {
  alert("template.png 加载失败：请确认 reservation-maker 目录下存在 template.png，且文件名完全一致（区分大小写）");
};

btnGenerate.addEventListener("click", () => {
  const text = (inputEl.value || "").trim();
  if (!text) {
    alert("请先粘贴预约信息");
    return;
  }
  renderToCanvas(text);
  btnDownload.disabled = false;
});

btnDownload.addEventListener("click", () => {
  if (!lastDataURL) return;
  const a = document.createElement("a");
  a.href = lastDataURL;
  a.download = `预约确认函_${new Date().toISOString().slice(0,10)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// --------- 渲染核心 ---------
function renderToCanvas(rawText) {
  // 背景模板
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

  // 标题（如果你的模板已经包含标题，可把这段注释）
  // drawTitle("餐厅预约确认函");

  // 主体文字：自动换行 + 自动缩放
  drawAutoFitText(rawText, TEXT_BOX);

  lastDataURL = canvas.toDataURL("image/png");
}

// 可选：额外画标题（默认不画，避免跟模板重复）
function drawTitle(t) {
  ctx.save();
  ctx.fillStyle = "#f2f2f2";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 78px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif`;
  ctx.fillText(t, CANVAS_W / 2, TITLE_Y);
  ctx.restore();
}

// 自动适配：在固定盒子里把文本塞进去（会缩小字体以防溢出）
function drawAutoFitText(text, box) {
  const padding = 18;
  const maxW = box.w - padding * 2;
  const maxH = box.h - padding * 2;

  // 预处理：统一冒号/空格；保留换行
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/[：]\s*/g, "：")
    .replace(/\t/g, " ")
    .trim();

  // 字体从大到小试，直到能放进去
  let fontSize = 44;
  let lineHeight = 1.45;

  ctx.save();
  ctx.fillStyle = "#f3f3f4";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  while (fontSize >= 22) {
    ctx.font = `600 ${fontSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;
    const lines = wrapTextByBox(cleaned, maxW, ctx);

    const totalH = lines.length * fontSize * lineHeight;
    if (totalH <= maxH) {
      // 画出来
      const startX = box.x + padding;
      let y = box.y + padding;

      for (const line of lines) {
        ctx.fillText(line, startX, y);
        y += fontSize * lineHeight;
      }
      ctx.restore();
      return;
    }

    fontSize -= 2;
  }

  // 仍放不下：截断
  ctx.font = `600 22px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif`;
  const lines = wrapTextByBox(cleaned, maxW, ctx);
  const maxLines = Math.floor(maxH / (22 * lineHeight));
  const clipped = lines.slice(0, maxLines);
  if (clipped.length > 0) {
    clipped[clipped.length - 1] = clipped[clipped.length - 1].slice(0, Math.max(0, clipped[clipped.length - 1].length - 2)) + "…";
  }

  const startX = box.x + padding;
  let y = box.y + padding;
  for (const line of clipped) {
    ctx.fillText(line, startX, y);
    y += 22 * lineHeight;
  }
  ctx.restore();
}

// 把带换行的文本，按盒子宽度进行折行
function wrapTextByBox(text, maxWidth, ctx) {
  const paragraphs = text.split("\n");
  const lines = [];

  for (const p of paragraphs) {
    if (!p.trim()) {
      lines.push(""); // 保留空行
      continue;
    }
    const words = splitKeepChars(p);
    let line = "";

    for (const w of words) {
      const test = line ? (line + w) : w;
      const width = ctx.measureText(test).width;
      if (width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = w.trimStart(); // 新行不需要前导空格
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

// 中文/日文不按空格分词，所以按“字符”拆，但保留英文单词整体
function splitKeepChars(str) {
  const out = [];
  let buf = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const isAsciiWord = /[A-Za-z0-9@._\-]/.test(ch);

    if (isAsciiWord) {
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
