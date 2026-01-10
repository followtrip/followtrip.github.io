// ====== 预约确认函生成器（字段提取 + 两栏排版 + 4格 Icon 行）======
// 文件同目录：template.png / index.html / style.css / app.js
// 依赖 DOM：#input #canvas #btnGenerate #btnDownload
(() => {
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  let lastDataURL = null;
  let TEMPLATE_READY = false;

  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  // ----------------------------
  // 模板加载：加 cache bust，避免换图后读旧缓存导致“黑屏像没加载”
  // ----------------------------
  const templateImg = new Image();
  templateImg.src = `./template.png?v=${Date.now()}`;

  templateImg.onload = () => {
    TEMPLATE_READY = true;
    canvas.width = templateImg.naturalWidth;
    canvas.height = templateImg.naturalHeight;
    btnGenerate.disabled = false;
    renderPlaceholder();
  };

  templateImg.onerror = () => {
    drawFatal("❌ template.png 加载失败", [
      "请检查：",
      "1) 文件名必须是 template.png（大小写一致）",
      "2) 必须和 index.html / app.js 在同一目录",
      "3) GitHub Pages 可能有缓存，强刷：Ctrl+Shift+R / Cmd+Shift+R",
    ]);
  };

  btnGenerate.addEventListener("click", () => {
    if (!TEMPLATE_READY) return;
    const raw = (inputEl.value || "").trim();
    if (!raw) {
      alert("请先粘贴预约信息");
      return;
    }
    try {
      renderToCanvas(raw);
      btnDownload.disabled = false;
    } catch (e) {
      console.error(e);
      drawFatal("❌ 渲染出错（不会黑屏）", [
        String(e?.message || e),
        "请把 Console 的错误信息发我，我能继续定位。",
      ]);
    }
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
  // 布局：按模板尺寸比例计算（你模板 1455×2192 适用）
  // =====================================================
  function getLayout() {
    const W = canvas.width;
    const H = canvas.height;

    // 金框内可用区域（保守安全）
    const TEXT_AREA = {
      x: Math.round(W * 0.10),
      y: Math.round(H * 0.285),
      w: Math.round(W * 0.80),
      h: Math.round(H * 0.50),
    };

    const padding = Math.round(Math.min(W, H) * 0.018);
    const colGap = Math.round(padding * 1.1);
    const colW = Math.floor((TEXT_AREA.w - padding * 2 - colGap) / 2);

    const leftCol = {
      x: TEXT_AREA.x + padding,
      y: TEXT_AREA.y + padding,
      w: colW,
      h: TEXT_AREA.h - padding * 2,
    };

    const rightCol = {
      x: leftCol.x + colW + colGap,
      y: leftCol.y,
      w: colW,
      h: leftCol.h,
    };

    // header：店名 / 预约人 / NO（居中）
    const headerH = Math.round(leftCol.h * 0.30);
    const headerBox = {
      x: TEXT_AREA.x + padding,
      y: TEXT_AREA.y + padding,
      w: TEXT_AREA.w - padding * 2,
      h: headerH,
    };

    const bodyY = headerBox.y + headerH;
    const bodyH = leftCol.h - headerH;

    const leftBody = { x: leftCol.x, y: bodyY, w: leftCol.w, h: bodyH };
    const rightBody = { x: rightCol.x, y: bodyY, w: rightCol.w, h: bodyH };

    return { W, H, TEXT_AREA, padding, headerBox, leftBody, rightBody };
  }

  // =====================================================
  // Render
  // =====================================================
  function renderPlaceholder() {
    const { W, H } = canvas;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(templateImg, 0, 0, W, H);

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(H * 0.03)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillText("请粘贴预约信息，然后点击「生成图片」", W / 2, Math.round(H * 0.52));
    ctx.restore();

    lastDataURL = canvas.toDataURL("image/png");
  }

  function renderToCanvas(rawText) {
    const { W, H } = canvas;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(templateImg, 0, 0, W, H);

    const fields = extractFields(rawText);
    drawReservationCard(fields);

    lastDataURL = canvas.toDataURL("image/png");
  }

  function drawFatal(title, lines) {
    canvas.width = 1200;
    canvas.height = 820;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = `700 30px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillText(title, 60, 110);
    ctx.font = `400 20px "PingFang SC","Microsoft YaHei",sans-serif`;
    let y = 170;
    for (const l of lines || []) {
      ctx.fillText(l, 60, y);
      y += 34;
    }
  }

  // =====================================================
  // 绘制：店名居中 + 预约人紧贴下方 + NO + 4格 icon 行 + 主信息/备注
  // =====================================================
  function drawReservationCard(f) {
    const { padding, headerBox, leftBody, rightBody } = getLayout();

    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const MUTED = "rgba(243,243,244,0.78)";

    ctx.save();
    ctx.textBaseline = "top";

    // ---------- Header ----------
    const restaurant = (f.restaurant || "（未识别店名）").trim();
    const guest = (f.guest || "（未识别预约人）").trim();
    const ridLine = f.rid ? `NO. ${f.rid}` : "";

    const nameFamily = `"SimHei","Noto Serif JP","Noto Serif SC","Times New Roman",serif`;
    const nameFont = fitSingleLineFont(restaurant, headerBox.w, Math.round(headerBox.h * 0.34), 34, 800, "serif");

    const guestFont = Math.max(26, Math.round(headerBox.h * 0.16));
    const ridFont = Math.max(22, Math.round(headerBox.h * 0.14));
    const gap = Math.round(padding * 0.35);

    // 店名 + 预约人 + NO（NO 放第三行，避免占掉“预约人贴店名下方”的视觉）
    const totalH = nameFont + gap + guestFont + (ridLine ? gap + ridFont : 0);
    let y = headerBox.y + Math.max(0, Math.floor((headerBox.h - totalH) / 2));

    // 店名（居中）
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.font = `800 ${nameFont}px ${nameFamily}`;
    ctx.fillText(restaurant, headerBox.x + headerBox.w / 2, y);
    y += nameFont + gap;

    // 预约人（紧贴店名下方）
    ctx.fillStyle = WHITE;
    ctx.font = `800 ${guestFont}px "SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;
    ctx.fillText(guest, headerBox.x + headerBox.w / 2, y);
    y += guestFont + gap;

    // NO（第三行）
    if (ridLine) {
      ctx.fillStyle = GOLD;
      ctx.font = `800 ${ridFont}px "SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;
      ctx.fillText(ridLine, headerBox.x + headerBox.w / 2, y);
    }

    // ---------- Body ----------
    const iconRowH = Math.round(leftBody.h * 0.25);
    const iconRowBox = { x: leftBody.x, y: leftBody.y, w: leftBody.w, h: iconRowH };

    drawIconRow4({
      box: iconRowBox,
      dateText: formatDateYYYYMMDD(f.dateRaw),
      timeText: formatTimeHHMM(f.timeRaw),     // ✅ 修复英文 8:30 PM
      peopleText: formatPeople(f.peopleRaw),
      seatText: f.seatRaw ? cleanLeadSymbols(f.seatRaw) : "—",
      GOLD,
      WHITE,
    });

    const leftMainBox = { x: leftBody.x, y: leftBody.y + iconRowH, w: leftBody.w, h: leftBody.h - iconRowH };

    // 主信息：尽量不丢（电话/备注现在也能进右栏 extra，不会“被屏蔽”）
    const leftLines = [];
    if (f.address) leftLines.push(`地址：${f.address}`);
    if (f.phone && f.phone.toLowerCase() !== "na") leftLines.push(`电话：${f.phone}`);
    if (f.course) leftLines.push(`套餐：${f.course}`);
    if (f.price) leftLines.push(`金额：${f.price}`);

    drawParagraphAutoFit({
      text: leftLines.join("\n"),
      box: leftMainBox,
      color: WHITE,
      fontFamily: `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`,
      fontWeight: 750,
      maxFont: 36,
      minFont: 24,
      lineHeight: 1.45,
      align: "left",
      topPad: Math.round(padding * 0.35),
    });

    // 右栏：备注/用途/注意事项/来店频度/要望等
    const extra = (f.extra || "").trim();
    const rightText = extra ? `备注：\n${extra}` : "";

    drawParagraphAutoFit({
      text: rightText,
      box: rightBody,
      color: MUTED,
      fontFamily: `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`,
      fontWeight: 650,
      maxFont: 28,
      minFont: 20,
      lineHeight: 1.5,
      align: "left",
      topPad: Math.round(padding * 0.35),
    });

    ctx.restore();
  }

  // =====================================================
  // Icon 行（4格：日期/时间/人数/席位）——席位做突出底色
  // =====================================================
  function drawIconRow4({ box, dateText, timeText, peopleText, seatText, GOLD, WHITE }) {
    const pad = Math.round(Math.min(box.w, box.h) * 0.08);
    const x = box.x;
    const y = box.y + pad;
    const w = box.w;
    const h = box.h - pad * 2;
    const segW = Math.floor(w / 4);
    const family = `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;

    // 分隔线（淡金）
    ctx.save();
    ctx.strokeStyle = "rgba(215,180,106,0.22)";
    ctx.lineWidth = 2;
    const lineY = box.y + Math.floor(box.h * 0.62);
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + w, lineY);
    ctx.stroke();
    ctx.restore();

    drawIconSegmentV2({ x: x + segW * 0, y, w: segW, h, icon: "calendar", label: "日期", value: dateText || "—", GOLD, WHITE, family, valueMaxFont: 34, valueMinFont: 22, highlight: false });
    drawIconSegmentV2({ x: x + segW * 1, y, w: segW, h, icon: "clock",    label: "时间", value: timeText || "—", GOLD, WHITE, family, valueMaxFont: 36, valueMinFont: 22, highlight: false });
    drawIconSegmentV2({ x: x + segW * 2, y, w: segW, h, icon: "person",   label: "人数", value: peopleText || "—", GOLD, WHITE, family, valueMaxFont: 36, valueMinFont: 22, highlight: false });

    // ✅ 席位突出（底色 + 更稳的字体缩放）
    drawIconSegmentV2({ x: x + segW * 3, y, w: segW, h, icon: "seat", label: "席位", value: seatText || "—", GOLD, WHITE, family, valueMaxFont: 32, valueMinFont: 18, highlight: true });
  }

  function drawIconSegmentV2({
    x, y, w, h, icon, label, value,
    GOLD, WHITE, family, valueMaxFont, valueMinFont,
    highlight
  }) {
    // highlight（席位块）
    if (highlight) {
      ctx.save();
      ctx.fillStyle = "rgba(215,180,106,0.12)";
      const rx = x + Math.round(w * 0.04);
      const ry = y + Math.round(h * 0.10);
      const rw = Math.round(w * 0.92);
      const rh = Math.round(h * 0.78);
      roundRect(rx, ry, rw, rh, Math.round(Math.min(rw, rh) * 0.10));
      ctx.fill();
      ctx.restore();
    }

    const iconSize = Math.round(Math.min(w, h) * 0.22);
    const iconX = x + Math.round(w * 0.10);
    const iconY = y + Math.round(h * 0.18);

    drawSimpleIcon2(icon, iconX, iconY, iconSize, GOLD);

    // label
    ctx.fillStyle = "rgba(215,180,106,0.95)";
    ctx.font = `800 22px ${family}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, iconX + iconSize + 12, iconY - 2);

    // value（单行自适配）
    const maxW = w - (iconX - x) - iconSize - 12 - Math.round(w * 0.10);
    const vFont = fitSingleLineFont(value, maxW, valueMaxFont, valueMinFont, 900, "sans");

    ctx.fillStyle = WHITE;
    ctx.font = `900 ${vFont}px ${family}`;
    ctx.fillText(value, iconX + iconSize + 12, iconY + 30);
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // 人形/席位 icon（更高级一点）
  function drawSimpleIcon2(type, x, y, s, color) {
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
    } else if (type === "person") {
      const cx = x + s * 0.50;
      const cy = y + s * 0.33;
      const r = s * 0.16;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy + r + s * 0.06);
      ctx.lineTo(cx, y + s * 0.78);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.22, y + s * 0.58);
      ctx.lineTo(cx + s * 0.22, y + s * 0.58);
      ctx.stroke();
    } else if (type === "seat") {
      const sx = x + s * 0.20;
      const sy = y + s * 0.20;
      const sw = s * 0.55;
      const sh = s * 0.55;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + sh * 0.55);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(sx, sy + sh * 0.55);
      ctx.lineTo(sx + sw, sy + sh * 0.55);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(sx + sw, sy + sh * 0.55);
      ctx.lineTo(sx + sw, sy + sh);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(sx + sw * 0.30, sy + sh * 0.55);
      ctx.lineTo(sx + sw * 0.30, sy + sh);
      ctx.stroke();
    }

    ctx.restore();
  }

  // =====================================================
  // 段落自动适配：自动换行 + 缩字 + 截断
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
    topPad = 0,
  }) {
    const cleaned = normalize(text || "");
    if (!cleaned) return;

    const maxW = box.w;
    const maxH = box.h - topPad;

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
        const startX = box.x;
        let y = box.y + topPad;
        for (const line of lines) {
          ctx.fillText(line, startX, y);
          y += fontSize * lineHeight;
        }
        ctx.restore();
        return;
      }
      fontSize -= 2;
    }

    ctx.font = `${fontWeight} ${minFont}px ${fontFamily}`;
    const lines = wrapTextByBox(cleaned, maxW, ctx);
    const maxLines = Math.floor(maxH / (minFont * lineHeight));
    const clipped = lines.slice(0, maxLines);
    if (clipped.length > 0) clipped[clipped.length - 1] = clipWithEllipsis(clipped[clipped.length - 1]);

    const startX = box.x;
    let y = box.y + topPad;
    for (const line of clipped) {
      ctx.fillText(line, startX, y);
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
        if (buf) out.push(buf), (buf = "");
        out.push(ch);
      }
    }
    if (buf) out.push(buf);
    return out;
  }

  function fitSingleLineFont(text, maxW, maxFont, minFont, weight, familyType) {
    const family =
      familyType === "serif"
        ? `"SimHei","Noto Serif JP","Noto Serif SC","Times New Roman",serif`
        : `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;

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
  // ✅ 字段提取：修复你列出的两类输入
  // 1) 日文表格式（key：value / key: value / key\tvalue / key\nvalue）
  // 2) 纯散行（TAKAYAMA 这种）
  // 3) 英文 Reservation（Time: 8:30 PM）
  // =====================================================
  function extractFields(raw) {
    const text = normalize(raw);
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

    // --- 统一读取：支持 key:value / key\tvalue / key value / key\nvalue ---
    const get = (keys) => pickValueSmart(text, lines, keys);

    // 预约编号
    let rid = get([
      "予約ID", "予約番号", "予約No", "予約Ｎｏ", "予約ID：", "予約番号：",
      "Reservation ID", "Reservation No", "Booking ID", "Booking No", "Confirmation", "Confirmation No", "Confirmation #"
    ]);
    rid = cleanLeadSymbols(rid);

    // 店名
    let restaurant = get(["店舗名", "店名", "レストラン", "レストラン名", "Restaurant", "Restaurant Name", "Venue"]);
    restaurant = cleanLeadSymbols(restaurant);

    // 预约人（增加中文“预约人”）
    let guest = get(["予約名", "予約人", "予約者", "お客様名", "お名前", "ご予約名", "氏名", "Reservation Name", "Guest", "Guest Name", "Name", "Booker", "预约人", "預約人"]);
    guest = cleanLeadSymbols(guest);

    // 日期/时间：优先抓 key，抓不到再从散行拆
    let dateRaw = get(["日時", "予約日時", "予約日", "日付", "Date", "Reservation Date", "Booking Date"]);
    let timeRaw = get(["時間", "予約時間", "Time", "Reservation Time", "Booking Time"]);

    // 如果“日時”一行里带时间（01月09日(金) 18:00 / 2026年... 17:30）
    if (dateRaw) {
      const dt = splitDateTime(dateRaw);
      if (dt.dateRaw && !looksLikeTimeOnly(dt.dateRaw)) dateRaw = dt.dateRaw;
      if (!timeRaw && dt.timeRaw) timeRaw = dt.timeRaw;
    }

    // 英文 Date 行通常完整，Time: 8:30 PM 要单独读
    if (!timeRaw) {
      // 从全文兜底找 8:30 PM / 18:00
      timeRaw = matchOne(text, /(?:^|\b)(\d{1,2}:\d{2}\s*(?:AM|PM))\b/i) || matchOne(text, /(?:^|\b)(\d{1,2}:\d{2})\b/);
    }

    // 人数
    let peopleRaw = get(["人数", "予約人数", "ご利用人数", "Seats", "Guests", "Party Size", "People"]);
    peopleRaw = cleanLeadSymbols(peopleRaw);

    // 席位
    let seatRaw = get(["席", "席位", "席種", "お席", "Seat", "Seating", "Table"]);
    seatRaw = cleanLeadSymbols(seatRaw);

    // 日文常见：人数 行里其实是 “2人 / カウンター”
    const ps = splitPeopleSeat(peopleRaw);
    if (ps.people) peopleRaw = ps.people;
    if (!seatRaw && ps.seat) seatRaw = ps.seat;

    // 地址
    let address = get(["住所", "所在地", "Address", "Venue Address", "Location"]);
    address = cleanLeadSymbols(address);
    if (!address) address = guessAddress(lines);

    // 电话
    let phone = get(["電話番号", "電話", "TEL", "Tel", "Phone", "Telephone", "Contact"]);
    phone = cleanLeadSymbols(phone);
    if (!phone) phone = matchOne(text, /(\d{2,4}-\d{2,4}-\d{3,4})/);

    // 套餐
    let course = get(["コース", "コース名", "Course", "Menu", "Package", "Plan"]);
    course = cleanLeadSymbols(course);

    // 金额
    let price =
      get(["総額", "合計", "料金", "金額", "Total Price", "Total", "Price"]) ||
      matchOne(text, /([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
      "";
    price = cleanLeadSymbols(price);

    // 兜底：TAKAYAMA 这种散行
    if (!restaurant) restaurant = guessRestaurant(lines, rid);
    if (!guest) guest = guessGuest(lines);
    if (!rid) rid = guessRid(lines);

    // 散行日期兜底（2026年1月11日）
    if (!dateRaw) {
      dateRaw =
        matchOne(text, /(\d{4}年\d{1,2}月\d{1,2}日)/) ||
        matchOne(text, /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/) ||
        matchOne(text, /(\d{1,2}月\d{1,2}日)/) ||
        "";
    }

    // 人数兜底（2名 / 2人 / Seats: 1）
    if (!peopleRaw) {
      peopleRaw =
        matchOne(text, /(?:Seats|Guests|People)\s*[:：]?\s*(\d{1,2})/i) ||
        matchOne(text, /(\d{1,2})\s*(?:名|人)\b/) ||
        "";
    }

    // 席位兜底（カウンター/個室/テーブル）
    if (!seatRaw) {
      const m = lines.find(l => /(カウンター|個室|テーブル|Table|Counter|Private)/i.test(l));
      seatRaw = m ? cleanLeadSymbols(m.replace(/^.*[:：]\s*/, "")) : "";
    }

    // extra：把“重要但非核心”的放备注（来店頻度/用途/要望/注意事项等）
    const usedHints = [
      "予約id","予約番号","reservation id","booking id","confirmation",
      "店舗名","店名","restaurant",
      "予約名","予約人","reservation name","guest",
      "日時","日付","date",
      "時間","time",
      "人数","seats","guests","party",
      "席","seat",
      "住所","address",
      "電話","phone","tel",
      "コース","course",
      "総額","合計","total","price","金額","料金"
    ].map(s => s.toLowerCase());

    const extractedValues = [rid, restaurant, guest, dateRaw, timeRaw, peopleRaw, seatRaw, address, phone, course, price]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());

    const extraLines = lines.filter(l => {
      const low = l.toLowerCase();
      if (usedHints.some(k => low.includes(k))) return false;
      if (extractedValues.some(v => v && v.length >= 3 && low.includes(v))) return false;
      return true;
    });

    const extra = extraLines.join("\n").trim();

    return {
      rid: (rid || "").trim(),
      restaurant: cleanLeadSymbols(restaurant || "").trim(),
      guest: cleanLeadSymbols(guest || "").trim(),
      dateRaw: (dateRaw || "").trim(),
      timeRaw: (timeRaw || "").trim(),
      peopleRaw: (peopleRaw || "").trim(),
      seatRaw: (seatRaw || "").trim(),
      address: (address || "").trim(),
      phone: (phone || "").trim(),
      course: (course || "").trim(),
      price: (price || "").trim(),
      extra
    };
  }

  // -------------------- parsing helpers --------------------
  function normalize(s) {
    return String(s || "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, "\t")
      .replace(/[ ]{2,}/g, " ")
      .trim();
  }

  function cleanLeadSymbols(s) {
    return String(s || "")
      .replace(/^[■□◆●・▶▷►◼︎\-\*]+/g, "")
      .replace(/^\s*[:：]\s*/g, "")
      .trim();
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function matchOne(text, re) {
    const m = String(text || "").match(re);
    return m ? String(m[1] || "").trim() : "";
  }

  function looksLikeTimeOnly(s) {
    return /^\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*$/i.test(String(s || ""));
  }

  // ✅ 最关键：key/value 多格式读取
  function pickValueSmart(fullText, lines, keys) {
    for (const k of keys) {
      // 1) key：value / key: value（同一行）
      let re = new RegExp(`${escapeRe(k)}\\s*[:：]\\s*([^\\n]+)`, "i");
      let m = fullText.match(re);
      if (m && m[1]) return m[1].trim();

      // 2) key\tvalue
      re = new RegExp(`${escapeRe(k)}\\s*\\t\\s*([^\\n]+)`, "i");
      m = fullText.match(re);
      if (m && m[1]) return m[1].trim();

      // 3) key value（同一行，常见：予約番号 D6Z65J）
      re = new RegExp(`${escapeRe(k)}\\s+([^\\n]+)`, "i");
      m = fullText.match(re);
      if (m && m[1] && !/^(?:[:：])$/.test(m[1].trim())) return m[1].trim();
    }

    // 4) key 在一行，值在下一行（你现在最常见）
    for (let i = 0; i < lines.length; i++) {
      for (const k of keys) {
        if (new RegExp(`^\\s*${escapeRe(k)}\\s*(?:[:：])?\\s*$`, "i").test(lines[i])) {
          for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
            const v = (lines[j] || "").trim();
            if (!v) continue;
            // 避免把“ご予約内容”这种标题当值
            if (/^(ご予約内容|Reservation|Details|内容)$/i.test(v)) continue;
            return v;
          }
        }
      }
    }

    return "";
  }

  // “2人 / カウンター”
  function splitPeopleSeat(peopleRaw) {
    const s = String(peopleRaw || "").trim();
    const m = s.match(/(\d{1,2}\s*(?:人|名)?)\s*\/\s*(.+)$/);
    if (!m) return { people: s, seat: "" };
    return { people: m[1].trim(), seat: m[2].trim() };
  }

  // “2026年01月15日(木) 17:00” / “01月09日(金) 18:00”
  function splitDateTime(s) {
    const str = String(s || "").trim();
    let dateRaw = "";
    let timeRaw = "";

    const d1 = str.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
    if (d1) dateRaw = d1[1];

    // 只有月日（无年份）
    if (!dateRaw) {
      const d2 = str.match(/(\d{1,2}月\d{1,2}日)/);
      if (d2) dateRaw = d2[1];
    }

    const t = str.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (t) timeRaw = t[1];

    // 英文日期整句
    if (!dateRaw && /[A-Za-z]/.test(str) && /\d{4}/.test(str)) dateRaw = str;

    return { dateRaw, timeRaw };
  }

  function guessRid(lines) {
    // 预约番号 D6Z65J / 予約ID 826285
    for (const l of lines) {
      let m = l.match(/(?:予約番号|予約ID)\s*[:：]?\s*([A-Za-z0-9\-]+)/i);
      if (m) return m[1].trim();
    }
    // “NO. XXXXX”
    for (const l of lines) {
      let m = l.match(/\bNO\.?\s*[:：]?\s*([A-Za-z0-9\-]+)\b/i);
      if (m) return m[1].trim();
    }
    return "";
  }

  function guessRestaurant(lines, rid) {
    // 排除明显非店名
    const bad = /(予約|id|no\.|日時|日付|時間|人数|住所|電話|phone|address|date|time|seats|guests|total|price|course|menu|コース|金額|料金)/i;
    for (const l of lines) {
      const v = cleanLeadSymbols(l);
      if (!v) continue;
      if (rid && v.includes(rid)) continue;
      if (bad.test(v)) continue;
      if (v.length >= 2 && v.length <= 40) return v;
    }
    return "";
  }

  function guessGuest(lines) {
    // “Lin, Yi 様”
    for (const l of lines) {
      if (/(様)\s*$/.test(l)) return cleanLeadSymbols(l);
    }
    // 纯英文/中文名字一行（作为兜底，避开店名/地址/日期）
    const bad = /(Restaurant|店舗|店名|住所|Address|Date|Time|Seats|Guests|人数|席|コース|Course|Total|Price)/i;
    for (const l of lines) {
      if (bad.test(l)) continue;
      // 形如 “Adele zheng”
      if (/^[A-Za-z][A-Za-z ,.'-]{2,40}$/.test(l.trim())) return cleanLeadSymbols(l.trim());
    }
    return "";
  }

  function guessAddress(lines) {
    const idx = lines.findIndex(l => /(〒|東京都|大阪府|京都府|北海道|Japan|Tokyo|Osaka|Kyoto|Sapporo|札幌|京都|東京)/i.test(l));
    if (idx < 0) return "";
    let addr = cleanLeadSymbols(lines[idx]);
    for (let k = 1; k <= 2; k++) {
      const nx = (lines[idx + k] || "").trim();
      if (!nx) continue;
      if (/(電話|Phone|TEL|日時|日付|時間|人数|コース|料金|Total|Price)/i.test(nx)) break;
      addr += " " + cleanLeadSymbols(nx);
    }
    return addr.trim();
  }

  // ===== 展示格式 =====
  function formatDateYYYYMMDD(raw) {
    if (!raw) return "—";
    const s = String(raw).trim();

    const m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (m) {
      const yyyy = m[1];
      const mm = String(m[2]).padStart(2, "0");
      const dd = String(m[3]).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }

    const m2 = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m2) {
      const yyyy = m2[1];
      const mm = String(m2[2]).padStart(2, "0");
      const dd = String(m2[3]).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }

    // 英文日期尝试 parse
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }

    // 只有 01月09日 / 1月9日
    const m3 = s.match(/(\d{1,2})月(\d{1,2})日/);
    if (m3) {
      const mm = String(m3[1]).padStart(2, "0");
      const dd = String(m3[2]).padStart(2, "0");
      return `${mm}/${dd}`;
    }

    return cleanLeadSymbols(s);
  }

  function formatTimeHHMM(raw) {
    if (!raw) return "—";
    let s = String(raw).trim();
    s = s.replace(/[～~].*$/, "").trim();

    // ✅ 保留 8:30 PM / 8:30PM
    const m = s.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
    if (m) {
      const hm = m[1];
      const ap = (m[2] || "").toUpperCase();
      return ap ? `${hm} ${ap}` : hm;
    }

    return cleanLeadSymbols(s);
  }

  function formatPeople(raw) {
    if (!raw) return "—";
    const s = String(raw).trim();
    const m = s.match(/(\d{1,2})/);
    if (m) return `${m[1]}名`;
    return cleanLeadSymbols(s);
  }
})();
