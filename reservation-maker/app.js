(() => {
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d"); // 最稳
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  let TEMPLATE_READY = false;
  let lastDataURL = null;

  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  // ===== 模板加载：失败也不黑屏，直接画错误 =====
  const templateImg = new Image();
  templateImg.src = `./template.png?v=${Date.now()}`;

  templateImg.onload = () => {
    TEMPLATE_READY = true;
    canvas.width = templateImg.naturalWidth || 1455;
    canvas.height = templateImg.naturalHeight || 2192;
    btnGenerate.disabled = false;
    drawTemplateOnly("请粘贴预约信息，然后点击「生成图片」");
  };

  templateImg.onerror = () => {
    canvas.width = 1200;
    canvas.height = 800;
    drawError(
      "template.png 加载失败\n\n请检查：\n1) 文件名必须是 template.png（大小写一致）\n2) 必须和 index.html/app.js 同目录\n3) GitHub Pages 可能缓存：Ctrl+Shift+R 强刷"
    );
  };

  btnGenerate.addEventListener("click", () => {
    try {
      if (!TEMPLATE_READY) throw new Error("模板未加载完成");
      const raw = (inputEl.value || "").trim();
      if (!raw) throw new Error("未粘贴预约信息");
      render(raw);
      btnDownload.disabled = false;
    } catch (e) {
      drawError(String(e?.message || e));
    }
  });

  btnDownload.addEventListener("click", () => {
    if (!lastDataURL) return;
    const a = document.createElement("a");
    a.href = lastDataURL;
    a.download = `预约确认函_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  });

  // ======================
  // 主渲染
  // ======================
  function render(raw) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

    const d = extractFields(raw);
    const L = getLayout();

    drawHeader(d, L);
    drawIconRow(d, L);
    drawBody(d, L);

    lastDataURL = canvas.toDataURL("image/png");
  }

  // ======================
  // 布局（稳定落在金框内）
  // ======================
  function getLayout() {
    const W = canvas.width;
    const H = canvas.height;

    // 金框内内容区（你现在的模板适配）
    const box = {
      x: W * 0.14,
      y: H * 0.28,
      w: W * 0.72,
      h: H * 0.52,
    };

    return {
      W, H,
      box,
      header: {
        x: box.x,
        y: box.y + box.h * 0.07,
        w: box.w,
        h: box.h * 0.25,
      },
      iconRow: {
        x: box.x,
        y: box.y + box.h * 0.34,
        w: box.w,
        h: box.h * 0.13,
      },
      body: {
        x: box.x,
        y: box.y + box.h * 0.51,
        w: box.w,
        h: box.h * 0.43,
      },
    };
  }

  // ======================
  // Header：店名居中 / 预约人紧贴下方 / NO（可选）
  // ======================
  function drawHeader(d, L) {
    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const centerX = L.header.x + L.header.w / 2;

    const restaurant = d.restaurant || "（未识别店名）";
    const guest = d.guest || "（未识别预约人）";
    const ridLine = d.rid ? `NO. ${d.rid}` : "";

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // 店名（更高级：衬线）
    let y = L.header.y;
    const nameFont = fitFontOneLine(
      restaurant,
      L.header.w * 0.92,
      68, 40,
      800,
      `"Noto Serif JP","Noto Serif SC","Times New Roman",serif`
    );
    ctx.fillStyle = WHITE;
    ctx.font = `800 ${nameFont}px "Noto Serif JP","Noto Serif SC","Times New Roman",serif`;
    ctx.fillText(restaurant, centerX, y);

    // 预约人（紧贴店名下方）
    y += nameFont + 8;
    const guestFont = fitFontOneLine(
      guest,
      L.header.w * 0.86,
      38, 24,
      700,
      `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`
    );
    ctx.fillStyle = WHITE;
    ctx.font = `700 ${guestFont}px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
    ctx.fillText(guest, centerX, y);

    // NO（金色小行）
    if (ridLine) {
      y += guestFont + 10;
      ctx.fillStyle = GOLD;
      ctx.font = `800 26px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(ridLine, centerX, y);
    }

    ctx.restore();
  }

  // ======================
  // 4格 Icon 行：日期/时间/人数/席位（席位突出）
  // ======================
  function drawIconRow(d, L) {
    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const MUTED = "rgba(215,180,106,0.90)";

    const items = [
      { label: "日期", value: d.date || "—", icon: "calendar" },
      { label: "时间", value: d.time || "—", icon: "clock" },
      { label: "人数", value: d.people || "—", icon: "person" },
      { label: "席位", value: d.seat || "—", icon: "seat", highlight: true },
    ];

    const segW = L.iconRow.w / 4;
    const topY = L.iconRow.y;

    // 淡金分隔线
    ctx.save();
    ctx.strokeStyle = "rgba(215,180,106,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.iconRow.x, topY + L.iconRow.h);
    ctx.lineTo(L.iconRow.x + L.iconRow.w, topY + L.iconRow.h);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const x = L.iconRow.x + segW * i;

      const iconSize = Math.max(22, Math.floor(L.iconRow.h * 0.40));
      drawIcon(it.icon, x + 8, topY + 4, iconSize, GOLD);

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // label
      ctx.fillStyle = MUTED;
      ctx.font = `800 20px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(it.label, x + iconSize + 16, topY + 2);

      // value
      const maxW = segW - (iconSize + 30);
      const valueFont = fitFontOneLine(
        it.value,
        maxW,
        it.highlight ? 38 : 34,
        20,
        it.highlight ? 900 : 800,
        `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`
      );

      ctx.fillStyle = WHITE;
      ctx.font = `${it.highlight ? 900 : 800} ${valueFont}px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(it.value, x + iconSize + 16, topY + 30);

      ctx.restore();
    }
  }

  // ======================
  // Body：地址/电话/套餐/金额/备注（自动换行+缩字）
  // ======================
  function drawBody(d, L) {
    const WHITE = "#f3f3f4";

    const lines = [];
    if (d.address) lines.push(`地址：${d.address}`);
    if (d.phone) lines.push(`电话：${d.phone}`);
    if (d.course) lines.push(`套餐：${d.course}`);
    if (d.price) lines.push(`金额：${d.price}`);
    if (d.note) lines.push(`备注：${d.note}`);

    const text = lines.join("\n");
    if (!text) return;

    drawMultilineAutoFit({
      text,
      x: L.body.x,
      y: L.body.y,
      w: L.body.w,
      h: L.body.h,
      maxFont: 30,
      minFont: 22,
      lineHeight: 1.55,
      color: WHITE,
      weight: 700,
      family: `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`,
    });
  }

  // ======================
  // 字段提取：日/英 + key下一行 + 你自定义“预约人”
  // ======================
  function extractFields(raw) {
    const text = normalize(raw);
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

    const get = (keys) => pickValue(lines, keys);

    // 预约ID
    const rid = cleanLead(get([
      "予約ID","予約番号","予約No","予約Ｎｏ",
      "Reservation ID","Reservation No","Booking ID","Confirmation","Confirmation No","Confirmation #"
    ]));

    // 店名（修复：店舗名：xxx / 店舗名\nxxx）
    let restaurant = cleanLead(get(["店舗名","店名","レストラン","Restaurant","Restaurant Name","Venue"]));

    // 预约人（修复：支持 预约人:xxx / 予約名:xxx / Reservation Name）
    let guest = cleanLead(get(["预约人","予約名","予約人","予約者","お名前","ご予約名","Reservation Name","Guest","Guest Name","Name","Booker"]));

    // 日时（可能无年份：01月09日(金) 18:00）
    const datetime = get(["日時","予約日時","Date","Time","Reservation Date","Booking Date"]);
    const { date, time } = parseDateTime(datetime || text);

    // 人数 + 席位
    let peopleLine = cleanLead(get(["人数","予約人数","Seats","Guests","Party Size","People"]));
    let seat = cleanLead(get(["席","席位","お席","席種","Seat","Seating"]));

    // peopleLine 里可能含 “2 人” 或 “1人 / カウンター”
    const ps = splitPeopleSeat(peopleLine);
    const people = formatPeople(ps.people || peopleLine);
    if (!seat && ps.seat) seat = ps.seat;

    // 地址/电话/套餐
    let address = cleanLead(get(["住所","所在地","Address","Venue Address","Location"]));
    if (!address) address = guessAddress(lines);

    let phone = cleanLead(get(["電話番号","電話","TEL","Tel","Phone","Telephone","Contact"]));
    if (!phone) {
      const m = text.match(/(\d{2,4}-\d{2,4}-\d{3,4})/);
      phone = m ? m[1] : "";
    }

    let course = cleanLead(get(["コース","コース名","Course","Menu","Package","Plan"]));

    // 金额：优先 Total/金額，再从 course 里抓 ¥ / 円
    let price = cleanLead(get(["総額","合計","料金","金額","Total Price","Total","Price"]));
    if (!price) {
      const yen = (course || text).match(/([¥￥]\s?[\d,]+)|(\d[\d,]*円)/);
      price = yen ? (yen[1] || yen[2] || "") : "";
    }
    price = normalizeMoney(price);

    // 备注：ご要望 / Note / Requests（你这里 “it's my birthday”）
    let note = cleanLead(get(["ご要望","備考","Note","Notes","Request","Requests","Special Request"]));
    // 也把“来店頻度”这类非核心合并进备注（可选）
    const freq = cleanLead(get(["来店頻度","Frequency","Visit Frequency"]));
    if (freq && !note) note = `来店频度：${freq}`;
    else if (freq && note) note = `来店频度：${freq}；${note}`;

    // 兜底：店名没识别到就猜，但避免把人名/ID当店名
    if (!restaurant) restaurant = guessRestaurant(lines, { rid, guest });

    return {
      rid: rid || "",
      restaurant: removeLeadingBoxes(restaurant),
      guest: removeLeadingBoxes(guest),
      date: date || "—",
      time: time || "—",
      people: people || "—",
      seat: removeLeadingBoxes(seat) || "—",
      address: address || "",
      phone: phone || "",
      course: course || "",
      price: price || "",
      note: note || "",
    };
  }

  // ======================
  // 解析工具
  // ======================
  function normalize(s) {
    return String(s || "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .trim();
  }

  function pickValue(lines, keys) {
    // key: value（兼容 key： value 中间空格）
    for (const line of lines) {
      for (const k of keys) {
        const low = line.toLowerCase();
        const k1 = (k + ":").toLowerCase();
        const k2 = (k + "：").toLowerCase();
        if (low.startsWith(k1)) return line.slice(k.length + 1).trim();
        if (low.startsWith(k2)) return line.slice(k.length + 1).trim();
      }
    }
    // key \n value
    for (let i = 0; i < lines.length; i++) {
      for (const k of keys) {
        if (lines[i] === k) {
          for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
            if (lines[j]) return lines[j];
          }
        }
      }
    }
    return "";
  }

  function cleanLead(s) {
    return String(s || "").replace(/^[■□◆●・▶▷►◼︎\-\*]+\s*/g, "").trim();
  }

  function removeLeadingBoxes(s) {
    return String(s || "").replace(/^[■□◆●◼︎]+/g, "").trim();
  }

  function splitPeopleSeat(s) {
    const str = String(s || "").trim();
    if (!str) return { people: "", seat: "" };

    // 1人 / カウンター
    const m = str.match(/(\d{1,2}\s*(?:人|名)?)\s*\/\s*(.+)$/);
    if (m) return { people: m[1].trim(), seat: m[2].trim() };

    // 2 人 / 2名 / 2
    const n = str.match(/(\d{1,2})/);
    return { people: n ? n[1] : str, seat: "" };
  }

  function formatPeople(p) {
    const s = String(p || "").trim();
    if (!s) return "";
    const m = s.match(/(\d{1,2})/);
    if (m) return `${m[1]}名`;
    return cleanLead(s);
  }

  function parseDateTime(anyText) {
    const s = String(anyText || "");

    // 带年：2026年01月15日(木) 17:00
    const mj = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?(\d{1,2}:\d{2})/);
    if (mj) {
      const yyyy = mj[1];
      const mm = String(mj[2]).padStart(2, "0");
      const dd = String(mj[3]).padStart(2, "0");
      return { date: `${yyyy}/${mm}/${dd}`, time: mj[4] };
    }

    // 无年：01月09日(金) 18:00  -> 01/09
    const mj2 = s.match(/(\d{1,2})月(\d{1,2})日.*?(\d{1,2}:\d{2})/);
    if (mj2) {
      const mm = String(mj2[1]).padStart(2, "0");
      const dd = String(mj2[2]).padStart(2, "0");
      return { date: `${mm}/${dd}`, time: mj2[3] };
    }

    // 2026-01-15 17:00 / 2026/01/15 17:00
    const m2 = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2}).*?(\d{1,2}:\d{2})/);
    if (m2) {
      const yyyy = m2[1];
      const mm = String(m2[2]).padStart(2, "0");
      const dd = String(m2[3]).padStart(2, "0");
      return { date: `${yyyy}/${mm}/${dd}`, time: m2[4] };
    }

    // 英文日期（Date.parse）
    const time = (s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i) || s.match(/(\d{1,2}:\d{2})/))?.[1] || "";
    const dp = Date.parse(s);
    if (!Number.isNaN(dp)) {
      const d = new Date(dp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return { date: `${yyyy}/${mm}/${dd}`, time: time || "" };
    }

    return { date: "", time: time || "" };
  }

  function normalizeMoney(s) {
    const t = String(s || "").trim();
    if (!t) return "";
    // 18,900円 / ¥ 42,500 / ￥42,500 -> 统一显示：¥18,900 或 ¥42,500
    const m1 = t.match(/([¥￥]\s?[\d,]+)/);
    if (m1) return `¥${m1[1].replace(/[¥￥\s]/g, "")}`;
    const m2 = t.match(/(\d[\d,]*)円/);
    if (m2) return `¥${m2[1]}`;
    return t;
  }

  function guessAddress(lines) {
    const idx = lines.findIndex(l => /(〒|北海道|東京都|Tokyo|Japan|区|市|町|Chome|City)/i.test(l));
    if (idx < 0) return "";
    let addr = cleanLead(lines[idx]);
    const next = lines[idx + 1] || "";
    if (next && !/(人数|コース|予約|日時|Time|Date|Seats|Total|Price|金額|電話|Phone|TEL)/i.test(next)) {
      addr += " " + cleanLead(next);
    }
    return addr.trim();
  }

  function guessRestaurant(lines, known) {
    const bad = /(予約|id|no\.|日時|日付|時間|人数|住所|電話|phone|address|date|time|seats|guests|total|price|コース|course)/i;
    for (const l of lines) {
      const v = removeLeadingBoxes(cleanLead(l));
      if (!v) continue;
      if (known?.rid && v.includes(known.rid)) continue;
      if (known?.guest && v.includes(known.guest)) continue;
      if (bad.test(v)) continue;
      if (v.length >= 2 && v.length <= 30) return v;
    }
    return "";
  }

  // ======================
  // icon（不依赖 emoji，更日式）
  // ======================
  function drawIcon(type, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, Math.floor(s * 0.10));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (type === "calendar") {
      ctx.strokeRect(x, y + s * 0.15, s, s * 0.85);
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.33);
      ctx.lineTo(x + s, y + s * 0.33);
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
      const cy = y + s * 0.34;
      const r = s * 0.17;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy + r + s * 0.06);
      ctx.lineTo(cx, y + s * 0.82);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.22, y + s * 0.60);
      ctx.lineTo(cx + s * 0.22, y + s * 0.60);
      ctx.stroke();
    } else if (type === "seat") {
      const sx = x + s * 0.22;
      const sy = y + s * 0.18;
      const sw = s * 0.56;
      const sh = s * 0.62;
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
      ctx.moveTo(sx + sw * 0.35, sy + sh * 0.55);
      ctx.lineTo(sx + sw * 0.35, sy + sh);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ======================
  // 文本排版
  // ======================
  function fitFontOneLine(text, maxW, maxFont, minFont, weight, family) {
    const t = String(text || "");
    let size = maxFont;
    ctx.save();
    while (size >= minFont) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(t).width <= maxW) {
        ctx.restore();
        return size;
      }
      size -= 2;
    }
    ctx.restore();
    return minFont;
  }

  function drawMultilineAutoFit({ text, x, y, w, h, maxFont, minFont, lineHeight, color, weight, family }) {
    const t = String(text || "").trim();
    if (!t) return;

    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let fontSize = maxFont;
    while (fontSize >= minFont) {
      ctx.font = `${weight} ${fontSize}px ${family}`;
      const lines = wrapText(t, w, ctx);
      const totalH = lines.length * fontSize * lineHeight;
      if (totalH <= h) {
        let yy = y;
        for (const line of lines) {
          ctx.fillText(line, x, yy);
          yy += fontSize * lineHeight;
        }
        ctx.restore();
        return;
      }
      fontSize -= 2;
    }

    // 仍放不下：截断
    ctx.font = `${weight} ${minFont}px ${family}`;
    const lines = wrapText(t, w, ctx);
    const maxLines = Math.max(1, Math.floor(h / (minFont * lineHeight)));
    const clipped = lines.slice(0, maxLines);
    if (clipped.length) clipped[clipped.length - 1] = clipEllipsis(clipped[clipped.length - 1]);

    let yy = y;
    for (const line of clipped) {
      ctx.fillText(line, x, yy);
      yy += minFont * lineHeight;
    }
    ctx.restore();
  }

  function wrapText(text, maxWidth, ctx) {
    const paragraphs = text.split("\n");
    const lines = [];
    for (const p of paragraphs) {
      if (!p.trim()) { lines.push(""); continue; }
      const tokens = splitKeepWords(p);
      let line = "";
      for (const tok of tokens) {
        const test = line ? line + tok : tok;
        if (ctx.measureText(test).width <= maxWidth) line = test;
        else { if (line) lines.push(line); line = tok.trimStart(); }
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

  function clipEllipsis(line) {
    if (!line) return "…";
    if (line.length <= 2) return "…";
    return line.slice(0, Math.max(0, line.length - 2)) + "…";
  }

  // ======================
  // 不黑屏：提示/错误都画到画布
  // ======================
  function drawTemplateOnly(text) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.80)";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }

  function drawError(msg) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "20px monospace";
    const lines = String(msg).split("\n");
    let y = 80;
    for (const l of lines) {
      ctx.fillText(l, 40, y);
      y += 28;
    }
  }
})();
