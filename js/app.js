/* app.js — SPA router, UI, animations, practice engine, library modal */

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const App = (() => {
  const app = $('#app');
  const modalRoot = $('#modal-root');
  const modalContent = $('#modal-content');
  const modalClose = $('#modal-close');
  const themeToggle = $('#theme-toggle');
  const audioToggle = $('#audio-toggle');

  let FALLACIES = [];
  let SCENARIOS = [];

  // --- data loading with fallback ---
  async function loadJSON(path, fallbackScriptId){
    try{
      const r = await fetch(path, { cache: 'no-store' });
      if(!r.ok) throw new Error('fetch failed');
      return await r.json();
    }catch(e){
      const txt = document.getElementById(fallbackScriptId)?.textContent || "[]";
      return JSON.parse(txt);
    }
  }

  async function initData(){
    [FALLACIES, SCENARIOS] = await Promise.all([
      loadJSON('data/fallacies.json', 'fallback-fallacies'),
      loadJSON('data/scenarios.json', 'fallback-scenarios')
    ]);
  }

// --- audio feedback (optional) ---
const AudioFX = (() => {
  let ctx;
  const master = { gain: 0.05 }; // overall volume

  function ensure(){
    if(!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const now = () => ctx.currentTime;

  function env(node, t0, a=0.005, d=0.12, s=0.6, r=0.14, peak=1, sustain=0.4){
    node.gain.cancelScheduledValues(t0);
    node.gain.setValueAtTime(0, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + a);          // attack
    node.gain.linearRampToValueAtTime(sustain, t0 + a + d);   // decay->sustain
    node.gain.linearRampToValueAtTime(0, t0 + a + d + r);     // release
  }
  function connectOut(){
    const g = ctx.createGain();
    g.gain.value = master.gain;
    g.connect(ctx.destination);
    return g;
  }

  function correct(){
    if(!Store.state.settings.audio) return;
    ensure();
    const t = now();
    const out = connectOut();

    // pleasant duet (E5 + B5), tiny shimmer & pitch lift
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), trem = ctx.createOscillator();
    const g1 = ctx.createGain(), g2 = ctx.createGain(), gt = ctx.createGain();
    // master mix for this ding
    const dingMix = ctx.createGain();
    dingMix.gain.value = 0.01;   // lower volume (try 0.15–0.2)

    o1.type = 'sine'; o1.frequency.setValueAtTime(659.26, t); // E5
    o2.type = 'sine'; o2.frequency.setValueAtTime(987.77, t); // B5
    o2.detune.setValueAtTime(+6, t);                          // sparkle

    // subtle 30-cent rise over 120ms
    o1.detune.linearRampToValueAtTime(+30, t + 0.12);
    o2.detune.linearRampToValueAtTime(+30, t + 0.12);

    // gentle tremolo
    trem.type = 'sine'; trem.frequency.setValueAtTime(7, t);
    gt.gain.value = 0.25;
    trem.connect(gt);
    gt.connect(g1.gain);
    gt.connect(g2.gain);

    o1.connect(g1); o2.connect(g2);
    g1.connect(out); g2.connect(out);

    env(g1, t, 0.005, 0.09, 0.5, 0.12, 0.9, 0.45);
    env(g2, t, 0.005, 0.12, 0.5, 0.16, 0.9, 0.45);

    o1.start(t); o2.start(t); trem.start(t);
    const stopAt = t + 0.28;
    o1.stop(stopAt); o2.stop(stopAt); trem.stop(stopAt);
  }

  function wrong(){
    if(!Store.state.settings.audio) return;
    ensure();
    const t = now();
    const out = connectOut();
  
    // === deep thud: sine + a touch of triangle for body ===
    const o1 = ctx.createOscillator(); // low sine
    const o2 = ctx.createOscillator(); // triangle body
    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    const thudMix = ctx.createGain();
  
    thudMix.gain.value = 2.6;        // 🔊 main loudness (raise to taste)
  
    // pitch sweep down for "drop" feel
    o1.type = 'sine';
    o1.frequency.setValueAtTime(170, t);
    o1.frequency.exponentialRampToValueAtTime(70, t + 0.28);
  
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(220, t);
    o2.frequency.exponentialRampToValueAtTime(90, t + 0.24);
  
    // strong amplitude envelope (peaks > 1.0 then comp will tame)
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(1.8, t + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.25, t + 0.20);
    g1.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);
  
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(1.2, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.18, t + 0.18);
    g2.gain.exponentialRampToValueAtTime(0.0008, t + 0.40);
  
    o1.connect(g1); g1.connect(thudMix);
    o2.connect(g2); g2.connect(thudMix);
  
    // optional low-pass to keep it "thud", not buzz
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(800, t);
    lp.frequency.linearRampToValueAtTime(420, t + 0.2);
  
    thudMix.connect(lp);
    lp.connect(out);
  
    o1.start(t); o2.start(t);
    o1.stop(t + 0.45); o2.stop(t + 0.45);
  
    // === tiny muted noise puff for impact (wired correctly this time) ===
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
  
    const ng = ctx.createGain();
    const noiseMix = ctx.createGain();
    noiseMix.gain.value = 0.35;      // keep subtle
    const nlp = ctx.createBiquadFilter();
    nlp.type = 'lowpass'; nlp.frequency.value = 900;
  
    // fast attack/decay for a short puff
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(1.0, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  
    src.connect(nlp); nlp.connect(ng); ng.connect(noiseMix); noiseMix.connect(out);
    src.start(t); src.stop(t + 0.14);
  }
  

  function neutral(){
    if(!Store.state.settings.audio) return;
    ensure();
    // tiny UI click
    const t = now();
    const out = connectOut();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.06);
    o.connect(g); g.connect(out);
    env(g, t, 0.002, 0.03, 0.3, 0.05, 0.8, 0.25);
    o.start(t); o.stop(t + 0.08);
  }

  // legacy shim, in case any old calls remain
  function beep(freq=660, dur=0.12, type='sine', vol=0.03){
    if(!Store.state.settings.audio) return;
    ensure();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(now() + dur);
  }

  return { correct, wrong, neutral, beep };
})();


  // --- router ---
  const routes = {
    "/landing": renderLanding,
    "/dashboard": renderDashboard,
    "/library": renderLibrary,
    "/practice": renderPractice,
    "/profile": renderProfile
  };

  function navigate(path){
    window.location.hash = "#"+path;
  }

  function currentRoute(){
    const raw = window.location.hash.slice(1);       // e.g. "/practice?f=confirmation_bias"
    const path = (raw.split('?')[0] || '/landing');  // "/practice"
    return routes[path] ? path : '/landing';
  }

  function mount(){
    const r = currentRoute();
    routes[r]();
    app.focus({ preventScroll:true });
  }

  window.addEventListener('hashchange', mount);

  // --- theme & audio toggles ---
  function applyTheme(){
    const t = Store.state.settings.theme;
    document.body.classList.toggle('theme-light', t === 'light');
    document.body.classList.toggle('theme-dark', t !== 'light');
    themeToggle.textContent = t === 'light' ? '🌞' : '🌙';
    themeToggle.setAttribute('aria-pressed', t !== 'light' ? 'true' : 'false');
  }
  themeToggle.addEventListener('click', () => {
    const next = Store.state.settings.theme === 'light' ? 'dark' : 'light';
    Store.setSetting('theme', next);
    applyTheme();
  });
  audioToggle.addEventListener('click', () => {
    const next = !Store.state.settings.audio;
    Store.setSetting('audio', next);
    audioToggle.textContent = next ? '🔈' : '🔇';
    audioToggle.setAttribute('aria-pressed', String(next));
    if(next) AudioFX.beep(520, .08);
  });

  // --- modal helpers ---
  function openModal(html){
    modalContent.innerHTML = html;
    modalRoot.classList.remove('hidden');
    modalClose.focus();
    document.addEventListener('keydown', escClose);
  }
  function escClose(e){ if(e.key === 'Escape') closeModal(); }
  function closeModal(){
    modalRoot.classList.add('hidden');
    modalContent.innerHTML = '';
    document.removeEventListener('keydown', escClose);
  }
  modalClose.addEventListener('click', closeModal);
  modalRoot.addEventListener('click', (e)=>{ if(e.target === modalRoot) closeModal(); });

  // --- UI helpers ---
  function kpi(label, value, hint=""){
    return `<div class="card kpi"><div class="big">${value}</div><div>${label}</div><div class="lead">${hint}</div></div>`;
  }
  function tag(t){ return `<span class="tag">${t}</span>`; }
  function progressBar(pct){ return `<div class="progress"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`; }
  function cssColor(hex){
    // Fallback palette by bias id prefix if color is missing/too dark
    const fallback = '#8a5cf6'; // pleasant violet fallback
    const c = (hex && /^#?[0-9a-f]{6}$/i.test(hex)) ? (hex.startsWith('#')?hex:('#'+hex)) : fallback;
  
    // Stronger “wash”: 55% alpha then fade
    return `linear-gradient(120deg, ${c}8c, ${c}29 55%, transparent 70%)`;
  }

  // --- Landing ---
  function renderLanding(){
    app.innerHTML = `
      <section class="hero">
        <div>
          <h1>Cinematic, Research-Minded, <span style="color:var(--wine)">Gamified</span> Learning</h1>
          <p class="lead">Master cognitive biases & logical fallacies through scenarios, instant feedback, and a beautiful, minimal interface.</p>
          <div class="cta">
            <button class="btn primary" id="cta-start">Start Experience</button>
            <a class="btn ghost" href="#/library">Explore Library</a>
          </div>
          <div style="margin-top:16px">${progressBar(Store.accuracy())}</div>
        </div>
        <div class="card">
          <h3>What you’ll do</h3>
          <ul>
            <li>🎯 Identify biases in real-world scenarios</li>
            <li>📚 Study concise, citation-aware entries</li>
            <li>🏆 Earn badges & build streaks</li>
          </ul>
        </div>
      </section>
    `;
    $('#cta-start').addEventListener('click', ()=> navigate('/practice'));
  }

  // --- Dashboard ---
  function renderDashboard(){
    const acc = Store.accuracy();
    const ans = Store.state.stats.totalAnswered;
    const streak = Store.state.stats.streak;
    const best = Store.state.stats.bestStreak;

    app.innerHTML = `
      <section class="section">
        <h2>Welcome back</h2>
        <p class="lead">Keep your streak alive. Practice a scenario or deepen understanding in the library.</p>
        <div class="grid" style="margin-top:10px">
          ${kpi('Accuracy', acc + '%', `${ans} answered`)}
          ${kpi('Current streak', streak + ' days', `Best ${best}`)}
          ${kpi('Badges', countBadges() + ' / 3', badgeListInline())}
        </div>

        <div class="section" style="padding-top:22px">
          <div class="card">
            <h3>Quick actions</h3>
            <div class="cta">
              <a class="btn primary" href="#/practice">Resume practice</a>
              <a class="btn ghost" href="#/library">Open Library</a>
              <button class="btn ghost" id="reset">Reset progress</button>
            </div>
          </div>
        </div>
      </section>
    `;

    $('#reset').addEventListener('click', ()=>{
      if(confirm('Reset all local progress?')){ Store.reset(); mount(); }
    });
  }

  function countBadges(){
    return Object.values(Store.state.badges).filter(Boolean).length;
  }
  function badgeListInline(){
    const b = Store.state.badges;
    return `
      <div class="badges">
        <span class="badge ${b.novice?'unlocked':''}" title="5 correct">Novice Skeptic</span>
        <span class="badge ${b.methodologist?'unlocked':''}" title="25 scenarios">Methodologist</span>
        <span class="badge ${b.streaker?'unlocked':''}" title="10-day streak">Streaker</span>
      </div>`;
  }

  // --- Library ---
  function renderLibrary(){
    app.innerHTML = `
      <section class="section">
        <div class="toolbar">
<div class="search"><input id="lib-search" type="search" placeholder="Search biases & fallacies"></div>
          <div>${FALLACIES.slice(0,3).map(f => tag(f.tags[0] || 'reasoning')).join(' ')}</div>
        </div>
        <div id="lib-grid" class="library"></div>
      </section>
    `;
    const grid = $('#lib-grid');
    function draw(list){
      grid.innerHTML = list.map(f => `
        <article class="f-card card" data-id="${f.id}" style="background:
          linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02)),
          ${cssColor(f.color)}">
          <div class="pill">Difficulty ${'★'.repeat(f.difficulty)}</div>
          <h3>${f.name}</h3>
          <p class="lead">${f.summary}</p>
          <div style="margin-top:8px">${(f.tags||[]).slice(0,4).map(tag).join(' ')}</div>
        </article>
      `).join('');
      $$('.f-card', grid).forEach(el => el.addEventListener('click', () => openEntry(el.dataset.id)));
    }
    draw(FALLACIES);

    $('#lib-search').addEventListener('input', (e)=>{
      const q = e.target.value.trim().toLowerCase();
      if(!q){ draw(FALLACIES); return; }
      const filtered = FALLACIES.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        (f.tags||[]).some(t => t.toLowerCase().includes(q)) ||
        (f.contexts||[]).some(c => c.toLowerCase().includes(q))
      );
      draw(filtered);
    });
  }

  function openEntry(id){
    const f = FALLACIES.find(x => x.id === id);
    if(!f) return;
    const mastery = Store.state.mastery[id] || { seen:0, correct:0 };
    const pct = mastery.seen ? Math.round(100* mastery.correct / mastery.seen) : 0;

    openModal(`
      <h2 id="modal-title">${f.name}</h2>
      <p class="lead">${f.summary}</p>
      <div class="card"><strong>Definition:</strong> ${f.definition}</div>
      <div class="grid" style="grid-template-columns:1fr 1fr; margin-top:10px">
        <div class="card">
          <h3>Classic examples</h3>
          <ul>${f.classic_examples.map(e => `<li>${e}</li>`).join('')}</ul>
        </div>
        <div class="card">
          <h3>Contexts</h3>
          <ul>${f.contexts.map(e => `<li>${e}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="card" style="margin-top:10px">
        <h3>Related research</h3>
        <ul>${(f.related_research||[]).map(r => `<li>${r.author} (${r.year}). <em>${r.title}</em>${r.doi ? ' — DOI: '+r.doi : ''}</li>`).join('')}</ul>
      </div>
      <div class="card" style="margin-top:10px; display:flex; align-items:center; gap:12px">
        <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
        <div>
          <strong>Mastery</strong>
          <div class="lead">${mastery.correct}/${mastery.seen} correct</div>
          <button class="btn primary" id="go-practice" data-id="${id}">See it in a scenario →</button>
        </div>
      </div>
    `);

    $('#go-practice').addEventListener('click', (e)=>{
      const fid = e.target.dataset.id;
      closeModal();
      window.location.hash = '#/practice?f='+encodeURIComponent(fid);
    });
  }

  // --- Practice engine ---
  function renderPractice(){
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const preferId = params.get('f');

    // Filter strictly to selected fallacy if coming from Library; else all
    let pool = preferId
      ? SCENARIOS.filter(s => Array.isArray(s.answers) && s.answers.includes(preferId))
      : [...SCENARIOS];

    if (!pool.length) pool = [...SCENARIOS];                 // fallback
    pool = pool.slice().sort(() => Math.random() - 0.5);     // shuffle
    if (preferId) pool = pool.slice(0, 5);                   // drill cap

    // HUD title (no nested backticks)
    const picked = preferId ? FALLACIES.find(f => f.id === preferId) : null;
    const hudTitle = preferId
      ? 'Drill: <strong>' + (picked ? picked.name : 'Selected') + '</strong>'
      : 'Practice Mode';

    let index = 0;
    let correctCount = 0;

    app.innerHTML = `
      <section class="section practice">
        <div class="hud" style="display:flex;align-items:center;gap:10px;justify-content:space-between">
          <div>${hudTitle}</div>
          <div id="meter">${progressBar(0)}</div>
          <div><span id="counter">Q 1/${pool.length}</span> • Streak: <strong id="streak">${Store.state.stats.streak}</strong></div>
        </div>

        <div id="scn" class="scenario"></div>
        <div id="fb" class="feedback" role="status" aria-live="polite"></div>

        <div class="cta" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn ghost" id="skip">Skip</button>
          <button class="btn success" id="next" disabled>Next</button>
          <button class="btn ghost" id="end">End Session</button>
        </div>
      </section>
    `;

    const scnEl = $('#scn');
    const fb = $('#fb');
    const nextBtn = $('#next');
    const skipBtn = $('#skip');
    const endBtn = $('#end');
    const meter = $('#meter .progress > span');
    const counter = $('#counter');

    function updateMeter(){
      const pct = pool.length ? Math.round(100 * index / pool.length) : 0;
      meter.style.width = `${pct}%`;
      counter.textContent = `Q ${Math.min(index + 1, pool.length)}/${pool.length}`;
    }

    function showSummary(reason = 'Session complete 🎉'){
      scnEl.innerHTML = `
        <h3>${reason}</h3>
        <p>You answered <strong>${correctCount}</strong> out of <strong>${index}</strong> correctly.</p>
        <div class="cta" style="margin-top:10px">
          <a class="btn primary" href="#/dashboard">Back to Dashboard</a>
          <a class="btn ghost" href="#/practice${preferId ? ('?f=' + encodeURIComponent(preferId)) : ''}">Practice again</a>
          <a class="btn ghost" href="#/library">Open Library</a>
        </div>
      `;
      fb.textContent = '';
      nextBtn.disabled = true;
      skipBtn.disabled = true;
      endBtn.disabled = true;
    }

    function drawScenario(){
      if (index >= pool.length) { showSummary(); return; }

      updateMeter();

      const s = pool[index];
      scnEl.innerHTML = `
        <h3>${s.title}</h3>
        <p class="lead">${s.text}</p>
        <div class="options" role="listbox">
          ${s.options.map(o => `<button class="option" role="option" data-id="${o.id}">${o.text}</button>`).join('')}
        </div>
      `;
      fb.textContent = 'Pick the best explanation.';
      nextBtn.disabled = true;

      $$('.option', scnEl).forEach(btn =>
        btn.addEventListener('click', () => choose(s, btn.dataset.id, btn))
      );
    }

    function choose(s, optId, btn){
      const opt = s.options.find(o => o.id === optId);
      const correctOpt = s.options.find(o => !!o.is_correct);
      const isCorrect = !!opt.is_correct;
    
      // visuals + audio
      btn.classList.add(isCorrect ? 'correct' : 'wrong');
     if (isCorrect) { AudioFX.correct(); }
else { AudioFX.wrong(); }
    
      // disable all options and also highlight the correct one
      const allBtns = $$('.option', scnEl);
      allBtns.forEach(b => b.disabled = true);
      if (correctOpt) {
        const correctBtn = allBtns.find(b => b.dataset.id === correctOpt.id);
        if (correctBtn) correctBtn.classList.add('correct');
      }
    
      // record + streak UI
      Store.recordAnswer({ fallacyIds: s.answers, correct: isCorrect, scenarioId: s.id });
      $('#streak').textContent = Store.state.stats.streak;
      if (isCorrect) correctCount++;
    
      // feedback text
      const pickedLine = isCorrect
        ? `✅ <strong>Correct:</strong> ${correctOpt.text} — ${correctOpt.reason}`
        : `❌ <strong>Not quite:</strong> ${opt.text} — ${opt.reason}`;
    
      const correctLine = isCorrect
        ? ''
        : `✅ <strong>Correct answer:</strong> ${correctOpt.text} — ${correctOpt.reason}`;
    
      const explainer = s.explainers?.short
        ? `<div class="lead" style="margin-top:6px">${s.explainers.short}</div>` : '';
    
      fb.innerHTML = `${pickedLine}${correctLine ? '<br>' + correctLine : ''}${explainer}`;
    
      nextBtn.disabled = false;
    }
    

    nextBtn.addEventListener('click', ()=>{
      index++; drawScenario(); updateMeter();
    });

    skipBtn.addEventListener('click', ()=>{
      index++; drawScenario(); updateMeter();
    });

    endBtn.addEventListener('click', ()=>{
      showSummary('Session ended');
    });

    drawScenario();
  }

  // --- Profile / Stats ---
  function renderProfile(){
    const acc = Store.accuracy();
    const total = Store.state.stats.totalAnswered;
    const streak = Store.state.stats.streak;
    const best = Store.state.stats.bestStreak;

    const rows = Object.entries(Store.state.mastery)
      .map(([id, m]) => ({ id, seen:m.seen, correct:m.correct, rate: m.seen? Math.round(100*m.correct/m.seen):0 }))
      .sort((a,b)=> a.rate - b.rate)
      .slice(0,5);

    app.innerHTML = `
      <section class="section">
        <h2>Your Stats</h2>
        <div class="charts">
          <div class="card" style="text-align:center">
            <div class="ring" style="--p:${acc}"><span>${acc}%</span></div>
            <div class="lead">Overall accuracy</div>
          </div>
          <div class="card">
            <div><strong>Streak</strong>: ${streak} days (best ${best})</div>
            <div style="margin-top:10px"><div class="bar"><span style="width:${Math.min(100, total*4)}%"></span></div></div>
            <div class="lead">Total answered: ${total}</div>
            <div style="margin-top:10px">${badgeListInline()}</div>
          </div>
        </div>

        <div class="section">
          <h3>Most missed</h3>
          <div class="grid most-missed-grid" style="grid-template-columns:1fr 1fr 1fr">
          ${rows.length ? rows.map(r => {
              const f = FALLACIES.find(x => x.id === r.id);
              return `<div class="card">
                <strong>${f ? f.name : r.id}</strong>
                <div class="lead">${r.correct}/${r.seen} correct (${r.rate}%)</div>
                <a class="btn ghost" href="#/practice?f=${encodeURIComponent(r.id)}">Practice this</a>
              </div>`;
            }).join('') : `<div class="card">Answer more scenarios to see targeted suggestions.</div>`}
          </div>
        </div>
      </section>
    `;
  }

  // --- boot ---
  async function start(){
    await initData();
    applyTheme();
    audioToggle.textContent = Store.state.settings.audio ? '🔈' : '🔇';
    if(!window.location.hash) window.location.hash = '#/landing';
    mount();
  }

  // kick
  start();

  return { navigate };
})();
