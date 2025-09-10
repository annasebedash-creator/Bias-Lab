/* store.js — state, persistence, helpers */

const Store = (() => {
  const KEY = "biaslab:v1";
  const DEFAULT = {
    stats: {
      totalAnswered: 0,
      totalCorrect: 0,
      streak: 0,
      bestStreak: 0,
      lastDay: null,
    },
    badges: {
      novice: false,        // 5 correct
      methodologist: false, // 25 scenarios completed
      streaker: false       // 10 streak
    },
    mastery: {}, // fallacyId -> { seen: n, correct: n }
    settings: {
      audio: true,
      theme: "dark"
    },
    completedScenarioIds: []
  };

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return { ...DEFAULT };
      return { ...DEFAULT, ...JSON.parse(raw) };
    } catch(e){
      return { ...DEFAULT };
    }
  }

  function save(state){
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  // public API
  const state = load();

  function todayStr(){
    const d = new Date(); return d.toISOString().slice(0,10);
  }

  function bumpStreak(){
    const t = todayStr();
    if(state.stats.lastDay !== t){
      // new day, continue or reset
      const was = state.stats.lastDay;
      state.stats.lastDay = t;
      state.stats.streak = (was ? state.stats.streak + 1 : 1);
      state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
    }
  }

  function recordAnswer({fallacyIds, correct, scenarioId}){
    state.stats.totalAnswered += 1;
    if(correct){ state.stats.totalCorrect += 1; }

    fallacyIds.forEach(fid => {
      const m = state.mastery[fid] || { seen:0, correct:0 };
      m.seen += 1; if(correct) m.correct += 1;
      state.mastery[fid] = m;
    });

    if(correct){ bumpStreak(); }
    if(scenarioId && !state.completedScenarioIds.includes(scenarioId)){
      state.completedScenarioIds.push(scenarioId);
    }

    // badges
    if(state.stats.totalCorrect >= 5) state.badges.novice = true;
    if(state.stats.totalAnswered >= 25) state.badges.methodologist = true;
    if(state.stats.bestStreak >= 10) state.badges.streaker = true;

    save(state);
  }

  function accuracy(){
    const { totalAnswered, totalCorrect } = state.stats;
    return totalAnswered ? Math.round((100 * totalCorrect) / totalAnswered) : 0;
  }

  function reset(){
    localStorage.removeItem(KEY);
    const fresh = load();
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, fresh);
    save(state);
  }

  function setSetting(key, val){
    state.settings[key] = val; save(state);
  }

  return { state, save, accuracy, recordAnswer, reset, setSetting };
})();