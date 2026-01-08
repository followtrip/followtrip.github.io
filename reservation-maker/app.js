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
