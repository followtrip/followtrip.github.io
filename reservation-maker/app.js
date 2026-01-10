// ===============================
// Reservation Card Generator
// STABLE FINAL VERSION (No Black Screen)
// ===============================
(() => {
  const $ = (id) => document.getElementById(id);
  const input = $("input");
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  const btnGen = $("btnGenerate");
  const btnDown = $("btnDownload");

  btnGen.disabled = true;
  btnDown.disabled = true;

  let lastURL = null;

  /* ===============================
     Template Load (Anti Black Screen)
  =============================== */
  const tpl = new Image();
  tpl.src = `./template.png?v=${Date.now()}`;

  tpl.onload = () => {
    canvas.width = tpl.naturalWidth;
    canvas.height = tpl.naturalHeight;
    ctx.drawImage(tpl, 0, 0);
    drawCenterText("请粘贴预约信息后点击生成");
    btnGen.disabled = false;
  };

  tpl.onerror = () => {
    canvas.width = 1200;
    canvas.height = 800;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.fillText("❌ template.png 加载失败", 40, 80);
  };

  /* ===============================
     Button
  =============================== */
  btnGen.onclick = () => {
    const raw = input.value.trim();
    if (!raw) return alert("请先粘贴预约信息");
    render(raw);
    btnDown.disabled = false;
  };

  btnDown.onclick = () => {
    if (!lastURL) return;
    const a = document.createElement("a");
    a.href = lastURL;
    a.download = "reservation.png";
    a.click();
  };

  /* ===============================
     Main Render
  =============================== */
  function render(raw) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tpl, 0, 0);

    const f = parse(raw);

    drawHeader(f);
    drawIcons(f);
    drawDetails(f);

    lastURL = canvas.toDataURL("image/png");
  }

  /* ===============================
     Parse Logic (Rewritten)
  =============================== */
  function parse(raw) {
    const lines = raw
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const join = lines.join("\n");

    const pick = (keys) => {
      for (let k of keys) {
        // key: value
        let m = join.match(new RegExp(`${k}\\s*[:：]\\s*(.+)`, "i"));
        if (m) return m[1].trim();
        // key\nvalue
        for (let i = 0; i < lines.length - 1; i++) {
          if (lines[i] === k) return lines[i + 1];
        }
      }
      return "";
    };

    const rid =
      pick(["予約ID", "予約番号", "Reservation No", "Reservation ID"]) ||
      (join.match(/\b[A-Z0-9]{6,10}\b/) || [])[0] ||
      "";

    const restaurant =
      pick(["店舗名", "店名", "Restaurant"]) ||
      lines.find(
        (l) =>
          l.length <= 30 &&
          !l.match(/予約|日時|人数|名|:/) &&
          !l.match(/^\d/)
      ) ||
      "";

    const guest =
      pick(["予約名", "予約人", "Reservation Name"]) ||
      lines.find((l) => l.match(/様$/)) ||
      "";

    let date = "";
    let time = "";

    const dt =
      pick(["日時", "Date"]) ||
      join.match(/\d{4}年\d+月\d+日/)?.[0] ||
      "";

    if (dt) {
      date = formatDate(dt);
      time =
        join.match(/\d{1,2}:\d{2}\s*(AM|PM)?/i)?.[0] || "";
    }

    const people =
      pick(["人数", "Seats"]) ||
      join.match(/\d+\s*(人|名)/)?.[0] ||
      "";

    const seat =
      pick(["席", "Seat"]) ||
      (people.includes("/") ? people.split("/")[1] : "");

    const address = pick(["住所", "Address"]);
    const phone = pick(["電話", "Phone"]);
    const course = pick(["コース", "Course"]);
    const price = pick(["金額", "Total Price"]);

    const extra = lines
      .filter(
        (l) =>
          !join.includes(l) ||
          ![
            rid,
            restaurant,
            guest,
            date,
            time,
            people,
            seat,
            address,
          ].includes(l)
      )
      .join("\n");

    return {
      rid,
      restaurant,
      guest,
      date,
      time,
      people,
      seat,
      address,
      phone,
      course,
      price,
      extra,
    };
  }

  /* ===============================
     Drawing
  =============================== */
  function drawHeader(f) {
    const cx = canvas.width / 2;
    let y = canvas.height * 0.33;

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "48px serif";
    ctx.fillText(f.restaurant || "—", cx, y);

    y += 56;
    ctx.font = "32px sans-serif";
    ctx.fillText(f.guest || "—", cx, y);
  }

  function drawIcons(f) {
    const y = canvas.height * 0.42;
    const gap = canvas.width * 0.18;
    const x0 = canvas.width * 0.2;

    const items = [
      ["日期", f.date],
      ["时间", f.time],
      ["人数", f.people],
      ["席位", f.seat],
    ];

    ctx.textAlign = "left";
    ctx.fillStyle = "#d7b46a";
    ctx.font = "22px sans-serif";

    items.forEach((it, i) => {
      ctx.fillText(it[0], x0 + gap * i, y);
      ctx.fillStyle = "#fff";
      ctx.font = "28px sans-serif";
      ctx.fillText(it[1] || "—", x0 + gap * i, y + 34);
      ctx.fillStyle = "#d7b46a";
      ctx.font = "22px sans-serif";
    });
  }

  function drawDetails(f) {
    let y = canvas.height * 0.53;
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = "26px sans-serif";

    [
      f.address && `地址：${f.address}`,
      f.phone && `电话：${f.phone}`,
      f.course && `套餐：${f.course}`,
      f.price && `金额：${f.price}`,
      f.extra && `备注：${f.extra}`,
    ]
      .filter(Boolean)
      .forEach((t) => {
        ctx.fillText(t, canvas.width * 0.18, y);
        y += 36;
      });
  }

  function drawCenterText(t) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "28px sans-serif";
    ctx.fillText(t, canvas.width / 2, canvas.height * 0.55);
  }

  function formatDate(s) {
    const m = s.match(/(\d{4})年(\d+)月(\d+)日/);
    if (m) return `${m[1]}/${m[2].padStart(2, "0")}/${m[3].padStart(2, "0")}`;
    const d = Date.parse(s);
    if (!isNaN(d)) {
      const x = new Date(d);
      return `${x.getFullYear()}/${String(x.getMonth() + 1).padStart(
        2,
        "0"
      )}/${String(x.getDate()).padStart(2, "0")}`;
    }
    return s;
  }
})();
