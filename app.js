// Học Mà Chơi - Static V2 (LocalStorage + JSON)

const STORAGE_KEYS = {
  kids: "hmc_kids",
  currentKidId: "hmc_currentKidId",
  scores: "hmc_scores",
};
const DIFF = { easy: 1, medium: 2, hard: 3 };
const SUBJECT_LABEL = {
  tapdoc: "📖 Tập đọc",
  toan: "🔢 Toán",
  english: "🇬🇧 English",
};
const AVATARS = [
  "🧒",
  "👧",
  "👦",
  "🧑",
  "👶",
  "🐱",
  "🐶",
  "🦊",
  "🐼",
  "🐸",
  "🦁",
  "🐰",
  "🐯",
  "🐻",
  "🐨",
  "🐵",
  "🐤",
  "🦄",
  "🐙",
  "🦖",
  "🚀",
  "🌈",
  "⭐",
  "🍀",
];

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const now = () => Date.now();
const loadJSON = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};
const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const normalizeName = (name) => name.toLowerCase().trim().replace(/\s+/g, "-");
const uid = (p = "id") =>
  `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

function dayKey(t = now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const state = {
  activities: [],
  kids: [],
  scores: [],
  currentKid: null,
  session: null,
  lastSubject: "tapdoc",
};

state.selectedKidIdInModal = null;

async function loadActivities() {
  const res = await fetch("activities.json");
  const data = await res.json();
  state.activities = data.activities || [];
}

function pickKidEmoji() {
  const pool = ["🧒", "👧", "👦", "🧑", "👶", "🧒🏻", "🧒🏼", "🧒🏽"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getKids() {
  state.kids = loadJSON(STORAGE_KEYS.kids, []);
  return state.kids;
}
function saveKids() {
  saveJSON(STORAGE_KEYS.kids, state.kids);
}
function getScores() {
  state.scores = loadJSON(STORAGE_KEYS.scores, []);
  return state.scores;
}
function saveScores() {
  saveJSON(STORAGE_KEYS.scores, state.scores);
}

function getCurrentKid() {
  const id = localStorage.getItem(STORAGE_KEYS.currentKidId);
  return state.kids.find((k) => k.id === id) || null;
}

function setCurrentKid(kid) {
  state.currentKid = kid;
  localStorage.setItem(STORAGE_KEYS.currentKidId, kid?.id || "");
  renderTopBar();
}

function isNameTaken(key) {
  return state.kids.some((k) => k.nameKey === key);
}

function suggestNames(base) {
  const suffix = [
    "2",
    "3",
    "5",
    "7",
    "8",
    "9",
    "⭐",
    "🌈",
    "🐱",
    "🚀",
    "Xanh",
    "Đỏ",
    "Vàng",
    "Mây",
    "Sao",
  ];
  const out = [];
  base = base.trim();
  for (const s of suffix) {
    const cand = base + s;
    const k = normalizeName(cand);
    if (!isNameTaken(k)) out.push(cand);
    if (out.length >= 8) break;
  }
  return out;
}

function createKid(name) {
  name = name.trim();
  if (name.length < 2)
    return { ok: false, err: "Tên hơi ngắn 😅 (>= 2 ký tự)" };
  if (name.length > 20)
    return { ok: false, err: "Tên hơi dài 😅 (<= 20 ký tự)" };
  const key = normalizeName(name);
  if (isNameTaken(key))
    return {
      ok: false,
      err: `Tên “${name}” đã có bạn dùng rồi. Con chọn tên khác nhé!`,
      suggestions: suggestNames(name),
    };

  const selected = document.querySelector("#selectedAvatar")?.value;
  const avatar = selected || pickKidEmoji();

  const kid = {
    id: uid("kid"),
    name,
    nameKey: key,
    createdAt: now(),
    emoji: avatar, // <- lưu avatar ở đây
    settings: { autoSpeak: true },
    stats: {
      totalScore: 0,
      totalStars: 0,
      correct: 0,
      wrong: 0,
      bySubject: { tapdoc: 0, toan: 0, english: 0 },
    },
    badges: [],
  };

  state.kids.unshift(kid);
  saveKids();
  setCurrentKid(kid);
  return { ok: true, kid };
}

function renderTopBar() {
  const k = state.currentKid;
  $("#currentKidName").textContent = k ? k.name : "(chưa chọn)";
  $("#kidEmoji").textContent = k ? k.emoji : "🧒";
  $("#kidScore").textContent = k ? k.stats.totalScore : 0;
  $("#kidStars").textContent = k ? k.stats.totalStars : 0;
  $("#badgeCount").textContent = k ? k.badges?.length || 0 : 0;
  $("#progTapDoc").textContent = k ? k.stats.bySubject.tapdoc || 0 : 0;
  $("#progToan").textContent = k ? k.stats.bySubject.toan || 0 : 0;
  $("#progEnglish").textContent = k ? k.stats.bySubject.english || 0 : 0;
  $("#toggleAutoSpeak").checked = k ? !!k.settings.autoSpeak : false;
}

function openModal(id) {
  $("#" + id).classList.remove("hidden");
}
function closeModal(id) {
  $("#" + id).classList.add("hidden");
}

function renderKidsModal() {
  const list = $("#kidsList");
  list.innerHTML = "";
  state.kids.forEach((k) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-ghost flex items-center justify-between";
    btn.innerHTML = `<span class="flex items-center gap-2"><span class="text-xl">${k.emoji}</span><span class="font-bold">${k.name}</span></span><span class="text-sm text-slate-600">⭐ ${k.stats.totalScore}</span>`;
    btn.onclick = () => {
      state.selectedKidIdInModal = k.id;
      setCurrentKid(k); // vẫn cho phép chuyển bé hiện tại
      renderKidsModal(); // re-render để highlight (nếu anh muốn)
    };
    list.appendChild(btn);
    if (state.selectedKidIdInModal === k.id) {
      btn.classList.add("ring-4", "ring-indigo-300");
    }
  });
}

function addScoreEvent({ kidId, score, stars, subject, difficulty }) {
  state.scores.push({
    kidId,
    score,
    stars,
    subject,
    difficulty,
    timestamp: now(),
  });
  saveScores();
}

function leaderboard(range = "all") {
  const t = now();
  let from = 0;
  if (range === "today") {
    const dk = dayKey(t);
    from = new Date(dk + "T00:00:00").getTime();
  } else if (range === "week") {
    from = t - 7 * 24 * 3600 * 1000;
  }
  const filtered =
    range === "all"
      ? state.scores
      : state.scores.filter((s) => s.timestamp >= from);
  const map = new Map();
  filtered.forEach((s) =>
    map.set(s.kidId, (map.get(s.kidId) || 0) + (s.score || 0)),
  );
  return Array.from(map.entries())
    .map(([kidId, score]) => {
      const k = state.kids.find((x) => x.id === kidId);
      return {
        kidId,
        name: k?.name || "Unknown",
        emoji: k?.emoji || "🧒",
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function renderLeaderboard(range) {
  const rows = leaderboard(range);
  const box = $("#leaderboardList");
  if (!rows.length) {
    box.innerHTML =
      '<div class="text-sm text-slate-600">Chưa có dữ liệu. Bé chơi vài câu là có BXH nha! ✨</div>';
    return;
  }
  box.innerHTML = rows
    .slice(0, 20)
    .map(
      (r, i) => `
    <div class="flex items-center justify-between py-2 px-3 rounded-2xl bg-white/60 border border-white/40 mb-2">
      <div class="flex items-center gap-2">
        <div class="w-8 text-center text-lg">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
        <div class="text-xl">${r.emoji}</div>
        <div class="font-bold text-slate-800">${r.name}</div>
      </div>
      <div class="font-extrabold text-slate-800">⭐ ${r.score}</div>
    </div>`,
    )
    .join("");
}

function speak(text, lang = "vi-VN") {
  try {
    if (!text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    speechSynthesis.speak(u);
  } catch {}
}

// 🎲 Random câu hỏi: trộn và lấy 10 câu
function pickQuestions(subject, mode) {
  const diff = DIFF[mode] || 1;

  const pool = state.activities.filter(
    (q) => q.subject === subject && (q.difficulty ?? 1) <= diff,
  );

  const base =
    pool.length > 0
      ? pool
      : state.activities.filter((q) => q.subject === subject);

  const shuffled = shuffleInPlace([...base]);
  const picked = shuffled.slice(0, 10);

  // Nếu vẫn thiếu thì cố gắng bù bằng câu chưa có (nếu còn)
  const pickedIds = new Set(picked.map((x) => x.id));
  const remaining = base.filter((x) => !pickedIds.has(x.id));

  while (picked.length < 10 && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(idx, 1)[0]);
  }

  // Nếu vẫn thiếu (base ít hơn 10) thì mới cho phép lặp
  while (picked.length < 10 && base.length > 0) {
    picked.push(base[Math.floor(Math.random() * base.length)]);
  }

  return picked;
}

function showView(name) {
  if (name === "home") {
    $("#viewHome").classList.remove("hidden");
    $("#viewGame").classList.add("hidden");
  } else {
    $("#viewHome").classList.add("hidden");
    $("#viewGame").classList.remove("hidden");
  }
}

function startSession(subject, mode) {
  if (!state.currentKid) {
    openModal("modalKids");
    return;
  }
  state.lastSubject = subject;
  state.session = {
    subject,
    mode,
    questions: pickQuestions(subject, mode),
    idx: 0,
    wrongInQuestion: 0,
    sessionScore: 0,
    sessionStars: 0,
  };
  showView("game");
  renderQuestion();
}

function scoreForAttempt(a) {
  if (a <= 1) return 10;
  if (a === 2) return 6;
  return 3;
}

function pop(el) {
  if (!el) return;
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}

function setFeedback(text, kind = "info") {
  const el = $("#feedback");
  el.textContent = text;
  el.className =
    "mt-3 text-center text-sm font-bold " +
    (kind === "ok"
      ? "text-emerald-700"
      : kind === "err"
        ? "text-rose-700"
        : "text-slate-700");
}

function handleCorrect() {
  const s = state.session;
  const k = state.currentKid;
  const attempt = s.wrongInQuestion + 1;
  const delta = scoreForAttempt(attempt);
  const star = 1;

  s.sessionScore += delta;
  s.sessionStars += star;

  k.stats.totalScore += delta;
  k.stats.totalStars += star;
  k.stats.correct += 1;
  k.stats.bySubject[s.subject] = (k.stats.bySubject[s.subject] || 0) + 1;

  addScoreEvent({
    kidId: k.id,
    score: delta,
    stars: star,
    subject: s.subject,
    difficulty: DIFF[s.mode],
  });
  saveKids();
  renderTopBar();

  setFeedback(`✅ Đúng rồi! +${delta} điểm ⭐`, "ok");
  pop($("#feedback"));
  confettiBurst();

  s.idx += 1;
  s.wrongInQuestion = 0;

  if (s.idx >= s.questions.length) {
    setTimeout(() => finishSession(), 650);
  } else {
    setTimeout(() => renderQuestion(), 550);
  }
}

function handleWrong() {
  const s = state.session;
  const k = state.currentKid;
  s.wrongInQuestion += 1;
  k.stats.wrong += 1;
  saveKids();
  setFeedback("❌ Chưa đúng. Thử lại nhé! 💪", "err");
  pop($("#feedback"));
}

function finishSession() {
  const s = state.session;
  $("#gameArea").innerHTML = `
    <div class="text-center">
      <div class="text-4xl">🎉</div>
      <div class="mt-2 font-bold text-slate-800">Bé giỏi quá!</div>
      <div class="mt-1 text-slate-700">+${s.sessionScore} điểm • +${s.sessionStars} sao</div>
      <div class="mt-3 flex justify-center gap-2">
        <button class="btn btn-primary" id="btnPlayAgain">Chơi tiếp</button>
        <button class="btn btn-ghost" id="btnGoHome">Về trang chủ</button>
      </div>
    </div>`;
  $("#btnPlayAgain").onclick = () => startSession(s.subject, s.mode);
  $("#btnGoHome").onclick = () => showView("home");
}

function renderQuestion() {
  const s = state.session;
  const q = s.questions[s.idx];
  const k = state.currentKid;

  $("#qIndex").textContent = String(s.idx + 1);
  $("#qTotal").textContent = String(s.questions.length);
  $("#progressBar").style.width = `${(s.idx / s.questions.length) * 100}%`;

  $("#gameMeta").textContent =
    `${SUBJECT_LABEL[s.subject]} • ${s.mode === "easy" ? "😊 Dễ" : s.mode === "medium" ? "😎 Vừa" : "🤯 Khó"} • 🎲 Random`;
  $("#gamePrompt").textContent = q.prompt;
  setFeedback("");

  $("#btnSpeak").onclick = () =>
    speak(q.tts?.text || q.prompt, q.tts?.lang || "vi-VN");
  if (k?.settings?.autoSpeak)
    setTimeout(
      () => speak(q.tts?.text || q.prompt, q.tts?.lang || "vi-VN"),
      200,
    );

  const area = $("#gameArea");
  area.innerHTML = "";

  if (q.type === "ghep_am") area.appendChild(renderGhepAm(q));
  else if (q.type === "sap_xep") area.appendChild(renderSapXep(q));
  else if (q.type === "dien_chu") area.appendChild(renderDienChu(q));
  else if (q.type === "dem_emoji") area.appendChild(renderDemEmoji(q));
  else if (q.type === "alphabet") area.appendChild(renderAlphabet(q));
  else if (q.type === 'chon_hinh') area.appendChild(renderShapeChoice(q));
  else area.appendChild(renderChonDapAn(q));
}

function renderChonDapAn(q) {
  const wrap = document.createElement("div");
  wrap.className = "grid grid-cols-1 sm:grid-cols-3 gap-2";
  q.choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "piece text-center";
    btn.textContent = c;
    btn.onclick = () =>
      String(c) === String(q.answer) ? handleCorrect() : handleWrong();
    wrap.appendChild(btn);
  });
  return wrap;
}

function renderGhepAm(q) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="text-center text-3xl">🧩</div>
    <div class="mt-2 flex flex-wrap justify-center gap-2" id="pieces"></div>
    <div class="mt-3 text-center text-sm text-slate-600">Bấm các thẻ theo thứ tự để ghép lại</div>
    <div class="mt-2 flex justify-center gap-2 items-center">
      <div class="pill">Đã chọn: <span id="chosen" class="font-extrabold"></span></div>
      <button class="btn btn-ghost" id="btnUndo">↩️</button>
      <button class="btn btn-primary" id="btnCheck">OK</button>
    </div>`;

  const box = wrap.querySelector("#pieces");
  const chosenEl = wrap.querySelector("#chosen");
  const chosen = [];

  q.pieces.forEach((p) => {
    const b = document.createElement("button");
    b.className = "piece";
    b.textContent = p;
    b.onclick = () => {
      chosen.push(p);
      chosenEl.textContent = chosen.join("");
    };
    box.appendChild(b);
  });

  wrap.querySelector("#btnUndo").onclick = () => {
    chosen.pop();
    chosenEl.textContent = chosen.join("");
  };
  wrap.querySelector("#btnCheck").onclick = () => {
    chosen.join("") === q.answer ? handleCorrect() : handleWrong();
  };

  return wrap;
}

