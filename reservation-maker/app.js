(() => {
  /** =========================
   *  基础安全初始化
   *  ========================= */
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d"); // ⚠️ 不传任何参数，100%安全
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  let TEMPLATE_READY = false;
  let lastDataURL = null;

  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  /** =========================
   *  模板加载（绝不黑屏）
   *  ========================= */
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
    drawError("template.png 加载失败，请确认文件名、路径、大小写");
  };

  /** =========================
   *  按钮逻辑（全 try/catch）
   *  ========================= */
  btnGenerate.addEventListener("click", () => {
    try {
      if (!TEMPLATE_READY) throw "模板未加载完成";
      const raw = (inputEl.value || "").trim();
      if (!raw) throw "未粘贴预约信息";
      render(raw);
      btnDownload.disabled = false;
    } catch (e) {
      drawError(e);
    }
  });

  btnDownload.addEventListener("click", () => {
    if (!lastDataURL) return;
    const a = document.createElement("a");
    a.href = lastDataURL;
    a.download = "预约确认函.png";
    a.click();
  });

  /** =========================
   *  主渲染入口
   *  ========================= */
  function render(raw) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

    const data = extractFields(raw);
    drawHeader(data);
    drawIconRow(data);
    drawBody(data);

    lastDataURL = canvas.toDataURL("image/png");
  }

  /** =========================
   *  Header：店名 + 预约人（居中）
   *  ========================= */
  function drawHeader(d) {
    const centerX = canvas.width / 2;
    let y = canvas.height * 0.33;

    ctx.textAlign = "center";
    ctx.fillStyle = "#f3f3f4";

    // 店名
    ctx.font = "700 64px serif";
    ctx.fillText(d.restaurant || "（未识别店名）", centerX, y);

    // 预约人
    y += 76;
    ctx.font = "600 36px sans-serif";
    ctx.fillText(d.guest || "（未识别预约人）", centerX, y);
  }

  /** =========================
   *  4 格 Icon 行（日期/时间/人数/席位）
   *  ========================= */
  function drawIconRow(d) {
    const startY = canvas.height * 0.40;
    const startX = canvas.width * 0.15;
    const totalW = canvas.width * 0.70;
    const colW = totalW / 4;

    const items = [
      ["日期", d.date, "📅"],
      ["时间", d.time, "🕒"],
      ["人数", d.people, "👤"],
      ["席位", d.seat || "—", "💺"], // 席位单独一格
    ];

    items.forEach((it, i) => {
      const x = startX + colW * i;
      ctx.textAlign = "left";

      ctx.font = "600 22px sans-serif";
      ctx.fillStyle = "#d7b46a";
      ctx.fillText(`${it[2]} ${it[0]}`, x, startY);

      ctx.font = i === 3 ? "700 34px sans-serif" : "600 30px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(it[1] || "—", x, startY + 34);
    });
  }

  /** =========================
   *  主体信息（地址/套餐/金额）
   *  ========================= */
  function drawBody(d) {
    let y = canvas.height * 0.48;
    const x = canvas.width * 0.15;

    ctx.textAlign = "left";
    ctx.font = "500 28px sans-serif";
    ctx.fillStyle = "#f3f3f4";

    if (d.address) {
      ctx.fillText(`地址：${d.address}`, x, y);
      y += 38;
    }
    if (d.course) {
      ctx.fillText(`套餐：${d.course}`, x, y);
      y += 38;
    }
    if (d.price) {
      ctx.fillText(`金额：${d.price}`, x, y);
    }
  }

  /** =========================
   *  字段提取（中 / 日 / 英）
   *  ========================= */
  function extractFields(raw) {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

    const pick = (keys) => {
      for (let i = 0; i < lines.length; i++) {
        if (keys.includes(lines[i])) return lines[i + 1] || "";
        for (const k of keys) {
          if (lines[i].startsWith(k + ":"))
            return lines[i].slice(k.length + 1).trim();
        }
      }
      return "";
    };

    const restaurant = pick(["店舗名", "店名", "Restaurant"]);
    const guest = pick(["予約名", "予約人", "Reservation Name"]);
    const datetime = pick(["日時", "Date"]);
    const peopleLine = pick(["人数", "Seats"]);
    const course = pick(["コース", "Course"]);
    const address = lines.find(l => /東京都|Tokyo|Japan/.test(l)) || "";

    let date = "—", time = "—", people = "—", seat = "";

    if (datetime) {
      const m = datetime.match(/(\d{4}).*?(\d{2}:\d{2})/);
      if (m) {
        date = m[1];
        time = m[2];
      }
    }

    if (peopleLine) {
      const m = peopleLine.match(/(\d+).+?\/\s*(.+)/);
      if (m) {
        people = `${m[1]}名`;
        seat = m[2];
      } else {
        people = peopleLine;
      }
    }

    return {
      restaurant,
      guest,
      date,
      time,
      people,
      seat,
      course,
      address,
      price: raw.match(/¥[\d,]+/)?.[0] || ""
    };
  }

  /** =========================
   *  安全绘制工具
   *  ========================= */
  function drawTemplateOnly(text) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  function drawError(msg) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "22px monospace";
    ctx.fillText(String(msg), 40, 100);
  }
})();
