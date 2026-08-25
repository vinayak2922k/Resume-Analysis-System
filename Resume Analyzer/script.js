(function(){
  const STOPWORDS = new Set(['a','an','and','are','as','at','be','been','being','but','by','for','from','has','have','had','he','her','hers','him','his','i','if','in','into','is','it','its','itself','me','my','no','nor','not','of','on','or','our','ours','out','over','own','s','she','so','some','such','t','than','that','the','their','theirs','them','then','there','these','they','this','those','through','to','too','under','until','up','very','was','we','were','what','when','where','which','while','who','whom','why','will','with','you','your','yours','will','can','could','should','would','also','etc','per','via','across','within','both','each','more','most','other','any','all','only','same','than','ll','re','ve','don']);

  const $ = (id) => document.getElementById(id);
  const resumeInput = $('resumeInput'), jdInput = $('jdInput');
  const scanBtn = $('scanBtn'), scanHint = $('scanHint');
  const resumeTray = $('resumeTray'), jdTray = $('jdTray');
  const results = $('results');

  /* ---------- storage helpers ---------- */
  async function storageGet(key){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch(e){ return null; }
  }
  async function storageSet(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }
    catch(e){ /* fail silently, non-critical */ }
  }

  /* ---------- theme ---------- */
  const themeToggle = $('themeToggle');
  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', theme === 'dark');
  }
  themeToggle.addEventListener('click', async () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    await storageSet('resume-analyzer-theme', next);
  });
  (async () => {
    const saved = await storageGet('resume-analyzer-theme');
    if (saved) applyTheme(saved);
  })();

  /* ---------- word counters + validation ---------- */
  function wordCount(text){ return (text.trim().match(/\S+/g) || []).length; }
  function updateCounts(){
    $('resumeCount').textContent = wordCount(resumeInput.value) + ' words';
    $('jdCount').textContent = wordCount(jdInput.value) + ' words';
    const ready = resumeInput.value.trim().length >= 40 && jdInput.value.trim().length >= 40;
    scanBtn.disabled = !ready;
    scanHint.textContent = ready
      ? 'Ready to scan.'
      : 'Paste a few sentences in both trays to enable scanning.';
    scanHint.classList.remove('error');
  }
  resumeInput.addEventListener('input', updateCounts);
  jdInput.addEventListener('input', updateCounts);

  /* ---------- text analysis ---------- */
  function tokenize(text){
    return (text.toLowerCase().match(/[a-z0-9+#]{2,}/g) || []);
  }
  function extractKeywordFreq(text){
    const freq = {};
    tokenize(text).forEach(t => {
      if (!STOPWORDS.has(t)) freq[t] = (freq[t] || 0) + 1;
    });
    return freq;
  }
  function countSyllables(word){
    word = word.toLowerCase().replace(/[^a-z]/g,'');
    if (!word) return 0;
    let matches = word.match(/[aeiouy]+/g);
    let count = matches ? matches.length : 1;
    if (word.endsWith('e') && count > 1) count--;
    return Math.max(count, 1);
  }
  function fleschReadingEase(text){
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const words = text.match(/[A-Za-z']+/g) || [];
    if (sentences.length === 0 || words.length === 0) return null;
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  function readabilityLabel(score){
    if (score >= 90) return 'Very Easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly Difficult';
    if (score >= 30) return 'Difficult';
    return 'Very Confusing';
  }
  function verdictFor(score){
    if (score >= 80) return {label:'Excellent Match', color:'var(--teal)'};
    if (score >= 60) return {label:'Good Match', color:'var(--teal)'};
    if (score >= 40) return {label:'Fair Match', color:'var(--amber)'};
    return {label:'Weak Match', color:'var(--red)'};
  }
  function buildSuggestions({score, missing, resumeWords, readability}){
    const tips = [];
    if (score < 40){
      tips.push(`Only ${score}% of key terms from the job description appear in your resume. Review the missing list and add any that genuinely reflect your experience.`);
    } else if (score < 70){
      tips.push(`You're matching ${score}% of key terms — a solid start. Weaving in a few more missing keywords could meaningfully improve your ranking.`);
    } else {
      tips.push(`Strong match at ${score}%. Your resume already speaks the job description's language well.`);
    }
    if (missing.length){
      tips.push(`Highest-priority missing terms: ${missing.slice(0,6).join(', ')}.`);
    }
    if (resumeWords < 150){
      tips.push(`Your resume is quite short (${resumeWords} words). Most reviewers expect 350–800 words of relevant detail.`);
    }
    if (readability !== null){
      tips.push(`Readability: ${readabilityLabel(readability)} (Flesch score ${readability}). ${readability < 40 ? 'Consider shorter, more direct bullet points.' : 'Sentence length and complexity look reasonable.'}`);
    }
    return tips;
  }

  /* ---------- rendering ---------- */
  function renderChips(container, words, kind){
    container.innerHTML = '';
    if (!words.length){
      const p = document.createElement('p');
      p.className = 'empty-note';
      p.textContent = kind === 'matched' ? 'No overlapping keywords found.' : 'Nothing missing — great coverage!';
      container.appendChild(p);
      return;
    }
    words.forEach(w => {
      const span = document.createElement('span');
      span.className = 'chip ' + kind;
      span.textContent = w;
      container.appendChild(span);
    });
  }

  function setGauge(score){
    const path = $('gaugeFill');
    const L = path.getTotalLength();
    path.style.strokeDasharray = L;
    path.style.strokeDashoffset = L;
    path.style.transition = 'none';
    // force reflow then animate
    void path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset 1s cubic-bezier(.34,1.4,.64,1), stroke 0.4s ease';
    path.style.strokeDashoffset = L * (1 - score / 100);
    const v = verdictFor(score);
    path.style.stroke = v.color;
    const angle = -90 + (score / 100) * 180;
    $('gaugeNeedle').style.transform = `rotate(${angle}deg)`;
    $('scoreNumber').textContent = score + '%';
    $('scoreVerdict').textContent = v.label;
    $('scoreVerdict').style.color = v.color;
  }

  let lastReport = null;

  async function runScan(){
    resumeTray.classList.add('scanning');
    jdTray.classList.add('scanning');
    scanBtn.disabled = true;

    await new Promise(r => setTimeout(r, 650));

    resumeTray.classList.remove('scanning');
    jdTray.classList.remove('scanning');

    const resumeText = resumeInput.value;
    const jdText = jdInput.value;

    const jdFreq = extractKeywordFreq(jdText);
    const jdKeywords = Object.keys(jdFreq).sort((a,b) => jdFreq[b] - jdFreq[a]).slice(0, 30);

    if (jdKeywords.length < 3){
      scanHint.textContent = 'Job description is too short to extract meaningful keywords. Add more detail.';
      scanHint.classList.add('error');
      scanBtn.disabled = false;
      return;
    }

    const resumeTokens = new Set(tokenize(resumeText).filter(t => !STOPWORDS.has(t)));
    const matched = jdKeywords.filter(k => resumeTokens.has(k));
    const missing = jdKeywords.filter(k => !resumeTokens.has(k));
    const score = Math.round((matched.length / jdKeywords.length) * 100);
    const readability = fleschReadingEase(resumeText);
    const resumeWords = wordCount(resumeText);

    setGauge(score);
    $('readabilityNumber').textContent = readability === null ? '—' : readability;
    $('readabilityLabel').textContent = readability === null ? 'Not enough text to score.' : readabilityLabel(readability) + ' to read.';
    $('lengthNumber').textContent = resumeWords;

    renderChips($('matchedChips'), matched, 'matched');
    renderChips($('missingChips'), missing, 'missing');

    const tips = buildSuggestions({score, missing, resumeWords, readability});
    const list = $('suggestionsList');
    list.innerHTML = '';
    tips.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      list.appendChild(li);
    });

    results.hidden = false;
    requestAnimationFrame(() => results.classList.add('visible'));

    lastReport = {score, matched, missing, readability, resumeWords, jdKeywords, date: new Date()};
    await saveHistoryEntry(lastReport);

    scanBtn.disabled = false;
  }

  scanBtn.addEventListener('click', runScan);

  /* ---------- history ---------- */
  async function saveHistoryEntry(report){
    const history = (await storageGet('resume-analyzer-history')) || [];
    history.unshift({
      date: report.date.toISOString(),
      score: report.score,
      verdict: verdictFor(report.score).label
    });
    const trimmed = history.slice(0, 15);
    await storageSet('resume-analyzer-history', trimmed);
    renderHistory(trimmed);
  }

  function renderHistory(history){
    const list = $('historyList');
    const empty = $('historyEmpty');
    const count = $('historyCount');
    list.innerHTML = '';
    count.textContent = history.length ? `(${history.length})` : '';
    if (!history.length){
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    history.forEach(h => {
      const li = document.createElement('li');
      const d = new Date(h.date);
      const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      li.innerHTML = `<span>${dateStr} — ${h.verdict}</span><span class="score">${h.score}%</span>`;
      list.appendChild(li);
    });
  }

  $('clearHistoryBtn').addEventListener('click', async () => {
    try{ localStorage.removeItem('resume-analyzer-history'); }catch(e){}
    renderHistory([]);
  });

  (async () => {
    const history = (await storageGet('resume-analyzer-history')) || [];
    renderHistory(history);
  })();

  /* ---------- download report ---------- */
  $('downloadBtn').addEventListener('click', () => {
    if (!lastReport) return;
    const r = lastReport;
    const lines = [
      'RESUME SCAN REPORT',
      '===================',
      `Date: ${r.date.toLocaleString()}`,
      `Match Score: ${r.score}% (${verdictFor(r.score).label})`,
      `Readability: ${r.readability === null ? 'N/A' : readabilityLabel(r.readability) + ' (' + r.readability + ')'}`,
      `Resume Length: ${r.resumeWords} words`,
      '',
      'MATCHED KEYWORDS',
      r.matched.length ? r.matched.join(', ') : 'None',
      '',
      'MISSING KEYWORDS',
      r.missing.length ? r.missing.join(', ') : 'None',
      ''
    ].join('\n');
    const blob = new Blob([lines], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-scan-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  updateCounts();
})();