function renderSapXep(q) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="text-center text-3xl">🧠</div>
    <div class="mt-2 flex flex-wrap justify-center gap-2" id="words"></div>
    <div class="mt-3 text-center text-sm text-slate-600">Bấm các từ theo thứ tự để tạo câu</div>
    <div class="mt-2 flex flex-col items-center gap-2">
      <div class="pill">Câu của bé: <span id="sentence" class="font-extrabold"></span></div>
      <div class="flex gap-2">
        <button class="btn btn-ghost" id="btnUndo">↩️ Hoàn tác</button>
        <button class="btn btn-primary" id="btnCheck">✅ Kiểm tra</button>
      </div>
    </div>`;

  const wordsBox = wrap.querySelector("#words");
  const sentenceEl = wrap.querySelector("#sentence");
  const chosen = [];

  [...q.pieces]
    .sort(() => Math.random() - 0.5)
    .forEach((w) => {
      const b = document.createElement("button");
      b.className = "piece";
      b.textContent = w;
      b.onclick = () => {
        chosen.push(w);
        sentenceEl.textContent = chosen.join(" ");
      };
      wordsBox.appendChild(b);
    });

  wrap.querySelector("#btnUndo").onclick = () => {
    chosen.pop();
    sentenceEl.textContent = chosen.join(" ");
  };
  wrap.querySelector("#btnCheck").onclick = () => {
    chosen.join(" ").trim() === q.answer ? handleCorrect() : handleWrong();
  };

  return wrap;
}

function renderDienChu(q) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="text-center text-3xl">✍️</div>
    <div class="mt-2 text-center text-2xl font-extrabold text-slate-800">${q.template}</div>
    <div class="mt-2 text-center text-sm text-slate-600">Chọn chữ đúng để điền vào chỗ trống</div>`;

  const choices = document.createElement("div");
  choices.className = "mt-3 grid grid-cols-3 gap-2";
  q.choices.forEach((ch) => {
    const btn = document.createElement("button");
    btn.className = "piece text-center";
    btn.textContent = ch;
    btn.onclick = () => {
      q.template.replace("_", ch) === q.answer
        ? handleCorrect()
        : handleWrong();
    };
    choices.appendChild(btn);
  });
  wrap.appendChild(choices);
  return wrap;
}

