const CANVAS_W = 1240;
const CANVAS_H = 1800;

// 文字区域（按你模板金框内留白）
const TEXT_BOX = { x: 210, y: 470, w: 820, h: 520 };

window.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  if (!inputEl || !canvas || !btnGenerate || !btnDownload) {
    console.error("DOM 元素缺失：请确认 index.html 里存在 input/canvas/btnGenerate/btnDownload 且 id 完全一致。");
    alert("页面元素缺失（id 不一致）。请检查 index.html 的 id。");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("无法获取 canvas 2d 上下文");
    alert("无法获取 canvas 2D 上下文（浏览器异常）");
    return;
  }

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  let lastDataURL = null;

  // 载入模板
  const templateImg = new Image();
  templateImg.src = "./template.png";

  templateImg.onload = () => {
    console.log("template.png loaded", templateImg.width, templateImg.height);
    renderToCanvas("请在左侧粘贴预约信息，然后点击「生成图片」");
  };

  templateImg.onerror = (e) => {
    console.error("template.png 加载失败", e);
    alert("template.png 加载失败（虽然你说能打开，但这里仍失败）。请检查：文件名大小写、是否在同目录、是否被缓存。");
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

  function renderToCanvas(rawText) {
    // 1) 先清空并涂底（防止透明看起来像黑）
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 2) 画模板
    ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

    // 3) 画文字（自动换行+自动缩放+垂直居中）
    drawAutoFitTextCentered(rawText, TEXT_BOX);

    lastDataURL = canvas.toDataURL("image/png");
  }

  // ------- 文字：自动缩放 + 换行 + 垂直居中 + 左对齐 -------
  function drawAutoFitTextCentered(text, box) {
    const paddingX = 28;
    const paddingY = 26;
    const maxW = box.w - paddingX * 2;
    const maxH = box.h - paddingY * 2;

    const cleaned = (text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .trim();

    let fontSize = 44;
    const lineHeight = 1.45;

    ctx.save();
    ctx.fillStyle = "#f3f3f4";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    while (fontSize >= 22) {
      ctx.font = `600 ${fontSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;

      const lines = wrapTextByBox(cleaned, maxW, ctx);
      const totalH = lines.length * fontSize * lineHeight;

      if (totalH <= maxH) {
        const startX = box.x + paddingX;

        // 垂直居中：让上下留白尽量相等
        const startY = box.y + paddingY + (maxH - totalH) / 2;

        let y = startY;
        for (const line of lines) {
          ctx.fillText(line, startX, y);
          y += fontSize * lineHeight;
        }
        ctx.restore();
        return;
      }
      fontSize -= 2;
    }

    // 仍放不下就截断
    ctx.font = `600 22px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif`;
    const lines = wrapTextByBox(cleaned, maxW, ctx);
    const maxLines = Math.floor(maxH / (22 * lineHeight));
    const clipped = lines.slice(0, Math.max(1, maxLines));
    clipped[clipped.length - 1] = clipped[clipped.length - 1].slice(0, 50) + "…";

    const startX = box.x + paddingX;
    const totalH = clipped.length * 22 * lineHeight;
    const startY = box.y + paddingY + (maxH - totalH) / 2;

    let y = startY;
    for (const line of clipped) {
      ctx.fillText(line, startX, y);
      y += 22 * lineHeight;
    }
    ctx.restore();
  }

  function wrapTextByBox(text, maxWidth, ctx) {
    const paragraphs = text.split("\n");
    const lines = [];

    for (const p of paragraphs) {
      if (!p.trim()) {
        lines.push("");
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
          line = w.trimStart();
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  function splitKeepChars(str) {
    const out = [];
    let buf = "";

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const isAsciiWord = /[A-Za-z0-9@._\-]/.test(ch);

      if (isAsciiWord) buf += ch;
      else {
        if (buf) { out.push(buf); buf = ""; }
        out.push(ch);
      }
    }
    if (buf) out.push(buf);
    return out;
  }
});
function drawTwoColumnText(text, leftBox, rightBox) {
  // 预处理：保持换行
  const cleaned = (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .trim();

  // 样式：左栏大一点，右栏小一点
  const leftStyle = {
    minSize: 30,
    maxSize: 40,
    weight: 700,
    lineHeight: 1.38,
    padding: 18,
  };

  const rightStyle = {
    minSize: 22,
    maxSize: 30,
    weight: 650,
    lineHeight: 1.36,
    padding: 18,
  };

  ctx.save();
  ctx.fillStyle = "#f3f3f4";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // 先把全文按“左栏宽度”折行（保证左右一致的换行逻辑）
  // 左栏折行会更保守（宽度更小），这样溢出到右栏也不会突然变成更长的行
  const leftMaxW = leftBox.w - leftStyle.padding * 2;

  // 左栏字体：从大到小找一个“尽量大但能放下更多”的字号
  // 这里不追求全放下，因为我们有右栏；目标是：左栏读起来舒服
  let leftFontSize = leftStyle.maxSize;
  let leftLines = [];

  while (leftFontSize >= leftStyle.minSize) {
    ctx.font = `${leftStyle.weight} ${leftFontSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;
    leftLines = wrapTextByBox(cleaned, leftMaxW, ctx);

    // 计算左栏能放多少行
    const leftMaxH = leftBox.h - leftStyle.padding * 2;
    const leftMaxLines = Math.floor(leftMaxH / (leftFontSize * leftStyle.lineHeight));

    // 只要能放下至少 6 行（一般关键字段就够了），就接受这个字号
    // 你也可以把 6 改成 7/8，看你常见字段多少
    if (leftMaxLines >= 6) break;

    leftFontSize -= 2;
  }

  // 左栏可容纳行数
  const leftMaxH = leftBox.h - leftStyle.padding * 2;
  const leftMaxLines = Math.floor(leftMaxH / (leftFontSize * leftStyle.lineHeight));

  const leftToDraw = leftLines.slice(0, leftMaxLines);
  const overflowLines = leftLines.slice(leftMaxLines);

  // ——画左栏（垂直居中：上下留白相等）——
  const leftTotalH = leftToDraw.length * leftFontSize * leftStyle.lineHeight;
  const leftStartY =
    leftBox.y + leftStyle.padding + Math.max(0, (leftMaxH - leftTotalH) / 2);

  let y = leftStartY;
  const leftStartX = leftBox.x + leftStyle.padding;

  ctx.font = `${leftStyle.weight} ${leftFontSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;
  for (const line of leftToDraw) {
    ctx.fillText(line, leftStartX, y);
    y += leftFontSize * leftStyle.lineHeight;
  }

  // ——画右栏（溢出内容）——
  const rightMaxW = rightBox.w - rightStyle.padding * 2;
  const rightMaxH = rightBox.h - rightStyle.padding * 2;

  // 右栏字体从大到小，直到能放下尽量多
  let rightFontSize = rightStyle.maxSize;
  let rightLines = [];

  // 把 overflowLines 合并成文本再按右栏宽度重新折行（避免右栏宽度不同导致布局怪）
  const overflowText = overflowLines.join("\n");

  while (rightFontSize >= rightStyle.minSize) {
    ctx.font = `${rightStyle.weight} ${rightFontSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;
    rightLines = wrapTextByBox(overflowText, rightMaxW, ctx);

    const totalH = rightLines.length * rightFontSize * rightStyle.lineHeight;
    if (totalH <= rightMaxH) break;

    rightFontSize -= 2;
  }

  // 如果还是超出：截断并加省略号
  const rightMaxLines = Math.floor(rightMaxH / (rightFontSize * rightStyle.lineHeight));
  let rightToDraw = rightLines.slice(0, rightMaxLines);

  if (rightLines.length > rightMaxLines && rightToDraw.length) {
    const last = rightToDraw[rightToDraw.length - 1];
    rightToDraw[rightToDraw.length - 1] =
      last.length > 2 ? last.slice(0, last.length - 2) + "…" : "…";
  }

  // 右栏垂直居中
  const rightTotalH = rightToDraw.length * rightFontSize * rightStyle.lineHeight;
  const rightStartY =
    rightBox.y + rightStyle.padding + Math.max(0, (rightMaxH - rightTotalH) / 2);

  y = rightStartY;
  const rightStartX = rightBox.x + rightStyle.padding;

  ctx.font = `${rightStyle.weight} ${rightFontSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;
  for (const line of rightToDraw) {
    ctx.fillText(line, rightStartX, y);
    y += rightFontSize * rightStyle.lineHeight;
  }

  ctx.restore();
}
