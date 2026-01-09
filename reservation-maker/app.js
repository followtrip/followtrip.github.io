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

  // ---- 模板加载（加缓存破坏，避免你换图后仍然读旧缓存导致黑屏）----
  const templateImg = new Image();
  // 同源 GitHub Pages 不需要 crossOrigin；加上也不会坏
  // templateImg.crossOrigin = "anonymous";
  templateImg.src = `./template.png?v=${Date.now()}`;

  templateImg.onload = () => {
    TEMPLATE_READY = true;

    canvas.width = templateImg.naturalWidth;
    canvas.height = templateImg.naturalHeight;

    btnGenerate.disabled = false;

    renderPlaceholder();
  };

  templateImg.onerror = () => {
    // 不弹窗了，直接把错误画到画布上（你一眼就知道是不是路径/文件名问题）
    canvas.width = 1200;
    canvas.height = 800;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = `600 28px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillText("❌ template.png 加载失败", 60, 120);
    ctx.font = `400 20px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillText("请检查：", 60, 180);
    ctx.fillText("1) 文件名必须是 template.png（大小写一致）", 60, 220);
    ctx.fillText("2) 必须和 index.html / app.js 在同一目录", 60, 255);
    ctx.fillText("3) GitHub Pages 可能有缓存，强刷：Ctrl+Shift+R", 60, 290);
  };

  btnGenerate.addEventListener("click", () => {
    if (!TEMPLATE_READY) {
      alert("模板还没加载完成，请稍等 1 秒再点生成（或刷新后再试）");
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
  // 布局：按模板尺寸比例计算（你模板 1455×2192 也适用）
  // =====================================================
  function getLayout() {
    const W = canvas.width;
    const H = canvas.height;

    // 金框内可用区域（按你最新“大留白”模板估算，够安全）
    const TEXT_AREA = {
      x: Math.round(W * 0.10),
      y: Math.round(H * 0.285),
      w: Math.round(W * 0.80),
      h: Math.round(H * 0.50),
    };

    const padding = Math.round(Math.min(W, H) * 0.018); // 内边距，防止顶格

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

    // header：店名 / NO / 预约人（居中）
    const headerH = Math.round(leftCol.h * 0.30);
    const headerBox = {
      x: TEXT_AREA.x + padding,
      y: TEXT_AREA.y + padding,
      w: TEXT_AREA.w - padding * 2,
      h: headerH,
    };

    const bodyY = headerBox.y + headerH;
    const bodyH = leftCol.h - headerH;

    // body：左/右两栏
    const leftBody = {
      x: leftCol.x,
      y: bodyY,
      w: leftCol.w,
      h: bodyH,
    };
    const rightBody = {
      x: rightCol.x,
      y: bodyY,
      w: rightCol.w,
      h: bodyH,
    };

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

  // =====================================================
  // 绘制：店名居中 + 预约人居中 + 4格 icon 行 + 两栏
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

    // 店名字体自适配
    const nameFamily = `"SimHei","Noto Serif JP","Noto Serif SC","Times New Roman",serif`;
    const nameFont = fitSingleLineFont(restaurant, headerBox.w, Math.round(headerBox.h * 0.34), 34, 800, "serif");

    const ridFont = Math.max(24, Math.round(headerBox.h * 0.15));
    const guestFont = Math.max(26, Math.round(headerBox.h * 0.16));
    const gap = Math.round(padding * 0.45);

    const totalH =
      nameFont +
      gap +
      (ridLine ? ridFont + gap : 0) +
      guestFont;

    let y = headerBox.y + Math.max(0, Math.floor((headerBox.h - totalH) / 2));

    // 店名
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.font = `800 ${nameFont}px ${nameFamily}`;
    ctx.fillText(restaurant, headerBox.x + headerBox.w / 2, y);
    y += nameFont + gap;

    // NO
    if (ridLine) {
      ctx.fillStyle = GOLD;
      ctx.font = `800 ${ridFont}px "SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;
      ctx.fillText(ridLine, headerBox.x + headerBox.w / 2, y);
      y += ridFont + gap;
    }

    // 预约人（居中、强制在店名下方）
    ctx.fillStyle = WHITE;
    ctx.font = `800 ${guestFont}px "SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;
    ctx.fillText(guest, headerBox.x + headerBox.w / 2, y);

    // ---------- Left Body：Icon Row(4格) + 主信息 ----------
    const iconRowH = Math.round(leftBody.h * 0.25);
    const iconRowBox = {
      x: leftBody.x,
      y: leftBody.y,
      w: leftBody.w,
      h: iconRowH,
    };

    drawIconRow4({
      box: iconRowBox,
      dateText: formatDateYYYYMMDD(f.dateRaw),
      timeText: formatTimeHHMM(f.timeRaw),
      peopleText: formatPeople(f.peopleRaw),
      seatText: f.seatRaw ? cleanLeadSymbols(f.seatRaw) : "—",
      GOLD,
      WHITE,
    });

    const leftMainBox = {
      x: leftBody.x,
      y: leftBody.y + iconRowH,
      w: leftBody.w,
      h: leftBody.h - iconRowH,
    };

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

    // ---------- Right Body：补充信息 ----------
    const extra = (f.extra || "").trim();
    const rightText = extra ? `补充信息：\n${extra}` : "";

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
  // Icon 行（4格：日期/时间/人数/席位）
  // 日期单独一格，字体更大，不再挤到看不见
  // =====================================================
  function drawIconRow4({ box, dateText, timeText, peopleText, seatText, GOLD, WHITE }) {
    const pad = Math.round(Math.min(box.w, box.h) * 0.08);
    const x = box.x;
    const y = box.y + pad;
    const w = box.w;
    const h = box.h - pad * 2;

    const segW = Math.floor(w / 4);
    const family = `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;

    // 底部分隔线（淡金）
    ctx.save();
    ctx.strokeStyle = "rgba(215,180,106,0.22)";
    ctx.lineWidth = 2;
    const lineY = box.y + Math.floor(box.h * 0.62);
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + w, lineY);
    ctx.stroke();
    ctx.restore();

    drawIconSegmentV2({
      x: x + segW * 0,
      y, w: segW, h,
      icon: "calendar",
      label: "日期",
      value: dateText || "—",
      GOLD, WHITE, family,
      valueMaxFont: 34,
      valueMinFont: 22,
    });

    drawIconSegmentV2({
      x: x + segW * 1,
      y, w: segW, h,
      icon: "clock",
      label: "时间",
      value: timeText || "—",
      GOLD, WHITE, family,
      valueMaxFont: 36,
      valueMinFont: 22,
    });

    drawIconSegmentV2({
      x: x + segW * 2,
      y, w: segW, h,
      icon: "person",
      label: "人数",
      value: peopleText || "—",
      GOLD, WHITE, family,
      valueMaxFont: 36,
      valueMinFont: 22,
    });

    drawIconSegmentV2({
      x: x + segW * 3,
      y, w: segW, h,
      icon: "seat",
      label: "席位",
      value: seatText || "—",
      GOLD, WHITE, family,
      valueMaxFont: 32,
      valueMinFont: 18,
    });
  }

  function drawIconSegmentV2({
    x, y, w, h,
    icon, label, value,
    GOLD, WHITE, family,
    valueMaxFont, valueMinFont
  }) {
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

    // value（单行自适配，不够就缩字）
    const maxW = w - (iconX - x) - iconSize - 12 - Math.round(w * 0.10);
    const vFont = fitSingleLineFont(value, maxW, valueMaxFont, valueMinFont, 900, "sans");

    ctx.fillStyle = WHITE;
    ctx.font = `900 ${vFont}px ${family}`;
    ctx.fillText(value, iconX + iconSize + 12, iconY + 30);
  }

  // 更“高级”的人形 icon / 席位 icon
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
      // 头（实心）
      const cx = x + s * 0.50;
      const cy = y + s * 0.33;
      const r = s * 0.16;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // 身体（线条）
      ctx.beginPath();
      ctx.moveTo(cx, cy + r + s * 0.06);
      ctx.lineTo(cx, y + s * 0.78);
      ctx.stroke();

      // 肩膀
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.22, y + s * 0.58);
      ctx.lineTo(cx + s * 0.22, y + s * 0.58);
      ctx.stroke();
    } else if (type === "seat") {
      // 椅子
      const sx = x + s * 0.20;
      const sy = y + s * 0.20;
      const sw = s * 0.55;
      const sh = s * 0.55;

      // 椅背
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + sh * 0.55);
      ctx.stroke();

      // 坐面
      ctx.beginPath();
      ctx.moveTo(sx, sy + sh * 0.55);
      ctx.lineTo(sx + sw, sy + sh * 0.55);
      ctx.stroke();

      // 前腿
      ctx.beginPath();
      ctx.moveTo(sx + sw, sy + sh * 0.55);
      ctx.lineTo(sx + sw, sy + sh);
      ctx.stroke();

      // 后腿
      ctx.beginPath();
      ctx.moveTo(sx + sw * 0.30, sy + sh * 0.55);
      ctx.lineTo(sx + sw * 0.30, sy + sh);
      ctx.stroke();
    }

    ctx.restore();
  }

  // =====================================================
  // 段落自动适配：自动换行 + 缩字 + 截断省略号
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

    // 放不下：截断
    ctx.font = `${fontWeight} ${minFont}px ${fontFamily}`;
    const lines = wrapTextByBox(cleaned, maxW, ctx);
    const maxLines = Math.floor(maxH / (minFont * lineHeight));
    const clipped = lines.slice(0, maxLines);

    if (clipped.length > 0) {
      clipped[clipped.length - 1] = clipWithEllipsis(clipped[clipped.length - 1]);
    }

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
  // 字段提取（重点修复：日文表格“字段在下一行”的格式）
  // =====================================================
  function extractFields(raw) {
    const text = normalize(raw);
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

    // 支持：
    // 1) key：value
    // 2) key \n value（你现在这种最常见）
    const getByKeys = (keys) => pickValue(text, lines, keys);

    const rid = cleanLeadSymbols(
      getByKeys([
        "予約番号", "予約ID", "予約No", "予約Ｎｏ", "NO.", "No.", "Confirmation", "Confirmation No", "Confirmation #",
        "Reservation ID", "Reservation No", "Booking ID", "Booking No"
      ]) || ""
    );

    // 店名（修复：你现在“店舗名\n銀座 大石” 这种必须吃到下一行）
    let restaurant = getByKeys(["店舗名", "店名", "レストラン", "レストラン名", "Restaurant", "Restaurant Name", "Venue"]) || "";
    restaurant = cleanLeadSymbols(restaurant);

    // 预约人（修复：日文“予約名\nlin yi” / 英文 Reservation Name）
    let guest = getByKeys(["予約名", "予約人", "予約者", "お名前", "ご予約名", "氏名", "Reservation Name", "Guest", "Guest Name", "Name", "Booker"]) || "";
    guest = cleanLeadSymbols(guest);

    // 日时（可能同一行：2026年01月15日(木) 17:00）
    const datetimeRaw = getByKeys(["日時", "予約日時", "予約日付", "予約日", "日付", "来店日", "Date", "Reservation Date", "Booking Date", "Time", "Reservation Time"]) || "";

    // 单独抓 date/time
    let dateRaw = "";
    let timeRaw = "";

    // 先从“日時”字段里拆
    const dt = normalize(datetimeRaw);
    ({ dateRaw, timeRaw } = splitDateTime(dt));

    // 如果没拆到，再全文找
    if (!dateRaw) {
      dateRaw =
        matchOne(text, /(\d{4}年\d{1,2}月\d{1,2}日)/) ||
        matchOne(text, /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/) ||
        matchOne(text, /(\d{1,2}月\d{1,2}日)/) ||
        matchOne(text, /(?:Date)\s*[:：]\s*([A-Za-z].+)/i) ||
        "";
    }
    if (!timeRaw) {
      timeRaw =
        matchOne(text, /(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i) ||
        "";
    }

    // 人数 + 席位（重点：从“人数 1人 / カウンター”拆出来）
    let peopleRaw = getByKeys(["人数", "予約人数", "ご利用人数", "Seats", "Guests", "Party Size", "People"]) || "";
    peopleRaw = cleanLeadSymbols(peopleRaw);

    let seatRaw = getByKeys(["席", "お席", "席種", "Seat", "Seating", "Table"]) || "";
    seatRaw = cleanLeadSymbols(seatRaw);

    // 如果 people 行里含 “/ カウンター”，把 seat 拆出来
    const ps = splitPeopleSeat(peopleRaw);
    if (ps.people) peopleRaw = ps.people;
    if (!seatRaw && ps.seat) seatRaw = ps.seat;

    // 地址（可能多行）
    let address = getByKeys(["住所", "所在地", "Address", "Venue Address", "Location"]) || "";
    address = cleanLeadSymbols(address);
    if (!address) address = guessAddress(lines);

    // 电话
    let phone = getByKeys(["電話番号", "電話", "TEL", "Tel", "Phone", "Telephone", "Contact"]) || "";
    if (!phone) phone = matchOne(text, /(\d{2,4}-\d{2,4}-\d{3,4})/);
    phone = cleanLeadSymbols(phone);

    // 套餐/金额
    let course = getByKeys(["コース", "コース名", "Course", "Menu", "Package", "Plan"]) || "";
    course = cleanLeadSymbols(course);

    let price =
      getByKeys(["総額", "合計", "料金", "金額", "Total Price", "Total", "Price"]) ||
      matchOne(text, /([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
      "";
    price = cleanLeadSymbols(price);

    // extra：过滤已识别字段行后剩余
    const usedKeyHints = [
      "予約ID", "予約番号", "店舗名", "店名", "レストラン", "日時", "日付", "時間",
      "予約名", "予約人", "人数", "席", "住所", "電話", "コース", "料金", "金額", "Total", "Price", "Address", "Phone"
    ].map(s => s.toLowerCase());

    const extractedValues = [rid, restaurant, guest, dateRaw, timeRaw, peopleRaw, seatRaw, address, phone, course, price]
      .filter(Boolean)
      .map(s => s.toLowerCase());

    const extraLines = lines.filter(l => {
      const low = l.toLowerCase();
      if (usedKeyHints.some(k => low.includes(k))) return false;
      if (extractedValues.some(v => v && v.length >= 3 && low.includes(v))) return false;
      return true;
    });

    const extra = extraLines.join("\n").trim();

    // 如果店名/人名识别失败，做兜底（避免跑出预约号当店名）
    if (!restaurant) restaurant = guessRestaurant(lines, rid);
    if (!guest) guest = guessGuest(lines);

    // 最后清理一次：去掉前导符号
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

  // =============== 解析工具 ===============
  function normalize(s) {
    return String(s || "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .trim();
  }

  function cleanLeadSymbols(s) {
    return String(s || "")
      .replace(/^[■□◆●・▶▷►◼︎\-\*]+\s*/g, "")
      .trim();
  }

  function matchOne(text, re) {
    const m = String(text || "").match(re);
    return m ? String(m[1] || "").trim() : "";
  }

  // key：value 或 key\nvalue
  function pickValue(fullText, lines, keys) {
    // key：value
    for (const k of keys) {
      const re = new RegExp(`${escapeRe(k)}\\s*[:：]\\s*([^\\n]+)`, "i");
      const m = fullText.match(re);
      if (m && m[1]) return m[1].trim();
    }

    // key 在一行，值在下一行（你现在最常见）
    for (let i = 0; i < lines.length; i++) {
      for (const k of keys) {
        if (new RegExp(`^\\s*${escapeRe(k)}\\s*$`, "i").test(lines[i])) {
          // 找到下一条非空行作为值
          for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
            const v = (lines[j] || "").trim();
            if (v) return v;
          }
        }
      }
    }

    return "";
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // “人数 1人 / カウンター” -> people=1人 seat=カウンター
  function splitPeopleSeat(peopleRaw) {
    const s = String(peopleRaw || "").trim();
    const m = s.match(/(\d{1,2}\s*(?:人|名)?)\s*\/\s*(.+)$/);
    if (!m) return { people: s, seat: "" };
    return { people: m[1].trim(), seat: m[2].trim() };
  }

  function splitDateTime(s) {
    let dateRaw = "";
    let timeRaw = "";

    const str = String(s || "").trim();

    // 日文：2026年01月15日(木) 17:00
    const d1 = str.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
    if (d1) dateRaw = d1[1];

    const t1 = str.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (t1) timeRaw = t1[1];

    // 如果是英文 Date 行：Tuesday February 10, 2026
    if (!dateRaw && /[A-Za-z]/.test(str) && /\d{4}/.test(str)) {
      dateRaw = str;
    }

    return { dateRaw, timeRaw };
  }

  function guessRestaurant(lines, rid) {
    const bad = /(予約|id|no\.|日時|日付|時間|人数|住所|電話|phone|address|date|time|seats|guests|total|price)/i;
    for (const l of lines) {
      const v = cleanLeadSymbols(l);
      if (!v) continue;
      if (rid && v === rid) continue;
      if (bad.test(v)) continue;
      // 店名一般不太长
      if (v.length >= 2 && v.length <= 40) return v;
    }
    return "";
  }

  function guessGuest(lines) {
    for (const l of lines) {
      if (/(様|先生|女士)\b/.test(l)) return cleanLeadSymbols(l);
    }
    // 英文常见
    for (const l of lines) {
      if (/Reservation Name\s*[:：]/i.test(l)) return cleanLeadSymbols(l.split(/[:：]/)[1] || "");
    }
    return "";
  }

  function guessAddress(lines) {
    const idx = lines.findIndex(l => /(〒|東京都|大阪府|京都府|Japan|Tokyo|Osaka|Kyoto)/i.test(l));
    if (idx < 0) return "";
    let addr = cleanLeadSymbols(lines[idx]);
    // 拼接后两行（如果像地址）
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

    // 日文：2026年01月15日 -> 2026/01/15
    const m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (m) {
      const yyyy = m[1];
      const mm = String(m[2]).padStart(2, "0");
      const dd = String(m[3]).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }

    // 2026-01-15 or 2026/01/15
    const m2 = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m2) {
      const yyyy = m2[1];
      const mm = String(m2[2]).padStart(2, "0");
      const dd = String(m2[3]).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }

    // 英文日期：尝试 Date.parse
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }

    // 只有 1月9日
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
    // 8:30 PM 保留；18:00 保留
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