function renderDemEmoji(q) {
  const wrap = document.createElement("div");
  const line = Array.from({ length: q.count })
    .map(() => q.emoji)
    .join(" ");
  wrap.innerHTML = `
    <div class="text-center text-3xl">🔢</div>
    <div class="mt-2 text-center text-2xl">${line}</div>
    <div class="mt-2 text-center text-sm text-slate-600">Chọn đáp án đúng</div>`;

  const choices = document.createElement("div");
  choices.className = "mt-3 grid grid-cols-3 gap-2";
  q.choices.forEach((ch) => {
    const btn = document.createElement("button");
    btn.className = "piece text-center";
    btn.textContent = ch;
    btn.onclick = () => {
      String(ch) === String(q.answer) ? handleCorrect() : handleWrong();
    };
    choices.appendChild(btn);
  });
  wrap.appendChild(choices);
  return wrap;
}

function renderAlphabet(q) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="text-center text-3xl">🔤</div>
    <div class="mt-2 text-center text-6xl font-extrabold text-slate-800">${q.letter}</div>
    <div class="mt-2 text-center text-sm text-slate-600">Bấm 🔊 để nghe rồi chọn đáp án</div>`;

  const choices = document.createElement("div");
  choices.className = "mt-3 grid grid-cols-3 gap-2";
  q.choices.forEach((ch) => {
    const btn = document.createElement("button");
    btn.className = "piece text-center";
    btn.textContent = ch;
    btn.onclick = () => {
      String(ch) === String(q.answer) ? handleCorrect() : handleWrong();
    };
    choices.appendChild(btn);
  });
  wrap.appendChild(choices);
  return wrap;
}

function renderShapeChoice(q){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="text-center text-3xl">🪒</div>
    <div class="mt-2 text-center text-7xl">${q.shape || '⬜'}</div>
    <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2" id="choices"></div>
  `;

  const box = wrap.querySelector('#choices');
  q.choices.forEach(c=>{
    const btn=document.createElement('button');
    btn.className='piece text-center';
    btn.textContent=c;
    btn.onclick=()=> String(c)===String(q.answer) ? handleCorrect() : handleWrong();
    box.appendChild(btn);
  });

  return wrap;
}

