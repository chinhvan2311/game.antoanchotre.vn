// Học Mà Chơi - Static (LocalStorage + JSON)
// Mobile-first, nhiều màu + emoji + animation

const STORAGE_KEYS = {
  kids: 'hmc_kids',
  currentKidId: 'hmc_currentKidId',
  scores: 'hmc_scores',
  badges: 'hmc_badges'
};

const DIFF = { easy: 1, medium: 2, hard: 3 };
const SUBJECT_LABEL = { tapdoc: '📖 Tập đọc', toan: '🔢 Toán', english: '🇬🇧 English' };

// ---------- Utilities ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function now() { return Date.now(); }
function dayKey(t = now()){
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function normalizeName(name){
  return name.toLowerCase().trim().replace(/\s+/g,'-');
}

function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix='id'){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function toast(msg, kind='info'){
  const el = $('#backupMsg');
  if(!el) return;
  el.className = 'mt-3 text-sm ' + (kind==='ok' ? 'text-emerald-700' : kind==='err' ? 'text-red-700' : 'text-slate-700');
  el.textContent = msg;
}

// ---------- State ----------
const state = {
  data: null,
  kids: [],
  scores: [],
  currentKid: null,
  session: null, // { subject, diff, questions[], idx, score, stars, attempts }
};

// ---------- Data loading ----------
async function loadActivities(){
  const res = await fetch('activities.json');
  const data = await res.json();
  state.data = data.activities;
}

// ---------- Kids ----------
function getKids(){
  state.kids = loadJSON(STORAGE_KEYS.kids, []);
  return state.kids;
}

function saveKids(){ saveJSON(STORAGE_KEYS.kids, state.kids); }

function getCurrentKid(){
  const id = localStorage.getItem(STORAGE_KEYS.currentKidId);
  if(!id) return null;
  return state.kids.find(k => k.id === id) || null;
}

function setCurrentKid(kid){
  state.currentKid = kid;
  localStorage.setItem(STORAGE_KEYS.currentKidId, kid?.id || '');
  renderTopBar();
}

function isNameTaken(nameKey){
  return state.kids.some(k => k.nameKey === nameKey);
}

function suggestNames(baseDisplay){
  const base = baseDisplay.trim();
  const suffixes = ['2','3','5','7','8','9','⭐','🌈','🐱','🚀','Xanh','Đỏ','Vàng','Mây','Sao'];
  const suggestions = [];
  for(const s of suffixes){
    const candidate = base + s;
    const key = normalizeName(candidate);
    if(!isNameTaken(key)) suggestions.push(candidate);
    if(suggestions.length>=8) break;
  }
  return suggestions;
}

function createKid(displayName){
  const name = displayName.trim();
  if(name.length < 2) return { ok:false, err:'Tên hơi ngắn 😅 (ít nhất 2 ký tự)' };
  if(name.length > 20) return { ok:false, err:'Tên hơi dài 😅 (tối đa 20 ký tự)' };

  const key = normalizeName(name);
  if(isNameTaken(key)){
    return { ok:false, err:`Tên “${name}” đã có bạn dùng rồi. Con chọn tên khác nhé!`, suggestions: suggestNames(name) };
  }

  const kid = {
    id: uid('kid'),
    name,
    nameKey: key,
    createdAt: now(),
    emoji: pickKidEmoji(),
    settings: { autoSpeak: true },
    stats: {
      totalScore: 0,
      totalStars: 0,
      correct: 0,
      wrong: 0,
      bySubject: { tapdoc: 0, toan: 0, english: 0 },
    },
    badges: []
  };

  state.kids.unshift(kid);
  saveKids();
  setCurrentKid(kid);
  return { ok:true, kid };
}

function pickKidEmoji(){
  const pool = ['🧒','👧','👦','🧑','👶','🧒🏻','🧒🏼','🧒🏽'];
  return pool[Math.floor(Math.random()*pool.length)];
}

// ---------- Scores / Leaderboard ----------
function getScores(){
  state.scores = loadJSON(STORAGE_KEYS.scores, []);
  return state.scores;
}
function saveScores(){ saveJSON(STORAGE_KEYS.scores, state.scores); }

function addScoreEvent({kidId, score, stars, subject, difficulty}){
  state.scores.push({ kidId, score, stars, subject, difficulty, timestamp: now() });
  saveScores();
}

function leaderboard(range='all'){
  const t = now();
  let from = 0;
  if(range==='today'){
    const dk = dayKey(t);
    from = new Date(dk+'T00:00:00').getTime();
  } else if(range==='week'){
    from = t - 7*24*3600*1000;
  }

  const filtered = (range==='all') ? state.scores : state.scores.filter(s => s.timestamp >= from);
  const map = new Map();
  for(const s of filtered){
    map.set(s.kidId, (map.get(s.kidId)||0) + (s.score||0));
  }
  const rows = Array.from(map.entries()).map(([kidId, score]) => {
    const kid = state.kids.find(k => k.id===kidId);
    return { kidId, name: kid?.name || 'Unknown', emoji: kid?.emoji || '🧒', score };
  }).sort((a,b)=>b.score-a.score);
  return rows;
}

// ---------- Badges ----------
function awardBadges(kid){
  // Very simple badge rules
  const earned = new Set(kid.badges || []);
  const b = [];

  if(kid.stats.correct >= 10) b.push({id:'correct_10', label:'10 câu đúng', icon:'🏅'});
  if(kid.stats.correct >= 30) b.push({id:'correct_30', label:'30 câu đúng', icon:'🥈'});
  if(kid.stats.totalScore >= 200) b.push({id:'score_200', label:'200 điểm', icon:'🏆'});
  if(kid.stats.bySubject.tapdoc >= 10) b.push({id:'tv_10', label:'Tập đọc 10', icon:'📖'});
  if(kid.stats.bySubject.toan >= 10) b.push({id:'toan_10', label:'Toán 10', icon:'🔢'});
  if(kid.stats.bySubject.english >= 10) b.push({id:'en_10', label:'English 10', icon:'🇬🇧'});

  let newOnes = [];
  for(const x of b){
    if(!earned.has(x.id)){
      earned.add(x.id);
      newOnes.push(x);
    }
  }

  kid.badges = Array.from(earned);
  saveKids();
  $('#badgeCount').textContent = kid.badges.length;
  return newOnes;
}

// ---------- Speech ----------
function speak(text, lang='vi-VN'){
  try{
    if(!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }catch(e){
    // ignore
  }
}

// ---------- Game session ----------
function pickQuestions(subject, diffMode){
  const diff = DIFF[diffMode] ?? 1;
  const pool = state.data.filter(a => a.subject===subject && a.difficulty<=diff);
  // If pool too small, fallback to subject regardless diff
  const base = pool.length>=5 ? pool : state.data.filter(a=>a.subject===subject);
  // Shuffle
  const shuffled = [...base].sort(()=>Math.random()-0.5);
  return shuffled.slice(0, 10);
}

function startSession(subject, diffMode){
  if(!state.currentKid){ openModal('modalKids'); return; }
  const questions = pickQuestions(subject, diffMode);
  state.session = {
    subject,
    diffMode,
    questions,
    idx: 0,
    sessionScore: 0,
    sessionStars: 0,
    attempts: 0,
    wrongInQuestion: 0,
    startAt: now()
  };
  showView('game');
  renderQuestion();
}

function scoreForAttempt(attempt){
  // attempt: 1 => 10, 2 => 6, 3+ => 3
  if(attempt<=1) return 10;
  if(attempt==2) return 6;
  return 3;
}

function handleCorrect(){
  const s = state.session;
  const kid = state.currentKid;
  const attempt = s.wrongInQuestion + 1;
  const delta = scoreForAttempt(attempt);
  const star = 1;

  s.sessionScore += delta;
  s.sessionStars += star;

  // Update kid stats
  kid.stats.totalScore += delta;
  kid.stats.totalStars += star;
  kid.stats.correct += 1;
  kid.stats.bySubject[s.subject] = (kid.stats.bySubject[s.subject]||0) + 1;

  addScoreEvent({ kidId: kid.id, score: delta, stars: star, subject: s.subject, difficulty: DIFF[s.diffMode] });

  saveKids();
  renderTopBar();

  // Feedback + confetti
  setFeedback(`✅ Đúng rồi! +${delta} điểm ⭐`, 'ok');
  pop($('#feedback'));
  confettiBurst();

  // Next
  s.idx += 1;
  s.wrongInQuestion = 0;

  // Award badges if any
  const newBadges = awardBadges(kid);
  if(newBadges.length){
    setTimeout(()=>{ setFeedback(`🎉 Bé nhận huy hiệu mới: ${newBadges[0].icon} ${newBadges[0].label}`, 'ok'); }, 600);
  }

  if(s.idx >= s.questions.length){
    setTimeout(()=>finishSession(), 700);
  } else {
    setTimeout(()=>renderQuestion(), 600);
  }
}

function handleWrong(){
  const s = state.session;
  const kid = state.currentKid;
  s.wrongInQuestion += 1;
  kid.stats.wrong += 1;
  saveKids();
  renderTopBar();
  setFeedback('❌ Chưa đúng. Thử lại nhé! 💪', 'err');
  pop($('#feedback'));
}

function finishSession(){
  const s = state.session;
  setFeedback(`🎊 Hoàn thành! Tổng: ${s.sessionScore} điểm • ${s.sessionStars} sao`, 'ok');
  $('#gameArea').innerHTML = `
    <div class="text-center">
      <div class="text-4xl">🎉</div>
      <div class="mt-2 font-bold text-slate-800">Bé giỏi quá!</div>
      <div class="mt-1 text-slate-700">+${s.sessionScore} điểm • +${s.sessionStars} sao</div>
      <div class="mt-3 flex justify-center gap-2">
        <button class="btn btn-primary" id="btnPlayAgain">Chơi tiếp</button>
        <button class="btn btn-ghost" id="btnGoHome">Về trang chủ</button>
      </div>
    </div>
  `;
  $('#btnPlayAgain').onclick = ()=> startSession(s.subject, s.diffMode);
  $('#btnGoHome').onclick = ()=> showView('home');
}

function setFeedback(text, kind='info'){
  const el = $('#feedback');
  el.textContent = text;
  el.className = 'mt-3 text-center text-sm font-bold ' + (kind==='ok' ? 'text-emerald-700' : kind==='err' ? 'text-rose-700' : 'text-slate-700');
}

function pop(el){
  if(!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

// ---------- Render ----------
function showView(name){
  if(name==='home'){
    $('#viewHome').classList.remove('hidden');
    $('#viewGame').classList.add('hidden');
  } else {
    $('#viewHome').classList.add('hidden');
    $('#viewGame').classList.remove('hidden');
  }
}

function renderTopBar(){
  const kid = state.currentKid;
  $('#currentKidName').textContent = kid ? kid.name : '(chưa chọn)';
  $('#kidEmoji').textContent = kid ? kid.emoji : '🧒';
  $('#kidScore').textContent = kid ? kid.stats.totalScore : 0;
  $('#kidStars').textContent = kid ? kid.stats.totalStars : 0;
  $('#badgeCount').textContent = kid ? (kid.badges?.length||0) : 0;

  $('#progTapDoc').textContent = kid ? (kid.stats.bySubject.tapdoc||0) : 0;
  $('#progToan').textContent = kid ? (kid.stats.bySubject.toan||0) : 0;
  $('#progEnglish').textContent = kid ? (kid.stats.bySubject.english||0) : 0;

  $('#toggleAutoSpeak').checked = kid ? !!kid.settings.autoSpeak : false;
}

function renderKidsModal(){
  const list = $('#kidsList');
  list.innerHTML = '';
  for(const kid of state.kids){
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost flex items-center justify-between';
    btn.innerHTML = `
      <span class="flex items-center gap-2"><span class="text-xl">${kid.emoji||'🧒'}</span><span class="font-bold">${kid.name}</span></span>
      <span class="text-sm text-slate-600">⭐ ${kid.stats.totalScore}</span>
    `;
    btn.onclick = ()=>{ setCurrentKid(kid); closeModal('modalKids'); };
    list.appendChild(btn);
  }
}

function renderLeaderboard(range){
  const rows = leaderboard(range);
  const box = $('#leaderboardList');
  if(!rows.length){
    box.innerHTML = `<div class="text-sm text-slate-600">Chưa có dữ liệu. Bé chơi vài câu là có BXH nha! ✨</div>`;
    return;
  }
  box.innerHTML = rows.slice(0,20).map((r, idx)=>`
    <div class="flex items-center justify-between py-2 px-3 rounded-2xl bg-white/60 border border-white/40 mb-2">
      <div class="flex items-center gap-2">
        <div class="w-8 text-center text-lg">${idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':(idx+1)}</div>
        <div class="text-xl">${r.emoji}</div>
        <div class="font-bold text-slate-800">${r.name}</div>
      </div>
      <div class="font-extrabold text-slate-800">⭐ ${r.score}</div>
    </div>
  `).join('');
}

function renderQuestion(){
  const s = state.session;
  const q = s.questions[s.idx];
  const kid = state.currentKid;

  $('#qIndex').textContent = String(s.idx+1);
  $('#qTotal').textContent = String(s.questions.length);
  $('#progressBar').style.width = `${((s.idx)/s.questions.length)*100}%`;

  $('#gameMeta').textContent = `${SUBJECT_LABEL[s.subject]} • ${s.diffMode==='easy'?'😊 Dễ':s.diffMode==='medium'?'😎 Vừa':'🤯 Khó'}`;
  $('#gamePrompt').textContent = q.prompt;

  setFeedback('');

  // Speak logic
  $('#btnSpeak').onclick = ()=> speak(q.tts?.text || q.prompt, q.tts?.lang || 'vi-VN');
  if(kid?.settings?.autoSpeak){
    setTimeout(()=> speak(q.tts?.text || q.prompt, q.tts?.lang || 'vi-VN'), 200);
  }

  // Render different question types
  const area = $('#gameArea');
  area.innerHTML = '';

  if(q.type==='ghep_am'){
    area.appendChild(renderGhepAm(q));
  } else if(q.type==='sap_xep'){
    area.appendChild(renderSapXep(q));
  } else {
    area.appendChild(renderChonDapAn(q));
  }
}

function renderChonDapAn(q){
  const wrap = document.createElement('div');
  wrap.className = 'grid grid-cols-1 sm:grid-cols-3 gap-2';
  q.choices.forEach(choice=>{
    const btn = document.createElement('button');
    btn.className = 'piece text-center';
    btn.textContent = choice;
    btn.onclick = ()=>{
      if(String(choice)===String(q.answer)) handleCorrect(); else handleWrong();
    };
    wrap.appendChild(btn);
  });
  return wrap;
}

function renderGhepAm(q){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="text-center text-3xl">🧩</div>
    <div class="mt-2 flex flex-wrap justify-center gap-2" id="pieces"></div>
    <div class="mt-3 text-center text-sm text-slate-600">Bấm các thẻ theo thứ tự để ghép lại</div>
    <div class="mt-2 flex justify-center gap-2 items-center">
      <div class="pill">Đã chọn: <span id="chosen" class="font-extrabold"></span></div>
      <button class="btn btn-ghost" id="btnUndo">↩️</button>
      <button class="btn btn-primary" id="btnCheck">OK</button>
    </div>
  `;
  const piecesBox = wrap.querySelector('#pieces');
  const chosenEl = wrap.querySelector('#chosen');
  const chosen = [];

  q.pieces.forEach(p=>{
    const b = document.createElement('button');
    b.className = 'piece';
    b.textContent = p;
    b.onclick = ()=>{ chosen.push(p); chosenEl.textContent = chosen.join(''); };
    piecesBox.appendChild(b);
  });

  wrap.querySelector('#btnUndo').onclick = ()=>{ chosen.pop(); chosenEl.textContent = chosen.join(''); };
  wrap.querySelector('#btnCheck').onclick = ()=>{
    const ans = chosen.join('');
    if(ans===q.answer) handleCorrect(); else handleWrong();
  };

  return wrap;
}

function renderSapXep(q){
  const wrap = document.createElement('div');
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
    </div>
  `;

  const wordsBox = wrap.querySelector('#words');
  const sentenceEl = wrap.querySelector('#sentence');
  const chosen = [];

  // Shuffle pieces for more fun
  const shuffled = [...q.pieces].sort(()=>Math.random()-0.5);
  shuffled.forEach(w=>{
    const b = document.createElement('button');
    b.className = 'piece';
    b.textContent = w;
    b.onclick = ()=>{
      chosen.push(w);
      sentenceEl.textContent = chosen.join(' ');
    };
    wordsBox.appendChild(b);
  });

  wrap.querySelector('#btnUndo').onclick = ()=>{ chosen.pop(); sentenceEl.textContent = chosen.join(' '); };
  wrap.querySelector('#btnCheck').onclick = ()=>{
    const ans = chosen.join(' ').trim();
    if(ans===q.answer) handleCorrect(); else handleWrong();
  };

  return wrap;
}

// ---------- Backup (Export/Import) ----------
function exportBackup(){
  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    kids: loadJSON(STORAGE_KEYS.kids, []),
    currentKidId: localStorage.getItem(STORAGE_KEYS.currentKidId),
    scores: loadJSON(STORAGE_KEYS.scores, [])
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('✅ Đã xuất backup.json', 'ok');
}

function importBackup(file){
  if(!file){ toast('❌ Chưa chọn file JSON', 'err'); return; }
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const payload = JSON.parse(reader.result);
      if(!payload || !payload.kids || !payload.scores){
        toast('❌ File không đúng định dạng backup', 'err');
        return;
      }
      saveJSON(STORAGE_KEYS.kids, payload.kids);
      saveJSON(STORAGE_KEYS.scores, payload.scores);
      localStorage.setItem(STORAGE_KEYS.currentKidId, payload.currentKidId || '');

      // reload state
      getKids();
      getScores();
      setCurrentKid(getCurrentKid() || state.kids[0] || null);
      renderKidsModal();
      renderLeaderboard('all');
      toast('✅ Khôi phục thành công! 🎉', 'ok');
    }catch(e){
      toast('❌ Không đọc được file JSON', 'err');
    }
  };
  reader.readAsText(file);
}

// ---------- Modals ----------
function openModal(id){ $('#'+id).classList.remove('hidden'); }
function closeModal(id){ $('#'+id).classList.add('hidden'); }

// ---------- Confetti ----------
let confettiTimer = null;
function confettiBurst(){
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.remove('hidden');

  const colors = ['#ec4899','#6366f1','#22c55e','#f97316','#06b6d4','#a855f7'];
  const pieces = Array.from({length: 120}).map(()=>({
    x: Math.random()*canvas.width,
    y: -20 - Math.random()*canvas.height*0.2,
    r: 4 + Math.random()*6,
    c: colors[Math.floor(Math.random()*colors.length)],
    vx: -2 + Math.random()*4,
    vy: 3 + Math.random()*6,
    rot: Math.random()*Math.PI,
    vr: -0.2 + Math.random()*0.4
  }));

  const start = performance.now();
  const duration = 650;

  function frame(t){
    const elapsed = t - start;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const p of pieces){
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r);
      ctx.restore();
    }
    if(elapsed < duration){
      requestAnimationFrame(frame);
    } else {
      canvas.classList.add('hidden');
    }
  }
  requestAnimationFrame(frame);
}

