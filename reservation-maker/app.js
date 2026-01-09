// =====================================================
// 预约确认函生成器（字段提取 + 两栏排版 + Icon 行）
// ✅ 强化模板加载：自动计算真实 URL、decode、失败提示
// ✅ 适配 template.png 原始尺寸（你的：1455×2192）
// ✅ 店名永远居中 + 预约人单独列在店名下方
// ✅ 日期/时间/人数 做成 icon 行（日式）
// ✅ 核心字段优先放左侧，过长的“非核心”自动下沉到右侧
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  let lastDataURL = null;
  let templateImg = new Image();
  let TEMPLATE_READY = false;

  // 按钮先锁住，避免模板未加载就生成导致黑屏
  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  // === 模板地址：用 document.baseURI 计算“真实路径”，避免相对路径踩坑 ===
  const TEMPLATE_SRC = new URL("./template.png", document.baseURI).href;
  console.log("[Template] loading:", TEMPLATE_SRC);

  // 为了兼容某些浏览器的 toDataURL 安全限制（同源通常不需要，但开着更稳）
  templateImg.crossOrigin = "anonymous";

  templateImg.onload = async () => {
    try {
      // 尝试 decode（更稳定，避免 onload 但 decode 未完成）
      if (templateImg.decode) await templateImg.decode();
    } catch (e) {
      // decode 失败不致命，继续
      console.warn("[Template] decode warn:", e);
    }

    TEMPLATE_READY = true;

    // ✅ 用模板真实尺寸设置 canvas
    canvas.width = templateImg.naturalWidth || templateImg.width;
    canvas.height = templateImg.naturalHeight || templateImg.height;

    btnGenerate.disabled = false;

    // 初始渲染：确认模板已能画出来
    renderToCanvas("请粘贴预约信息，然后点击「生成图片」");
  };

  templateImg.onerror = async () => {
    TEMPLATE_READY = false;

    // 尝试 fetch 一下看是不是 404 / 403（GitHub Pages 很好判断）
    let statusText = "";
    try {
      const r = await fetch(TEMPLATE_SRC, { cache: "no-store" });
      statusText = `fetch: ${r.status} ${r.statusText}`;
    } catch (e) {
      statusText = `fetch error: ${String(e)}`;
    }

    alert(
      "template.png 加载失败。\n\n" +
      "请检查：\n" +
      "1) 文件是否在 reservation-maker/ 目录\n" +
      "2) 文件名是否严格为 template.png（区分大小写）\n" +
      "3) 是否已 commit 并等待 Pages 刷新\n\n" +
      `当前尝试加载的 URL：\n${TEMPLATE_SRC}\n\n` +
      statusText
    );
  };

  // 强制不走缓存（你改了图但页面还旧时很关键）
  templateImg.src = TEMPLATE_SRC + `?v=${Date.now()}`;

  // 生成
  btnGenerate.addEventListener("click", () => {
    if (!TEMPLATE_READY) {
      alert("模板还没加载好，请刷新页面后重试。");
      return;
    }
    const raw = (inputEl.value || "").trim();
    if (!raw) {
      alert("请先粘贴预约信息");
      return;
    }
    renderToCanvas(raw);
    btnDownload.disabled = false;
  });

  // 下载
  btnDownload.addEventListener("click", () => {
    if (!lastDataURL) return;
    const a = document.createElement("a");
    a.href = lastDataURL;
    a.download = `预约确认函_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // =====================================================
  // 布局（按你最新大留白模板做的“稳妥默认值”）
  // 你只需要改这里四个比例：TEXT_AREA x/y/w/h
  // =====================================================
  function getLayout() {
    const W = canvas.width;
    const H = canvas.height;

    // 这是“金框内黑底可写区域”的估算（适配你最新留白更大的 template）
    // 如果你发现文字靠边：增大 padding 或把 x/y 往里推
    const TEXT_AREA = {
      x: Math.round(W * 0.10),
      y: Math.round(H * 0.28),
      w: Math.round(W * 0.80),
      h: Math.round(H * 0.50),
    };

    const padding = Math.round(Math.min(W, H) * 0.020); // ~28
    const colGap = Math.round(padding * 1.2);
    const colW = Math.floor((TEXT_AREA.w - padding * 2 - colGap) / 2);

    const headerH = Math.round((TEXT_AREA.h - padding * 2) * 0.30); // Header占比（店名/NO/预约人）

    const headerBox = {
      x: TEXT_AREA.x + padding,
      y: TEXT_AREA.y + padding,
      w: TEXT_AREA.w - padding * 2,
      h: headerH,
    };

    const bodyY = headerBox.y + headerBox.h;
    const bodyH = TEXT_AREA.h - padding * 2 - headerH;

    const leftBody = {
      x: TEXT_AREA.x + padding,
      y: bodyY,
      w: colW,
      h: bodyH,
    };

    const rightBody = {
      x: leftBody.x + colW + colGap,
      y: bodyY,
      w: colW,
      h: bodyH,
    };

    return { W, H, TEXT_AREA, padding, headerBox, leftBody, rightBody };
  }

  // =====================================================
  // 渲染入口
  // =====================================================
  function renderToCanvas(rawText) {
    if (!TEMPLATE_READY) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(templateImg, 0, 0, W, H);

    const fields = extractFields(rawText);
    drawReservationCard(fields);

    lastDataURL = canvas.toDataURL("image/png");
  }

  // =====================================================
  // 绘制：Header居中 + icon行 + 两栏
  // =====================================================
  function drawReservationCard(f) {
    const { headerBox, leftBody, rightBody, padding } = getLayout();

    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const MUTED = "rgba(243,243,244,0.78)";

    const familySans = `"PingFang SC","Hiragino Sans","Microsoft YaHei","Noto Sans CJK SC","Noto Sans CJK JP",sans-serif`;
    const familySerif = `"Times New Roman","Songti SC","STSong","Noto Serif SC","Noto Serif JP",serif`;

    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "center";

    // ---------- Header（店名/NO/预约人） ----------
    const restaurant = f.restaurant || "（未识别店名）";
    const guest = f.guest || "（未识别预约人）";
    const rid = f.rid ? `NO. ${f.rid}` : "";

    // 店名：自动适配单行
    const nameMax = Math.round(headerBox.h * 0.36);
    const nameMin = 30;
    const nameFont = fitSingleLineFont(restaurant, headerBox.w, nameMax, nameMin, 800, familySerif);

    // NO 和 预约人字号
    const ridFont = Math.max(22, Math.round(nameFont * 0.55));
    const guestFont = Math.max(24, Math.round(nameFont * 0.62));

    const gap = Math.max(10, Math.round(padding * 0.35));
    const totalH =
      nameFont +
      gap +
      (rid ? ridFont + gap : 0) +
      guestFont;

    let y = headerBox.y + Math.max(0, Math.floor((headerBox.h - totalH) / 2));

    // 店名（居中）
    ctx.fillStyle = WHITE;
    ctx.font = `800 ${nameFont}px ${familySerif}`;
    ctx.fillText(restaurant, headerBox.x + headerBox.w / 2, y);
    y += nameFont + gap;

    // 预约号（居中，金色）
    if (rid) {
      ctx.fillStyle = GOLD;
      ctx.font = `800 ${ridFont}px ${familySans}`;
      ctx.fillText(rid, headerBox.x + headerBox.w / 2, y);
      y += ridFont + gap;
    }

    // 预约人（单独列出，放店名下方）
    ctx.fillStyle = WHITE;
    ctx.font = `800 ${guestFont}px ${familySans}`;
    ctx.fillText(guest, headerBox.x + headerBox.w / 2, y);

    // ---------- Left：icon 行 + 核心字段 ----------
    const iconH = Math.max(90, Math.round(leftBody.h * 0.24));
    const iconBox = { x: leftBody.x, y: leftBody.y, w: leftBody.w, h: iconH };
    drawIconRow({
      box: iconBox,
      GOLD,
      WHITE,
      family: familySans,
      dateText: smartDate(f.dateRaw),
      timeText: smartTime(f.timeRaw),
      peopleText: smartPeople(f.peopleRaw),
    });

    const leftMainBox = {
      x: leftBody.x,
      y: leftBody.y + iconH,
      w: leftBody.w,
      h: leftBody.h - iconH,
    };

    // 核心：地址/电话/套餐/金额（但避免太长挤爆）
    const leftLines = [];

    if (f.address) leftLines.push(`地址：${limitText(f.address, 120)}`);
    if (f.phone && f.phone.toLowerCase() !== "na") leftLines.push(`电话：${f.phone}`);
    if (f.course) leftLines.push(`套餐：${limitText(f.course, 90)}`);
    if (f.price) leftLines.push(`金额：${f.price}`);

    drawParagraphAutoFit({
      text: leftLines.join("\n") || " ",
      box: leftMainBox,
      color: WHITE,
      fontFamily: familySans,
      fontWeight: 700,
      maxFont: 30,
      minFont: 20,
      lineHeight: 1.55,
      align: "left",
      vAlign: "top",
    });

    // ---------- Right：非核心/长文本下沉 ----------
    const extra = (f.extra || "").trim();
    const rightText = extra ? `补充信息：\n${extra}` : " ";

    drawParagraphAutoFit({
      text: rightText,
      box: rightBody,
      color: MUTED,
      fontFamily: familySans,
      fontWeight: 650,
      maxFont: 24,
      minFont: 18,
      lineHeight: 1.6,
      align: "left",
      vAlign: "top",
    });

    ctx.restore();
  }

  // =====================================================
  // Icon 行（日期/时间/人数）
  // =====================================================
  function drawIconRow({ box, GOLD, WHITE, family, dateText, timeText, peopleText }) {
    const pad = Math.round(Math.min(box.w, box.h) * 0.12);
    const segW = Math.floor(box.w / 3);

    const labelFont = 20;
    const valueMax = 30;

    // 细分割线
    ctx.save();
    ctx.strokeStyle = "rgba(215,180,106,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + Math.floor(box.h * 0.65));
    ctx.lineTo(box.x + box.w, box.y + Math.floor(box.h * 0.65));
    ctx.stroke();
    ctx.restore();

    drawIconSegment(box.x + 0 * segW, box.y, segW, box.h, "calendar", "日期", dateText || "—");
    drawIconSegment(box.x + 1 * segW, box.y, segW, box.h, "clock", "时间", timeText || "—");
    drawIconSegment(box.x + 2 * segW, box.y, segW, box.h, "people", "人数", peopleText || "—");

    function drawIconSegment(x, y, w, h, icon, label, value) {
      const iconSize = Math.round(Math.min(w, h) * 0.22);
      const ix = x + Math.round(w * 0.10);
      const iy = y + Math.round(h * 0.22);

      drawSimpleIcon(icon, ix, iy, iconSize, GOLD);

      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      ctx.fillStyle = GOLD;
      ctx.font = `800 ${labelFont}px ${family}`;
      ctx.fillText(label, ix + iconSize + 12, iy - 2);

      const maxW = w - (ix - x) - iconSize - 12 - Math.round(w * 0.08);
      const vFont = fitSingleLineFont(value, maxW, valueMax, 18, 800, family);

      ctx.fillStyle = WHITE;
      ctx.font = `800 ${vFont}px ${family}`;
      ctx.fillText(value, ix + iconSize + 12, iy + labelFont + 10);
    }
  }

  function drawSimpleIcon(type, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.floor(s * 0.08));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (type === "calendar") {
      ctx.strokeRect(x, y + s * 0.12, s, s * 0.88);
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.30);
      ctx.lineTo(x + s, y + s * 0.30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.25, y);
      ctx.lineTo(x + s * 0.25, y + s * 0.22);
      ctx.moveTo(x + s * 0.75, y);
      ctx.lineTo(x + s * 0.75, y + s * 0.22);
      ctx.stroke();
    } else if (type === "clock") {
      const cx = x + s / 2;
      const cy = y + s / 2 + s * 0.08;
      const r = s * 0.42;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - r * 0.55);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * 0.45, cy);
      ctx.stroke();
    } else if (type === "people") {
      const cx = x + s * 0.40;
      const cy = y + s * 0.46;
      const r = s * 0.18;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.32, cy + s * 0.04, r * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.14, y + s * 0.92);
      ctx.lineTo(x + s * 0.66, y + s * 0.92);
      ctx.stroke();
    }
    ctx.restore();
  }

  // =====================================================
  // 段落自动适配（换行 + 缩放 + 截断）
  // =====================================================
  function drawParagraphAutoFit({
    text,
    box,
    color,
    fontFamily,
    fontWeight,
    maxFont,
    minFont,
    lineHeight,
    align,
    vAlign
  }) {
    const maxW = box.w;
    const maxH = box.h;

    const cleaned = normalize(text);

    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";

    let fontSize = maxFont;

    while (fontSize >= minFont) {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const lines = wrapTextByBox(cleaned, maxW, ctx);
      const totalH = lines.length * fontSize * lineHeight;

      if (totalH <= maxH) {
        let y = box.y;
        if (vAlign === "center") y = box.y + (maxH - totalH) / 2;

        let x = box.x;
        for (const line of lines) {
          ctx.fillText(line, x, y);
          y += fontSize * lineHeight;
        }
        ctx.restore();
        return;
      }
      fontSize -= 2;
    }

    // 仍放不下：截断
    ctx.font = `${fontWeight} ${minFont}px ${fontFamily}`;
    const lines = wrapTextByBox(cleaned, maxW, ctx);
    const maxLines = Math.floor(maxH / (minFont * lineHeight));
    const clipped = lines.slice(0, Math.max(1, maxLines));

    clipped[clipped.length - 1] = clipWithEllipsis(clipped[clipped.length - 1]);

    let y = box.y;
    let x = box.x;
    for (const line of clipped) {
      ctx.fillText(line, x, y);
      y += minFont * lineHeight;
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
      const tokens = splitKeepWords(p);
      let line = "";

      for (const t of tokens) {
        const test = line ? line + t : t;
        if (ctx.measureText(test).width <= maxWidth) {
          line = test;
        } else {
          if (line) lines.push(line);
          line = t.trimStart();
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  function splitKeepWords(str) {
    const out = [];
    let buf = "";
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const isWord = /[A-Za-z0-9@._\-]/.test(ch);
      if (isWord) buf += ch;
      else {
        if (buf) { out.push(buf); buf = ""; }
        out.push(ch);
      }
    }
    if (buf) out.push(buf);
    return out;
  }

  function clipWithEllipsis(line) {
    if (!line) return "…";
    if (line.length <= 2) return "…";
    return line.slice(0, Math.max(0, line.length - 2)) + "…";
  }

  function fitSingleLineFont(text, maxW, maxFont, minFont, weight, family) {
    let size = maxFont;
    ctx.save();
    while (size >= minFont) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxW) {
        ctx.restore();
        return size;
      }
      size -= 2;
    }
    ctx.restore();
    return minFont;
  }

  function limitText(s, maxLen) {
    s = String(s || "").trim();
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen - 1) + "…";
  }

  // =====================================================
  // 字段提取（中/日/英）
  // =====================================================
  function extractFields(raw) {
    const text = normalize(raw);
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

    const get = (keys) => pickAfter(text, keys);
    const getLine = (re) => (match(text, re) || "");

    // 预约号
    const rid =
      get(["予約番号","予約ID","予約No","Reservation ID","Booking ID","Confirmation","Confirmation No","Confirmation #","No.","NO."]) ||
      getLine(/(?:予約番号|予約ID|No\.?|NO\.?|Reservation\s*(?:ID|No)|Booking\s*(?:ID|No)|Confirmation(?:\s*(?:No|#))?)\s*[:：#]?\s*([A-Za-z0-9\-]+)/i);

    // 店名
    const restaurant =
      get(["店舗名","店名","レストラン","レストラン名","Restaurant","Restaurant Name","Venue"]) ||
      guessRestaurant(lines);

    // 预约人（必须单独提取）
    const guest =
      get(["予約人","予約者","予約名","お名前","ご予約名","氏名","Reservation Name","Name","Guest","Guest Name","Booker"]) ||
      guessGuest(lines);

    // 日期 / 时间 / 人数
    const dateRaw =
      get(["日時","予約日時","予約日付","予約日","日付","Date","Reservation Date","Booking Date"]) ||
      getLine(/(?:Date|Reservation Date|Booking Date)\s*[:：]\s*([^\n]+)/i) ||
      getLine(/(\d{4}年\d{1,2}月\d{1,2}日|(?:\d{1,2}月\d{1,2}日)|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);

    const timeRaw =
      get(["時間","予約時間","来店時間","Time","Reservation Time","Booking Time"]) ||
      getLine(/(?:Time|Reservation Time|Booking Time)\s*[:：]\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)/i) ||
      getLine(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i) ||
      getLine(/(\d{1,2}:\d{2})/);

    const peopleRaw =
      get(["人数","予約人数","ご利用人数","Seats","Guests","Party Size","People"]) ||
      getLine(/(?:Seats|Guests|Party Size|People)\s*[:：]\s*(\d{1,2})/i) ||
      getLine(/(\d{1,2})\s*(?:名|人)/);

    // 地址 / 电话
    const address =
      get(["住所","所在地","Address","Location"]) ||
      guessAddress(lines);

    const phone =
      get(["電話番号","電話","TEL","Tel","Phone","Telephone"]) ||
      getLine(/(?:Phone|Telephone|TEL|Tel)\s*[:：]\s*([+()0-9\-\s]{6,})/i) ||
      getLine(/(\d{2,4}-\d{2,4}-\d{3,4})/);

    // 套餐（尽量抓短字段）
    const course =
      get(["コース名","コース","Course","Menu","Plan"]) || "";

    // 金额
    const price =
      get(["総額","合計","金額","Total Price","Total","Price"]) ||
      getLine(/(?:Total\s*Price|Total|Price)\s*[:：]\s*([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
      getLine(/([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
      "";

    // extra：尽量保留长说明（NO SHOW/服务费/注意事项等）
    const extra = buildExtra(lines);

    return {
      rid: (rid || "").trim(),
      restaurant: (restaurant || "").trim(),
      guest: (guest || "").trim(),
      dateRaw: (dateRaw || "").trim(),
      timeRaw: (timeRaw || "").trim(),
      peopleRaw: (peopleRaw || "").trim(),
      address: (address || "").trim(),
      phone: (phone || "").trim(),
      course: (course || "").trim(),
      price: (price || "").trim(),
      extra: (extra || "").trim(),
    };
  }

  function buildExtra(lines) {
    // 只过滤明显的 “key: value” 行，避免误删（比如 NO SHOW 含 no）
    const dropKeyRe = /^(予約番号|予約ID|店舗名|店名|レストラン|Restaurant|Reservation\s*ID|Booking\s*ID|Confirmation|予約人|予約者|Reservation\s*Name|Name|Guest|日時|予約日時|Date|Time|人数|Seats|Guests|住所|Address|電話|Phone|TEL|コース名|コース|Course|Total\s*Price|Total|合計|総額)\s*[:：]/i;
    const extraLines = lines.filter(l => !dropKeyRe.test(l));
    return extraLines.join("\n");
  }

  // ---------------- helpers ----------------
  function normalize(s) {
    return String(s || "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[：]\s*/g, "：")
      .replace(/[ ]{2,}/g, " ")
      .trim();
  }

  function match(text, re) {
    const m = text.match(re);
    return m ? (m[1] || "").trim() : "";
  }

  function pickAfter(text, keys) {
    for (const k of keys) {
      const re = new RegExp(`${escapeRe(k)}\\s*[:：]\\s*([^\\n]+)`, "i");
      const m = text.match(re);
      if (m && m[1]) return m[1].trim();
    }
    // key在一行，值在下一行
    const arr = text.split("\n");
    for (let i = 0; i < arr.length; i++) {
      const line = arr[i].trim();
      for (const k of keys) {
        if (new RegExp(`^${escapeRe(k)}$`, "i").test(line)) {
          const next = (arr[i + 1] || "").trim();
          if (next) return next;
        }
      }
    }
    return "";
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function guessRestaurant(lines) {
    const bad = /(Date|Time|Seats|Guests|住所|電話|Phone|Address|予約番号|予約ID|NO\.|No\.)/i;
    const cand = lines.find(l => l.length >= 2 && l.length <= 40 && !bad.test(l));
    return cand || "";
  }

  function guessGuest(lines) {
    const cand1 = lines.find(l => /(様|先生|女士)/.test(l));
    if (cand1) return cand1;
    const cand2 = lines.find(l => /Reservation Name\s*[:：]/i.test(l));
    if (cand2) return cand2.split(/[:：]/)[1]?.trim() || "";
    return "";
  }

  function guessAddress(lines) {
    const cand = lines.find(l => /(〒|東京都|大阪府|京都府|Japan|Tokyo|Osaka|Kyoto|City|Chome|Meguro)/i.test(l));
    if (!cand) return "";
    const idx = lines.indexOf(cand);
    const next1 = lines[idx + 1] || "";
    const next2 = lines[idx + 2] || "";
    const joinable = (s) => s && s.length <= 60 && !/(Phone|TEL|電話|Time|Date|Seats|Guests|予約)/i.test(s);
    let addr = cand;
    if (joinable(next1)) addr += ` ${next1}`;
    if (joinable(next2)) addr += ` ${next2}`;
    return addr.trim();
  }

  // 统一展示：日期/时间/人数
  function smartDate(s) {
    if (!s) return "";
    s = String(s).trim();
    s = s.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+/i, "");
    const map = {
      January:"Jan", February:"Feb", March:"Mar", April:"Apr", May:"May", June:"Jun",
      July:"Jul", August:"Aug", September:"Sep", October:"Oct", November:"Nov", December:"Dec"
    };
    for (const k in map) {
      const re = new RegExp("\\b" + k + "\\b", "i");
      if (re.test(s)) { s = s.replace(re, map[k]); break; }
    }
    // 日文“1月8日(木) 18:00～”中，如果误带了时间，剪掉
    s = s.replace(/\s+\d{1,2}:\d{2}.*$/, "");
    return s;
  }

  function smartTime(s) {
    if (!s) return "";
    s = String(s).trim();
    s = s.replace(/[～~].*$/, "").trim();
    return s;
  }

  function smartPeople(s) {
    if (!s) return "";
    const m = String(s).match(/\d{1,2}/);
    if (m) return `${m[0]}名`;
    return String(s).trim();
  }
});