// Backup
function exportBackup() {
  const payload = {
    version: "1.1",
    exportedAt: new Date().toISOString(),
    kids: loadJSON(STORAGE_KEYS.kids, []),
    currentKidId: localStorage.getItem(STORAGE_KEYS.currentKidId),
    scores: loadJSON(STORAGE_KEYS.scores, []),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  $("#backupMsg").className = "mt-3 text-sm text-emerald-700";
  $("#backupMsg").textContent = "✅ Đã xuất backup.json";
}

function importBackup(file) {
  if (!file) {
    $("#backupMsg").className = "mt-3 text-sm text-rose-700";
    $("#backupMsg").textContent = "❌ Chưa chọn file JSON";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const p = JSON.parse(reader.result);
      if (!p.kids || !p.scores) throw new Error("bad");
      saveJSON(STORAGE_KEYS.kids, p.kids);
      saveJSON(STORAGE_KEYS.scores, p.scores);
      localStorage.setItem(STORAGE_KEYS.currentKidId, p.currentKidId || "");
      getKids();
      getScores();
      setCurrentKid(getCurrentKid() || state.kids[0] || null);
      renderKidsModal();
      renderLeaderboard("all");
      $("#backupMsg").className = "mt-3 text-sm text-emerald-700";
      $("#backupMsg").textContent = "✅ Khôi phục thành công! 🎉";
    } catch {
      $("#backupMsg").className = "mt-3 text-sm text-rose-700";
      $("#backupMsg").textContent = "❌ File không đúng định dạng";
    }
  };
  reader.readAsText(file);
}

