(() => {
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d"); // 兼容最稳
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  let TEMPLATE_READY = false;
  let lastDataURL = null;

  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  // ===== 模板加载（永不黑屏：失败就画错误信息）=====
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
  // 渲染
  // ======================
  function render(raw) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

    const d = extractFields(raw);

    const layout = getLayout();
    drawHeader(d, layout);
    drawIconRow(d, layout);
    drawBody(d, layout);

    lastDataURL = canvas.toDataURL("image/png");
  }

  // ======================
  // 布局（按模板比例，稳定落在金框内）
  // ======================
  function getLayout() {
    const W = canvas.width;
    const H = canvas.height;

    // 金框内内容区（你现在这张模板更“留白”，用这个更稳）
    const box = {
      x: W * 0.14,
      y: H * 0.28,
      w: W * 0.72,
      h: H * 0.52,
    };

    return {
      W,
      H,
      box,
      header: {
        x: box.x,
        y: box.y + box.h * 0.08,
        w: box.w,
        h: box.h * 0.22,
      },
      iconRow: {
        x: box.x,
        y: box.y + box.h * 0.33,
        w: box.w,
        h: box.h * 0.13,
      },
      body: {
        x: box.x,
        y: box.y + box.h * 0.50,
        w: box.w,
        h: box.h * 0.42,
      },
    };
  }

  // ======================
  // Header：店名居中 / 预约人紧贴下方 / NO 作为金色小行（可选）
  // ======================
  function drawHeader(d, L) {
    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const centerX = L.header.x + L.header.w / 2;

    const restaurant = d.restaurant || "（未识别店名）";
    const guest = d.guest || "（未识别预约人）";
    const rid = d.rid ? `NO. ${d.rid}` : "";

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // 店名：更日式（衬线更高级）
    let y = L.header.y;
    const nameFont = fitFontOneLine(restaurant, L.header.w * 0.92, 66, 40, 700, `"Noto Serif JP","Noto Serif SC","Times New Roman",serif`);
    ctx.fillStyle = WHITE;
    ctx.font = `700 ${nameFont}px "Noto Serif JP","Noto Serif SC","Times New Roman",serif`;
    ctx.fillText(restaurant, centerX, y);

    // 预约人：紧贴店名下方
    y += nameFont + 10;
    const guestFont = fitFontOneLine(guest, L.header.w * 0.85, 36, 24, 650, `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`);
    ctx.fillStyle = WHITE;
    ctx.font = `650 ${guestFont}px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
    ctx.fillText(guest, centerX, y);

    // NO：金色小字（存在才画）
    if (rid) {
      y += guestFont + 10;
      ctx.fillStyle = GOLD;
      ctx.font = `700 26px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(rid, centerX, y);
    }

    ctx.restore();
  }

  // ======================
  // 4格 Icon 行：日期/时间/人数/席位（席位更突出）
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

    // 淡金分隔线（更高级）
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

      // icon（矢量画，不用emoji，更“日式”）
      const iconSize = Math.max(20, Math.floor(L.iconRow.h * 0.38));
      drawIcon(it.icon, x + 8, topY + 4, iconSize, GOLD);

      // label
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = MUTED;
      ctx.font = `700 20px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(it.label, x + iconSize + 16, topY + 2);

      // value：席位突出
      const maxW = segW - (iconSize + 30);
      const valueFont = fitFontOneLine(
        it.value,
        maxW,
        it.highlight ? 36 : 32,
        20,
        it.highlight ? 800 : 700,
        `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`
      );

      ctx.fillStyle = WHITE;
      ctx.font = `${it.highlight ? 800 : 700} ${valueFont}px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(it.value, x + iconSize + 16, topY + 30);
      ctx.restore();
    }
  }

  // ======================
  // Body：地址/套餐/金额（自动换行 + 自动缩字）
  // ======================
  function drawBody(d, L) {
    const WHITE = "#f3f3f4";

    const lines = [];
    if (d.address) lines.push(`地址：${d.address}`);
    if (d.course) lines.push(`套餐：${d.course}`);
    if (d.price) lines.push(`金额：${d.price}`);

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
      lineHeight: 1.5,
      color: WHITE,
      weight: 650,
      family: `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`,
    });
  }

  // ======================
  // 字段提取（强力升级：日文/英文混合 + key下一行）
  // ======================
  function extractFields(raw) {
    const text = normalize(raw);
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

    // key: value 或 key\nvalue
    const get = (keys) => pickValue(lines, keys);

    const rid = cleanLead(get([
      "予約ID","予約番号","予約No","予約Ｎｏ",
      "Reservation ID","Reservation No","Booking ID","Confirmation","Confirmation No","Confirmation #"
    ]));

    let restaurant = cleanLead(get(["店舗名","店名","レストラン","Restaurant","Restaurant Name","Venue"]));
    let guest = cleanLead(get(["予約名","予約人","予約者","お名前","ご予約名","Reservation Name","Guest","Guest Name","Name","Booker"]));

    // 日时（一个字段里通常含日期+时间）
    const datetime = get(["日時","予約日時","Date","Time","Reservation Date","Booking Date"]);

    // 日期/时间解析（修复你现在只出2026的问题）
    const { date, time } = parseDateTime(datetime || text);

    // 人数/席位
    let peopleLine = get(["人数","予約人数","Seats","Guests","Party Size","People"]);
    peopleLine = cleanLead(peopleLine);

    let people = "";
    let seat = cleanLead(get(["席","席位","お席","席種","Seat","Seating"]));

    // 如果 peopleLine 里带 “1人 / カウンター”
    const ps = splitPeopleSeat(peopleLine);
    if (ps.people) people = ps.people;
    if (!seat && ps.seat) seat = ps.seat;

    // 地址：优先 Address/住所，否则抓“像地址的行”
    let address = cleanLead(get(["住所","所在地","Address","Venue Address","Location"]));
    if (!address) address = guessAddress(lines);

    // 套餐/金额
    let course = cleanLead(get(["コース","コース名","Course","Menu","Package","Plan"]));
    let price = cleanLead(get(["総額","合計","料金","金額","Total Price","Total","Price"]));
    if (!price) price = (text.match(/[¥￥]\s?[\d,]+/) || [""])[0];

    // 兜底：如果店名没识别到，别把预约号/人名当店名
    if (!restaurant) restaurant = guessRestaurant(lines, { rid, guest });

    // 标准化输出
    return {
      rid: rid || "",
      restaurant: removeLeadingBoxes(restaurant),
      guest: removeLeadingBoxes(guest),
      date: date || "—",
      time: time || "—",
      people: formatPeople(people),
      seat: removeLeadingBoxes(seat),
      address,
      course,
      price,
    };
  }

  // ========== 解析工具 ==========
  function normalize(s) {
    return String(s || "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .trim();
  }

  function pickValue(lines, keys) {
    // key: value
    for (const line of lines) {
      for (const k of keys) {
        if (line.toLowerCase().startsWith((k + ":").toLowerCase())) {
          return line.slice(k.length + 1).trim();
        }
        if (line.toLowerCase().startsWith((k + "：").toLowerCase())) {
          return line.slice(k.length + 1).trim();
        }
      }
    }
    // key \n value
    for (let i = 0; i < lines.length; i++) {
      for (const k of keys) {
        if (lines[i] === k) {
          // 往后找一个非空行
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
    // 解决你截图里“店名前面有符号”的情况（■□等）
    return String(s || "").replace(/^[■□◆●◼︎]+/g, "").trim();
  }

  function splitPeopleSeat(s) {
    const str = String(s || "").trim();
    if (!str) return { people: "", seat: "" };
    const m = str.match(/(\d{1,2}\s*(?:人|名)?)\s*\/\s*(.+)$/);
    if (!m) {
      // 纯数字
      const n = str.match(/(\d{1,2})/);
      return { people: n ? `${n[1]}名` : str, seat: "" };
    }
    return { people: m[1].trim(), seat: m[2].trim() };
  }

  function parseDateTime(anyText) {
    const s = String(anyText || "");

    // 日文：2026年01月15日(木) 17:00
    const mj = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?(\d{1,2}:\d{2})/);
    if (mj) {
      const yyyy = mj[1];
      const mm = String(mj[2]).padStart(2, "0");
      const dd = String(mj[3]).padStart(2, "0");
      const time = mj[4];
      return { date: `${yyyy}/${mm}/${dd}`, time };
    }

    // 2026-01-15 17:00 / 2026/01/15 17:00
    const m2 = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2}).*?(\d{1,2}:\d{2})/);
    if (m2) {
      const yyyy = m2[1];
      const mm = String(m2[2]).padStart(2, "0");
      const dd = String(m2[3]).padStart(2, "0");
      return { date: `${yyyy}/${mm}/${dd}`, time: m2[4] };
    }

    // 英文：Tuesday February 10, 2026 + 8:30 PM
    const time = (s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i) || s.match(/(\d{1,2}:\d{2})/))?.[1] || "";
    // 尝试 Date.parse 从英文中抓日期
    const dp = Date.parse(s);
    if (!Number.isNaN(dp)) {
      const d = new Date(dp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return { date: `${yyyy}/${mm}/${dd}`, time: time || "" };
    }

    // 最后兜底：全局找一个日文日期 + 时间
    const d3 = s.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)?.[1] || "";
    const t3 = s.match(/(\d{1,2}:\d{2})/)?.[1] || "";
    if (d3) {
      const mj2 = d3.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (mj2) {
        const yyyy = mj2[1];
        const mm = String(mj2[2]).padStart(2, "0");
        const dd = String(mj2[3]).padStart(2, "0");
        return { date: `${yyyy}/${mm}/${dd}`, time: t3 || "" };
      }
    }

    return { date: "", time: time || "" };
  }

  function formatPeople(p) {
    const s = String(p || "").trim();
    if (!s) return "—";
    const m = s.match(/(\d{1,2})/);
    if (m) return `${m[1]}名`;
    return cleanLead(s);
  }

  function guessAddress(lines) {
    // 找“像地址”的行：含 Tokyo/東京都/〒/区/市/町 等
    const idx = lines.findIndex(l => /(〒|東京都|Tokyo|Japan|区|市|町|Chome|City)/i.test(l));
    if (idx < 0) return "";
    let addr = cleanLead(lines[idx]);
    // 拼接下一行（如果也像地址）
    const next = lines[idx + 1] || "";
    if (next && !/(人数|コース|予約|日時|Time|Date|Seats|Total|Price|金額)/i.test(next)) {
      addr += " " + cleanLead(next);
    }
    return addr.trim();
  }

  function guessRestaurant(lines, known) {
    // 避免把 rid / guest 当店名
    const bad = /(予約|id|no\.|日時|日付|時間|人数|住所|電話|phone|address|date|time|seats|guests|total|price)/i;

    for (const l of lines) {
      const v = removeLeadingBoxes(cleanLead(l));
      if (!v) continue;
      if (known?.rid && v.includes(known.rid)) continue;
      if (known?.guest && v.includes(known.guest)) continue;
      if (bad.test(v)) continue;
      // 店名一般不太长
      if (v.length >= 2 && v.length <= 30) return v;
    }
    return "";
  }

  // ========== 高级 icon（画出来，不用emoji）==========
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
      // 背
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + sh * 0.55);
      ctx.stroke();
      // 坐面
      ctx.beginPath();
      ctx.moveTo(sx, sy + sh * 0.55);
      ctx.lineTo(sx + sw, sy + sh * 0.55);
      ctx.stroke();
      // 腿
      ctx.beginPath();
      ctx.moveTo(sx + sw, sy + sh * 0.55);
      ctx.lineTo(sx + sw, sy + sh);
      ctx.moveTo(sx + sw * 0.35, sy + sh * 0.55);
      ctx.lineTo(sx + sw * 0.35, sy + sh);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ========== 文本排版工具 ==========
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
      if (!p.trim()) {
        lines.push("");
        continue;
      }
      const tokens = splitKeepWords(p);
      let line = "";
      for (const tok of tokens) {
        const test = line ? line + tok : tok;
        if (ctx.measureText(test).width <= maxWidth) {
          line = test;
        } else {
          if (line) lines.push(line);
          line = tok.trimStart();
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

  function clipEllipsis(line) {
    if (!line) return "…";
    if (line.length <= 2) return "…";
    return line.slice(0, Math.max(0, line.length - 2)) + "…";
  }

  // ========== 画模板/画错误（永不黑屏） ==========
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
