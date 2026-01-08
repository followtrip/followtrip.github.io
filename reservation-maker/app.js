(() => {
  const $ = (id) => document.getElementById(id);

  const canvas = $("canvas");
  const input = $("input");
  const btnRender = $("btnRender");
  const btnDownload = $("btnDownload");

  if (!canvas) {
    console.error("找不到 canvas#canvas，请检查 index.html 的 id 是否为 canvas");
    return;
  }

  const ctx = canvas.getContext("2d");

  // 你这张模板的尺寸（必须和 canvas 一致）
  const W = 1240;
  const H = 1754;

  // ✅ 文字安全区（你要的：不顶框、上下留白均等）
  const TEXT_BOX = { x: 210, y: 470, w: 820, h: 520 };

  // ✅ GitHub Pages 子目录：必须用相对路径
  const TEMPLATE_SRC = "./template.png";

  // 如有自带字体文件，可改为 ./fonts/xxx.otf
  // 没有也没关系：先用系统字体（黑体/苹方/微软雅黑）
  function setFont(sizePx) {
    // 让不同系统尽量接近“黑体观感”
    ctx.font = `700 ${sizePx}px "SimHei","Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif`;
    ctx.fillStyle = "#F2F2F2";
    ctx.textBaseline = "top";
  }

  function wrapTextToLines(text, maxWidth, fontSize) {
    setFont(fontSize);
    const lines = [];
    const paragraphs = text.replace(/\r\n/g, "\n").split("\n");

    for (const p of paragraphs) {
      const s = p.trim();
      if (!s) { lines.push(""); continue; }

      let line = "";
      for (const ch of s) {
        const test = line + ch;
        const w = ctx.measureText(test).width;
        if (w <= maxWidth) {
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

  function calcBlockHeight(lines, fontSize, lineGap) {
    // 行高：字号 * 1.25 + gap
    const lineH = Math.round(fontSize * 1.25);
    return lines.length * lineH + (lines.length - 1) * lineGap;
  }

  async function loadImage(src) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    // 关键：等待 decode，避免“白屏但不报错”
    await img.decode();
    return img;
  }

  function drawTextBlock(text) {
    // 允许你直接整段粘贴
    const raw = (text || "").trim();
    if (!raw) return;

    // 自动挑字号：从大到小，能放下为止
    const maxSize = 48;
    const minSize = 22;
    const lineGap = 10;

    let best = null;

    for (let size = maxSize; size >= minSize; size--) {
      const lines = wrapTextToLines(raw, TEXT_BOX.w, size);
      const blockH = calcBlockHeight(lines, size, lineGap);

      if (blockH <= TEXT_BOX.h) {
        best = { size, lines, blockH };
        break;
      }
    }

    // 如果还放不下，就用最小字号并硬塞（也会在框内，但更密）
    if (!best) {
      const size = minSize;
      const lines = wrapTextToLines(raw, TEXT_BOX.w, size);
      const blockH = calcBlockHeight(lines, size, lineGap);
      best = { size, lines, blockH };
    }

    const { size, lines, blockH } = best;
    setFont(size);

    // ✅ 垂直居中（上下留白相等）
    let y = TEXT_BOX.y + Math.max(0, Math.floor((TEXT_BOX.h - blockH) / 2));
    const lineH = Math.round(size * 1.25);

    for (const line of lines) {
      // 左对齐更像“正式函件”；如果你要整体居中，把 x 改成居中计算
      const x = TEXT_BOX.x;
      ctx.fillText(line, x, y);
      y += lineH + lineGap;
    }
  }

  let lastBlobUrl = null;

  async function render() {
    try {
      btnDownload.disabled = true;

      // 1) 画模板
      const bg = await loadImage(TEMPLATE_SRC);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0, W, H);

      // 2) 画文字
      drawTextBlock(input.value);

      // 3) 生成下载
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
        lastBlobUrl = URL.createObjectURL(blob);
        btnDownload.disabled = false;
      }, "image/png", 1.0);

    } catch (e) {
      console.error("渲染失败：", e);
      alert(
        "预览生成失败：\n" +
        "1) 检查 template.png 是否在 reservation-maker/ 下\n" +
        "2) 检查路径是否为 ./template.png\n" +
        "3) 打开控制台看是否 404 或字体/图片加载错误"
      );
    }
  }

  btnRender.addEventListener("click", render);

  btnDownload.addEventListener("click", () => {
    if (!lastBlobUrl) return;
    const a = document.createElement("a");
    a.href = lastBlobUrl;
    a.download = "预约确认函.png";
    a.click();
  });

  // 进入页面先渲染一次（便于看预览是否正常）
  render();
})();
