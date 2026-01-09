// ====== 预约确认函生成器（字段提取 + 两栏排版 + Icon 行）======
// 目录：reservation-maker/
// 文件同目录：index.html / style.css / app.js / template.png
// ✅ 新增：时间两行（日式）——主行“到店时间”，副行“～退店/结束时间”
// ✅ 日期主行固定 YYYY/MM/DD，副行 (火)/Tue
(() => {
  // ---------- DOM ----------
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  let lastDataURL = null;
  let TEMPLATE_READY = false;

  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  // ---------- Load template ----------
  const templateImg = new Image();
  templateImg.src = `./template.png?v=${Date.now()}`;

  templateImg.onload = () => {
    TEMPLATE_READY = true;

    canvas.width = templateImg.naturalWidth;
    canvas.height = templateImg.naturalHeight;

    btnGenerate.disabled = false;
    renderToCanvas("请粘贴预约信息，然后点击「生成图片」");
  };

  templateImg.onerror = () => {
    alert("template.png 加载失败：请确认 app.js 与 template.png 在同一目录，且文件名大小写完全一致。");
  };

  // ---------- Events ----------
  btnGenerate.addEventListener("click", () => {
    if (!TEMPLATE_READY) {
      alert("模板还没加载完成，请稍等 1 秒或刷新页面再试。");
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
  // Layout（微调：金框内区域）
  // =====================================================
  function getLayout() {
    const W = canvas.width;
    const H = canvas.height;

    const TEXT_AREA = {
      x: Math.round(W * 0.11),
      y: Math.round(H * 0.30),
      w: Math.round(W * 0.78),
      h: Math.round(H * 0.46),
    };

    const padding = Math.round(Math.min(W, H) * 0.018);
    const colGap = Math.round(padding * 1.2);
    const colW = Math.floor((TEXT_AREA.w - padding * 2 - colGap) / 2);

    const headerH = Math.round((TEXT_AREA.h - padding * 2) * 0.30);

    const headerBox = {
      x: TEXT_AREA.x + padding,
      y: TEXT_AREA.y + padding,
      w: TEXT_AREA.w - padding * 2,
      h: headerH,
    };

    const leftBody = {
      x: TEXT_AREA.x + padding,
      y: headerBox.y + headerBox.h,
      w: colW,
      h: (TEXT_AREA.h - padding * 2) - headerH,
    };

    const rightBody = {
      x: leftBody.x + colW + colGap,
      y: leftBody.y,
      w: colW,
      h: leftBody.h,
    };

    return { W, H, padding, headerBox, leftBody, rightBody };
  }

  // =====================================================
  // Render
  // =====================================================
  function renderToCanvas(rawText) {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.drawImage(templateImg, 0, 0, W, H);

    const fields = extractFields(rawText);
    drawReservationCard(fields);

    lastDataURL = canvas.toDataURL("image/png");
  }

  // =====================================================
  // Draw Card（核心）
  // =====================================================
  function drawReservationCard(f) {
    const { headerBox, leftBody, rightBody, padding } = getLayout();

    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const MUTED = "rgba(243,243,244,0.82)";

    const SANS = `"SimHei","PingFang SC","Hiragino Sans","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;
    const SERIF = `"SimHei","Noto Serif JP","Noto Serif SC","Times New Roman",serif`;

    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "center";

    // ---------- Header ----------
    const restaurant = (f.restaurant || "（未识别店名）").trim();
    const guest = (f.guest || "（未识别预约人）").trim();
    const rid = (f.rid || "").trim();
    const ridLine = rid ? `NO. ${rid}` : "";

    const nameMax = Math.round(headerBox.h * 0.34);
    const nameMin = 30;
    const nameFont = fitSingleLineFont(restaurant, headerBox.w, nameMax, nameMin, 800, SERIF);

    const ridFont = Math.max(20, Math.round(nameFont * 0.55));
    const guestFont = Math.max(22, Math.round(nameFont * 0.62));

    const lineGap = Math.round(padding * 0.45);
    const totalH = nameFont + lineGap + (ridLine ? ridFont + lineGap : 0) + guestFont;

    let y = headerBox.y + Math.max(0, Math.floor((headerBox.h - totalH) / 2));

    ctx.fillStyle = WHITE;
    ctx.font = `800 ${nameFont}px ${SERIF}`;
    ctx.fillText(restaurant, headerBox.x + headerBox.w / 2, y);
    y += nameFont + lineGap;

    if (ridLine) {
      ctx.fillStyle = GOLD;
      ctx.font = `900 ${ridFont}px ${SANS}`;
      ctx.fillText(ridLine, headerBox.x + headerBox.w / 2, y);
      y += ridFont + lineGap;
    }

    ctx.fillStyle = WHITE;
    ctx.font = `800 ${guestFont}px ${SANS}`;
    ctx.fillText(guest, headerBox.x + headerBox.w / 2, y);

    // ---------- Left Body ----------
    const iconRowH = Math.round(leftBody.h * 0.28);
    const iconBox = { x: leftBody.x, y: leftBody.y, w: leftBody.w, h: iconRowH };
    const mainLeftBox = {
      x: leftBody.x,
      y: leftBody.y + iconRowH,
      w: leftBody.w,
      h: leftBody.h - iconRowH,
    };

    drawIconRow({
      box: iconBox,
      dateParts: smartDateParts(f.dateRaw),
      timeParts: smartTimeParts(f.timeRaw),
      peopleText: smartPeople(f.peopleRaw),
      GOLD,
      WHITE,
      family: SANS,
    });

    const leftLines = [];
    if (f.address) leftLines.push(`地址：${f.address}`);
    if (f.phone && f.phone.toLowerCase() !== "na") leftLines.push(`电话：${f.phone}`);
    if (f.course) leftLines.push(`套餐：${f.course}`);
    if (f.price) leftLines.push(`金额：${f.price}`);

    drawParagraphAutoFit({
      text: leftLines.join("\n") || " ",
      box: mainLeftBox,
      color: WHITE,
      fontFamily: SANS,
      fontWeight: 750,
      maxFont: 34,
      minFont: 22,
      lineHeight: 1.45,
      align: "left",
    });

    // ---------- Right Body ----------
    const extra = (f.extra || "").trim();
    drawParagraphAutoFit({
      text: extra ? `补充信息：\n${extra}` : " ",
      box: rightBody,
      color: MUTED,
      fontFamily: SANS,
      fontWeight: 650,
      maxFont: 26,
      minFont: 18,
      lineHeight: 1.55,
      align: "left",
    });

    ctx.restore();
  }

  // =====================================================
  // Icon Row（日期/时间/人数）— 日期两行；时间两行（日式）
  // =====================================================
  function drawIconRow({ box, dateParts, timeParts, peopleText, GOLD, WHITE, family }) {
    const segW = Math.floor(box.w / 3);

    // 淡横线
    ctx.save();
    ctx.strokeStyle = "rgba(215,180,106,0.20)";
    ctx.lineWidth = 2;
    const midY = box.y + Math.floor(box.h * 0.56);
    ctx.beginPath();
    ctx.moveTo(box.x, midY);
    ctx.lineTo(box.x + box.w, midY);
    ctx.stroke();
    ctx.restore();

    drawIconSegmentTwoLine({
      x: box.x + 0 * segW,
      y: box.y,
      w: segW,
      h: box.h,
      icon: "calendar",
      label: "日期",
      main: (dateParts?.main || "—"),
      sub: (dateParts?.sub || ""),
      GOLD,
      WHITE,
      family,
      mainMax: 30,
    });

    drawIconSegmentTwoLine({
      x: box.x + 1 * segW,
      y: box.y,
      w: segW,
      h: box.h,
      icon: "clock",
      label: "时间",
      main: (timeParts?.main || "—"),
      sub: (timeParts?.sub || ""),
      GOLD,
      WHITE,
      family,
      mainMax: 32,
    });

    drawIconSegmentTwoLine({
      x: box.x + 2 * segW,
      y: box.y,
      w: segW,
      h: box.h,
      icon: "people",
      label: "人数",
      main: peopleText || "—",
      sub: "",
      GOLD,
      WHITE,
      family,
      mainMax: 34,
    });
  }

  function drawIconSegmentTwoLine({ x, y, w, h, icon, label, main, sub, GOLD, WHITE, family, mainMax }) {
    const iconSize = Math.round(Math.min(w, h) * 0.22);
    const iconX = x + Math.round(w * 0.10);
    const iconY = y + Math.round(h * 0.30);

    drawSimpleIcon(icon, iconX, iconY, iconSize, GOLD);

    // label
    ctx.fillStyle = GOLD;
    ctx.font = `900 20px ${family}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, iconX + iconSize + 12, iconY - 6);

    const maxW = w - (iconX - x) - iconSize - 12 - Math.round(w * 0.08);

    // main
    const mainFont = fitSingleLineFont(main, maxW, mainMax, 14, 900, family);
    ctx.fillStyle = WHITE;
    ctx.font = `900 ${mainFont}px ${family}`;
    ctx.fillText(main, iconX + iconSize + 12, iconY + 18);

    // sub
    if (sub) {
      const subFont = Math.max(12, Math.round(mainFont * 0.55));
      ctx.fillStyle = "rgba(243,243,244,0.82)";
      ctx.font = `800 ${subFont}px ${family}`;
      ctx.fillText(sub, iconX + iconSize + 12, iconY + 18 + mainFont + 6);
    }
  }

  // =====================================================
  // Simple Icons
  // =====================================================
  function drawSimpleIcon(type, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
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
  // Paragraph AutoFit
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
    align
  }) {
    const cleaned = normalize(text);
    const maxW = box.w;
    const maxH = box.h;

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
        for (const line of lines) {
          ctx.fillText(line, box.x, y);
          y += fontSize * lineHeight;
        }
        ctx.restore();
        return;
      }
      fontSize -= 2;
    }

    ctx.font = `${fontWeight} ${minFont}px ${fontFamily}`;
    const lines = wrapTextByBox(cleaned, maxW, ctx);
    const maxLines = Math.max(1, Math.floor(maxH / (minFont * lineHeight)));
    const clipped = lines.slice(0, maxLines);
    if (clipped.length) clipped[clipped.length - 1] = clipWithEllipsis(clipped[clipped.length - 1]);

    let y = box.y;
    for (const line of clipped) {
      ctx.fillText(line, box.x, y);
      y += minFont * lineHeight;
    }
    ctx.restore();
  }

  function clipWithEllipsis(line) {
    if (!line) return "…";
    if (line.length <= 2) return "…";
    return line.slice(0, Math.max(0, line.length - 2)) + "…";
  }

  function wrapTextByBox(text, maxWidth, ctx) {
    const paragraphs = String(text).split("\n");
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
        if (buf) out.push(buf), (buf = "");
        out.push(ch);
      }
    }
    if (buf) out.push(buf);
    return out;
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

  // =====================================================
  // 日期：主行 YYYY/MM/DD；副行 (火)/Tue
  // =====================================================
  function smartDateParts(input) {
    if (!input) return { main: "—", sub: "" };
    let s = String(input).trim().replace(/\s{2,}/g, " ");

    let englishDow = "";
    const mDow = s.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
    if (mDow) englishDow = mDow[1].slice(0, 3);
    s = s.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+/i, "");

    let y = "", m = "", d = "", jpDow = "";

    // 2026年01月20日(火)
    let m1 = s.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日(?:\s*\(([^)]+)\))?/);
    if (m1) {
      y = m1[1]; m = m1[2]; d = m1[3]; jpDow = m1[4] || "";
    } else {
      // 2026-01-20 / 2026/01/20
      let m2 = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (m2) {
        y = m2[1]; m = m2[2]; d = m2[3];
      } else {
        // February 10, 2026 / Feb 10, 2026
        let m3 = s.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/i);
        if (m3) {
          const mm = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
          const k = m3[1].slice(0,3).toLowerCase();
          y = m3[3]; m = String(mm[k] || ""); d = m3[2];
        }
      }
    }

    const mm = m ? String(m).padStart(2, "0") : "";
    const dd = d ? String(d).padStart(2, "0") : "";

    const main = (y && mm && dd) ? `${y}/${mm}/${dd}` : (s.length > 12 ? s.slice(0, 12) : s);
    const sub = jpDow ? `(${jpDow})` : (englishDow ? englishDow : "");
    return { main, sub };
  }

  // =====================================================
  // 时间：两行（日式）
  // 主行：到店时间（18:00 / 8:30 PM）
  // 副行：～退店/结束（～14:00 / ~10:00 PM）或 “入店〜退店”里的后半段
  // =====================================================
  function smartTimeParts(input) {
    if (!input) return { main: "—", sub: "" };
    let s = String(input).trim().replace(/\s{2,}/g, " ");

    // 常见： "12:00 入店〜14:00 退店"
    // 提取两个时间：start/end
    const times = s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi) || [];
    if (times.length >= 2) {
      const start = normalizeTimeToken(times[0]);
      const end = normalizeTimeToken(times[1]);
      return { main: start, sub: `～${end}` };
    }

    // 含波浪或 ~ ： "18:00～" / "18:00~20:00"
    if (/[～~]/.test(s)) {
      const parts = s.split(/[～~]/).map(t => t.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const start = normalizeTimeToken(parts[0]);
        const end = normalizeTimeToken(parts[1].match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i)?.[1] || parts[1]);
        return { main: start, sub: `～${end}` };
      }
      const start = normalizeTimeToken(parts[0] || s);
      return { main: start, sub: "" };
    }

    // 单时间： "18:00" / "8:30 PM"
    const single = s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (single) return { main: normalizeTimeToken(single[1]), sub: "" };

    // 兜底
    return { main: s.length > 10 ? s.slice(0, 10) : s, sub: "" };
  }

  function normalizeTimeToken(t) {
    if (!t) return "";
    let s = String(t).trim().replace(/\s{2,}/g, " ");
    // 18:00～ -> 18:00
    s = s.replace(/[～~].*$/, "").trim();
    return s;
  }

  function smartPeople(s) {
    if (!s) return "";
    const m = String(s).match(/\d{1,2}/);
    if (m) return `${m[0]}名`;
    return String(s).trim();
  }

  // =====================================================
  // Field Extraction
  // =====================================================
  function extractFields(raw) {
    const text = normalize(raw);
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

    const get = (keys) => pickAfter(text, keys);
    const getLine = (re) => (match(text, re) || "");

    const rid =
      get([
        "予約番号","予約ID","予約No","NO.","No.","NO：","No：",
        "Reservation ID","Reservation No","Booking ID","Booking No","Confirmation","Confirmation No","Confirmation #"
      ]) ||
      getLine(/(?:予約番号|予約ID|No\.?|NO\.?|Reservation\s*(?:ID|No)|Booking\s*(?:ID|No)|Confirmation(?:\s*(?:No|#))?)\s*[:：#]?\s*([A-Za-z0-9\-]+)/i);

    const restaurant =
      get(["店舗名","店名","レストラン","レストラン名","店舗","お店","Restaurant","Restaurant Name","Venue"]) ||
      guessRestaurant(lines);

    const guest =
      get(["予約人","予約者","予約名","お名前","ご予約名","氏名","Reservation Name","Name","Guest","Guest Name","Booker"]) ||
      guessGuest(lines);

    const dateRaw =
      get(["日時","予約日時","予約日付","予約日","日付","来店日","Date","Reservation Date","Booking Date"]) ||
      getLine(/(?:Date|Reservation Date|Booking Date)\s*[:：]\s*([^\n]+)/i) ||
      getLine(/(\d{4}年\d{1,2}月\d{1,2}日(?:\([^)]+\))?|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/);

    const timeRaw =
      get(["時間","予約時間","来店時間","Time","Reservation Time","Booking Time"]) ||
      getLine(/(?:Time|Reservation Time|Booking Time)\s*[:：]\s*([^\n]+)/i) ||
      getLine(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)(?:\s*[～~]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i);

    const peopleRaw =
      get(["人数","予約人数","ご利用人数","Seats","Guests","Party Size","People"]) ||
      getLine(/(?:Seats|Guests|Party Size|People)\s*[:：]\s*(\d{1,2})/i) ||
      getLine(/(\d{1,2})\s*(?:名|人)/);

    const address =
      get(["住所","所在地","アドレス","Address","Venue Address","Location"]) ||
      guessAddress(lines);

    const phone =
      get(["電話番号","電話","TEL","Tel","Phone","Telephone","Contact"]) ||
      getLine(/(?:Phone|Telephone|TEL|Tel)\s*[:：]\s*([+()0-9\-\s]{6,})/i) ||
      getLine(/(\d{2,4}-\d{2,4}-\d{3,4})/);

    const course =
      get(["コース","コース名","コース料金","コース内容","Course","Menu","Package","Plan"]) || "";

    const price =
      get(["総額","合計","料金","金額","Total Price","Total","Price"]) ||
      getLine(/(?:Total\s*Price|Total|Price)\s*[:：]\s*([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
      getLine(/([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
      "";

    const usedKeys = [
      "予約番号","予約id","reservation id","booking id","confirmation","no.",
      "店舗名","店名","レストラン","restaurant","venue",
      "予約人","予約者","予約名","reservation name","guest",
      "日時","予約日時","date","time",
      "人数","予約人数","seats","guests","party size",
      "住所","address",
      "電話番号","電話","phone","tel",
      "コース","course","menu",
      "total price","total","price","合計","総額","金額","料金"
    ];
    const extraLines = lines.filter(l => !usedKeys.some(k => l.toLowerCase().includes(k)));
    const extra = extraLines.join("\n").trim();

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
      extra
    };
  }

  // ---------- helpers ----------
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
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const k of keys) {
        if (new RegExp(`^\\s*${escapeRe(k)}\\s*$`, "i").test(line)) {
          const next = (lines[i + 1] || "").trim();
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
    for (const l of lines) {
      if (/^Restaurant\s*[:：]/i.test(l)) return (l.split(/[:：]/)[1] || "").trim();
    }
    const bad = /(Date|Time|Seats|Guests|住所|電話|Phone|Address|予約番号|予約ID|NO\.|No\.)/i;
    const cand = lines.find(l => l.length >= 2 && l.length <= 40 && !bad.test(l));
    return cand || "";
  }

  function guessGuest(lines) {
    for (const l of lines) {
      if (/Reservation Name\s*[:：]/i.test(l)) return (l.split(/[:：]/)[1] || "").trim();
    }
    const cand = lines.find(l => /(様|さん|先生|女士|Guest|Name)/i.test(l));
    return cand || "";
  }

  function guessAddress(lines) {
    const cand = lines.find(l => /(〒|東京都|大阪府|京都府|Japan|Tokyo|Osaka|Kyoto)/i.test(l));
    if (!cand) return "";
    const idx = lines.indexOf(cand);
    const next1 = lines[idx + 1] || "";
    const next2 = lines[idx + 2] || "";
    const joinable = (s) =>
      s && s.length <= 60 && !/(Phone|TEL|電話|Time|Date|Seats|Guests|予約)/i.test(s);

    let addr = cand;
    if (joinable(next1)) addr += ` ${next1}`;
    if (joinable(next2)) addr += ` ${next2}`;
    return addr.trim();
  }
})();