// ---------- Events ----------
function wireEvents(){
  // Open modals
  $('#btnOpenKids').onclick = ()=>{ renderKidsModal(); openModal('modalKids'); };
  $('#btnOpenLeaderboard').onclick = ()=>{ renderLeaderboard('all'); openModal('modalLeaderboard'); };
  $('#btnOpenBackup').onclick = ()=>{ toast(''); openModal('modalBackup'); };

  // Close modals
  $$('[data-close]').forEach(b=>{
    b.onclick = ()=> closeModal(b.getAttribute('data-close'));
  });

  // Create kid
  $('#btnCreateKid').onclick = ()=>{
    const name = $('#kidNameInput').value;
    const result = createKid(name);
    if(result.ok){
      $('#nameError').classList.add('hidden');
      $('#nameSuggestions').innerHTML = '';
      $('#kidNameInput').value = '';
      renderKidsModal();
      closeModal('modalKids');
    } else {
      $('#nameError').textContent = result.err;
      $('#nameError').classList.remove('hidden');
      const sug = $('#nameSuggestions');
      sug.innerHTML = '';
      (result.suggestions||[]).forEach(s=>{
        const chip = document.createElement('button');
        chip.className = 'btn btn-ghost';
        chip.textContent = s;
        chip.onclick = ()=>{ $('#kidNameInput').value = s; };
        sug.appendChild(chip);
      });
    }
  };

  // Toggle autospeak
  $('#toggleAutoSpeak').onchange = (e)=>{
    if(!state.currentKid) return;
    state.currentKid.settings.autoSpeak = e.target.checked;
    saveKids();
  };

  // Subject buttons
  $$('.subject').forEach(btn=>{
    btn.onclick = ()=> startSession(btn.dataset.subject, 'easy');
  });

  // Mode buttons (from home)
  $$('[data-mode]').forEach(btn=>{
    btn.onclick = ()=>{
      // Start with last chosen subject? If none, default tapdoc
      const subject = (state.session?.subject) || 'tapdoc';
      startSession(subject, btn.dataset.mode);
    };
  });

  // Leaderboard range
  $$('[data-lb]').forEach(btn=>{
    btn.onclick = ()=> renderLeaderboard(btn.dataset.lb);
  });

  // Exit game
  $('#btnExitGame').onclick = ()=> showView('home');

  // Backup
  $('#btnExport').onclick = exportBackup;
  $('#btnImport').onclick = ()=> importBackup($('#fileImport').files?.[0]);

  // Allow Enter key on name input
  $('#kidNameInput').addEventListener('keydown', (e)=>{
    if(e.key==='Enter') $('#btnCreateKid').click();
  });

  window.addEventListener('resize', ()=>{
    const canvas = $('#confetti');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ---------- Boot ----------
async function boot(){
  await loadActivities();
  getKids();
  getScores();

  const kid = getCurrentKid() || state.kids[0] || null;
  if(kid) setCurrentKid(kid);
  else openModal('modalKids');

  renderTopBar();
  wireEvents();
  showView('home');
}

boot();