// Confetti
function confettiBurst() {
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.remove("hidden");

  const colors = [
    "#ec4899",
    "#6366f1",
    "#22c55e",
    "#f97316",
    "#06b6d4",
    "#a855f7",
  ];
  const pieces = Array.from({ length: 120 }).map(() => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.2,
    r: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
    vx: -2 + Math.random() * 4,
    vy: 3 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
  }));

  const start = performance.now();
  const duration = 650;

  function frame(t) {
    const elapsed = t - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.classList.add("hidden");
  }
  requestAnimationFrame(frame);
}

function wireEvents() {
  // open modals
  $("#btnOpenKids").onclick = () => {
    renderKidsModal();
    renderAvatarPicker("🧒");
    openModal("modalKids");
  };
  $("#btnOpenLeaderboard").onclick = () => {
    renderLeaderboard("all");
    openModal("modalLeaderboard");
  };
  $("#btnOpenBackup").onclick = () => {
    $("#backupMsg").textContent = "";
    openModal("modalBackup");
  };

  // close modals
  $$("[data-close]").forEach(
    (b) => (b.onclick = () => closeModal(b.getAttribute("data-close"))),
  );

  // create kid
  $("#btnCreateKid").onclick = () => {
    const name = $("#kidNameInput").value;
    const res = createKid(name);
    const err = $("#nameError");
    const sug = $("#nameSuggestions");
    sug.innerHTML = "";
    if (res.ok) {
      err.classList.add("hidden");
      $("#kidNameInput").value = "";
      document.querySelector("#selectedAvatar").value = "🧒";
      renderAvatarPicker("🧒");
      renderKidsModal();
      closeModal("modalKids");
    } else {
      err.textContent = res.err;
      err.classList.remove("hidden");
      (res.suggestions || []).forEach((s) => {
        const chip = document.createElement("button");
        chip.className = "btn btn-ghost";
        chip.textContent = s;
        chip.onclick = () => {
          $("#kidNameInput").value = s;
        };
        sug.appendChild(chip);
      });
    }
  };

  $("#kidNameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#btnCreateKid").click();
  });

  // toggle autospeak
  $("#toggleAutoSpeak").onchange = (e) => {
    if (!state.currentKid) return;
    state.currentKid.settings.autoSpeak = e.target.checked;
    saveKids();
  };

  // subjects
  $$(".subject").forEach((btn) => {
    btn.onclick = () => {
      state.lastSubject = btn.dataset.subject;
      startSession(btn.dataset.subject, "easy");
    };
  });

  // modes use last chosen subject
  $$("[data-mode]").forEach((btn) => {
    btn.onclick = () =>
      startSession(state.lastSubject || "tapdoc", btn.dataset.mode);
  });

  // leaderboard
  $$("[data-lb]").forEach(
    (btn) => (btn.onclick = () => renderLeaderboard(btn.dataset.lb)),
  );

  // exit game
  $("#btnExitGame").onclick = () => showView("home");

  // backup
  $("#btnExport").onclick = exportBackup;
  $("#btnImport").onclick = () => importBackup($("#fileImport").files?.[0]);

  // resize confetti
  window.addEventListener("resize", () => {
    const c = $("#confetti");
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });

  $("#btnChangeAvatar").onclick = () => {
    if (!state.selectedKidIdInModal) {
      // chưa chọn bé
      const err = $("#nameError");
      err.textContent = "Con hãy chọn 1 bé trong danh sách trước nhé 🙂";
      err.classList.remove("hidden");
      return;
    }

    // mở picker nếu chưa render
    renderAvatarPicker(state.currentKid?.emoji || "🧒");

    // Khi chọn xong avatar, cập nhật cho bé được chọn
    const hidden = document.querySelector("#selectedAvatar");
    if (!hidden) return;

    // Gắn handler “mỗi lần avatar thay đổi”
    // (Cách đơn giản: thêm 1 nút xác nhận)
    // Nếu anh muốn auto-save ngay khi click avatar, xem phần 2.5
  };
}

