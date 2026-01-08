// 预约确认函生成器（纯前端）
// 依赖：同目录 template.png
// 输出：高清 PNG（1240×1800）
// 目标：微信发图不糊、文字不乱码（使用系统字体 + 自动缩放）

const CANVAS_W = 1240;
const CANVAS_H = 1800;

// 文字区域（你模板中间金框内的留白区）
// 你之后如果换模板，只需要调整这里四个数：x,y,w,h
const TEXT_BOX = {
  x: 210,
  y: 470,
  w: 820,
  h: 520,
};

const TITLE_Y = 200;  // 顶部标题大字位置（可按模板微调）

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
 // 自动适配：在固定盒子里把文本塞进去（自动换行 + 自动缩小 + 垂直居中）
function drawAutoFitText(text, box) {
  const paddingX = 34;     // 左右内边距（加大一点更“信件感”）
  const paddingY = 32;     // 上下内边距（避免顶到金框）
  const maxW = box.w - paddingX * 2;
  const maxH = box.h - paddingY * 2;

  const cleaned = (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[：]\s*/g, "：")
    .replace(/\t/g, " ")
    .trim();

  ctx.save();
  ctx.fillStyle = "#f3f3f4";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // 1) 先试字号，从大到小，直到高度能放下
  let fontSize = 44;
  let lineHeightRatio = 1.45;

  while (fontSize >= 22) {
    ctx.font = `600 ${fontSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;

    const lines = wrapTextByBox(cleaned, maxW, ctx);

    // 2) 行高：字越大行距略大，字越小行距略紧凑
    lineHeightRatio = fontSize >= 38 ? 1.50 : (fontSize >= 30 ? 1.42 : 1.35);
    const lineH = fontSize * lineHeightRatio;

    // 去掉末尾空行造成的“假高度”
    const trimmedLines = trimTrailingEmptyLines(lines);

    const totalH = trimmedLines.length * lineH;

    if (totalH <= maxH) {
      // 3) 垂直居中：根据总高度算出起笔 y，让上下留白相等
      const startX = box.x + paddingX;
      const startY = box.y + paddingY + (maxH - totalH) / 2;

      let y = startY;
      for (const line of trimmedLines) {
        ctx.fillText(line, startX, y);
        y += lineH;
      }

      ctx.restore();
      return;
    }

    fontSize -= 2;
  }

  // 4) 还放不下：截断
  const fallbackSize = 22;
  ctx.font = `600 ${fallbackSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;
  const lines = trimTrailingEmptyLines(wrapTextByBox(cleaned, maxW, ctx));

  const lineH = fallbackSize * 1.35;
  const maxLines = Math.max(1, Math.floor(maxH / lineH));
  const clipped = lines.slice(0, maxLines);

  if (clipped.length > 0) {
    clipped[clipped.length - 1] = smartEllipsis(clipped[clipped.length - 1]);
  }

  const totalH = clipped.length * lineH;
  const startX = box.x + paddingX;
  const startY = box.y + paddingY + (maxH - totalH) / 2;

  let y = startY;
  for (const line of clipped) {
    ctx.fillText(line, startX, y);
    y += lineH;
  }
  ctx.restore();
}

function trimTrailingEmptyLines(lines) {
  let end = lines.length;
  while (end > 0 && (lines[end - 1] === "" || lines[end - 1].trim() === "")) end--;
  return lines.slice(0, end);
}

function smartEllipsis(s) {
  const t = (s || "").trimEnd();
  if (t.length <= 2) return "…";
  return t.slice(0, t.length - 1) + "…";
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