async function boot() {
  await loadActivities();
  getKids();
  getScores();

  const kid = getCurrentKid() || state.kids[0] || null;
  if (kid) setCurrentKid(kid);
  else {
    openModal("modalKids");
    renderAvatarPicker("🧒");
  }
  renderTopBar();
  wireEvents();
  showView("home");
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderAvatarPicker(defaultAvatar = "🧒") {
  const box = document.querySelector("#avatarPicker");
  const hidden = document.querySelector("#selectedAvatar");
  if (!box || !hidden) return;

  // set default
  hidden.value = hidden.value || defaultAvatar;

  box.innerHTML = "";
  AVATARS.forEach((av) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "piece text-center"; // reuse style sẵn có
    btn.textContent = av;

    // highlight selected
    if (hidden.value === av) btn.classList.add("ring-4", "ring-indigo-300");

    btn.onclick = () => {
      hidden.value = av;

      // ✅ AUTO-SAVE: đổi avatar cho bé đang chọn trong modal
      if (state.selectedKidIdInModal) {
        const kid = state.kids.find((k) => k.id === state.selectedKidIdInModal);
        if (kid) {
          kid.emoji = av;
          saveKids();
          renderTopBar();
          renderKidsModal();
        }
      }

      renderAvatarPicker(av);
    };

    box.appendChild(btn);
  });
}

boot();
