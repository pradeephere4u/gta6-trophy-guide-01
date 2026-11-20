// Leonida Trophy Atlas — an offline tracker and guide for the 55 GTA VI trophies.
// All data lives in data/trophies.json; progress lives only in this browser's
// localStorage. No network requests are made beyond loading local files.
(function () {
  'use strict';

  var KEY = 'leonida-trophy-atlas-v1';
  var TOTAL = 55;

  var state = { earned: [], spoiler: true, kind: 'all', grade: 'all', query: '' };
  var doc = null;
  var expanded = {};

  var grid = document.getElementById('trophy-grid');
  var resultLine = document.getElementById('result-line');
  var emptyState = document.getElementById('empty-state');
  var listHeading = document.getElementById('list-heading');

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (Array.isArray(saved.earned)) state.earned = saved.earned.filter(function (id) { return typeof id === 'number' && id >= 1 && id <= TOTAL; });
      if (typeof saved.spoiler === 'boolean') state.spoiler = saved.spoiler;
    } catch (e) { /* corrupt save: start fresh */ }
  }

  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ app: 'leonida-trophy-atlas', version: 1, earned: state.earned, spoiler: state.spoiler }));
    } catch (e) { /* storage unavailable: progress still works in memory */ }
  }

  function isEarned(id) { return state.earned.indexOf(id) !== -1; }

  function setEarned(id, earned) {
    var i = state.earned.indexOf(id);
    if (earned && i === -1) state.earned.push(id);
    if (!earned && i !== -1) state.earned.splice(i, 1);
    saveState();
    renderProgress();
    renderGrid();
  }

  function gradeLabel(grade) {
    return grade.charAt(0).toUpperCase() + grade.slice(1);
  }

  function kindLabel(kind) {
    var map = { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };
    return map[kind] || kind;
  }

  function isHiddenFromViewer(t) {
    return state.spoiler && t.hidden && !isEarned(t.id);
  }

  function renderFacts() {
    var f = doc.facts;
    var facts = [
      ['Difficulty', f.difficulty],
      ['Time to Platinum', f.time],
      ['Playthroughs', f.playthroughs],
      ['Online trophies', f.online],
      ['Chapters', f.chapters],
      ['Cheats', f.cheats],
      ['Hidden trophies', f.hidden],
      ['Missable', 'Only 1 — Positive Mental Attitude']
    ];
    var el = document.getElementById('facts');
    el.innerHTML = '';
    facts.forEach(function (pair) {
      var d = document.createElement('div');
      d.className = 'fact';
      var k = document.createElement('span');
      k.className = 'fact-key';
      k.textContent = pair[0];
      var v = document.createElement('span');
      v.className = 'fact-value';
      v.textContent = pair[1];
      d.append(k, v);
      el.appendChild(d);
    });
  }

  function renderRoadmap() {
    var wrap = document.getElementById('stages');
    wrap.innerHTML = '';
    doc.roadmap.forEach(function (stage) {
      var card = document.createElement('article');
      card.className = 'stage';
      var head = document.createElement('div');
      head.className = 'stage-head';
      var num = document.createElement('span');
      num.className = 'stage-num';
      num.textContent = 'Stage ' + stage.stage;
      var title = document.createElement('h3');
      title.textContent = stage.title;
      var time = document.createElement('span');
      time.className = 'stage-time';
      time.textContent = stage.time;
      head.append(num, title, time);
      var summary = document.createElement('p');
      summary.textContent = stage.summary;
      var list = document.createElement('ul');
      stage.steps.forEach(function (step) {
        var li = document.createElement('li');
        li.textContent = step;
        list.appendChild(li);
      });
      card.append(head, summary, list);
      wrap.appendChild(card);
    });
  }

  function renderFilterCounts() {
    var counts = { all: doc.trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
    doc.trophies.forEach(function (t) {
      if (t.kind === 'story') counts.story++;
      if (t.kind === 'collectibles') counts.collectibles++;
      if (t.kind === 'activities') counts.activities++;
      if (t.missable) counts.missable++;
    });
    document.querySelectorAll('.fcount').forEach(function (el) {
      el.textContent = '(' + counts[el.getAttribute('data-count-for')] + ')';
    });
  }

  function renderProgress() {
    var earned = state.earned.length;
    var pct = Math.round((earned / TOTAL) * 100);
    document.getElementById('progress-count').textContent = earned + ' / ' + TOTAL + ' earned';
    document.getElementById('progress-pct').textContent = pct + '%';
    document.getElementById('progress-fill').style.width = pct + '%';
    var counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    doc.trophies.forEach(function (t) { if (isEarned(t.id)) counts[t.grade]++; });
    document.getElementById('grade-counts').textContent =
      'Platinum ' + counts.platinum + '/1 · Gold ' + counts.gold + '/2 · Silver ' + counts.silver + '/6 · Bronze ' + counts.bronze + '/46';
  }

  function trophyMatches(t) {
    if (state.kind === 'online') return false;
    if (state.kind === 'missable') { if (!t.missable) return false; }
    else if (state.kind !== 'all' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = [t.name, t.description, t.guide, t.kind, t.grade].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function makeCard(t) {
    var hidden = isHiddenFromViewer(t);
    var card = document.createElement('article');
    card.className = 'trophy-card grade-' + t.grade + (isEarned(t.id) ? ' earned' : '') + (expanded[t.id] ? ' open' : '');
    card.id = 'trophy-' + t.id;

    var top = document.createElement('div');
    top.className = 'card-top';

    var box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'earn-box';
    box.checked = isEarned(t.id);
    box.setAttribute('aria-label', 'Mark ' + (hidden ? 'hidden trophy ' + t.id : t.name) + ' as earned');
    box.addEventListener('change', function () { setEarned(t.id, box.checked); });

    var badge = document.createElement('span');
    badge.className = 'grade-badge';
    badge.textContent = gradeLabel(t.grade);

    var nameWrap = document.createElement('div');
    nameWrap.className = 'name-wrap';
    var name = document.createElement('h3');
    name.className = 'trophy-name';
    name.textContent = hidden ? 'Hidden trophy' : t.name;
    var desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = hidden ? 'This trophy stays hidden on PlayStation until you earn it.' : t.description;
    nameWrap.append(name, desc);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guide-toggle';
    toggle.textContent = expanded[t.id] ? 'Hide guide' : 'Show guide';
    toggle.setAttribute('aria-expanded', expanded[t.id] ? 'true' : 'false');
    toggle.addEventListener('click', function () {
      expanded[t.id] = !expanded[t.id];
      renderGrid();
    });

    top.append(box, badge, nameWrap, toggle);
    card.appendChild(top);

    var tags = document.createElement('div');
    tags.className = 'tags';
    var kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = kindLabel(t.kind);
    tags.appendChild(kindTag);
    if (t.hidden) {
      var hiddenTag = document.createElement('span');
      hiddenTag.className = 'tag tag-hidden';
      hiddenTag.textContent = 'Hidden';
      tags.appendChild(hiddenTag);
    }
    if (t.missable) {
      var missTag = document.createElement('span');
      missTag.className = 'tag tag-missable';
      missTag.textContent = 'Missable';
      tags.appendChild(missTag);
    }
    if (t.count) {
      var countTag = document.createElement('span');
      countTag.className = 'tag';
      countTag.textContent = '× ' + t.count.toLocaleString('en-US');
      tags.appendChild(countTag);
    }
    var stageTag = document.createElement('span');
    stageTag.className = 'tag tag-stage';
    stageTag.textContent = 'Stage ' + t.roadmapStage;
    tags.appendChild(stageTag);
    card.appendChild(tags);

    if (expanded[t.id]) {
      var guide = document.createElement('div');
      guide.className = 'guide';
      if (t.missable) {
        var warn = document.createElement('p');
        warn.className = 'missable-warning';
        warn.textContent = 'Missable — this is the one trophy in the game with a step that can be missed. Read the guide before you play Chapter 1.';
        guide.appendChild(warn);
      }
      var g = document.createElement('p');
      g.textContent = t.guide;
      guide.appendChild(g);
      var srcTitle = document.createElement('p');
      srcTitle.className = 'sources-title';
      srcTitle.textContent = 'Sources';
      var srcList = document.createElement('ul');
      srcList.className = 'sources';
      t.sourceKeys.forEach(function (key) {
        var s = doc.sources[key];
        if (!s) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = s.url;
        a.textContent = s.name;
        a.target = '_blank';
        a.rel = 'noopener';
        li.appendChild(a);
        srcList.appendChild(li);
      });
      guide.append(srcTitle, srcList);
      card.appendChild(guide);
    }

    return card;
  }

  function renderGrid() {
    grid.innerHTML = '';
    var shown = 0;
    doc.trophies.forEach(function (t) {
      if (!trophyMatches(t)) return;
      grid.appendChild(makeCard(t));
      shown++;
    });
    emptyState.hidden = shown !== 0;
    if (state.kind === 'online') {
      emptyState.textContent = 'Every GTA VI trophy is offline — there are no online trophies. Try “All”.';
    } else {
      emptyState.textContent = 'No trophies match this filter. Try “All”, or clear the search.';
    }
    var heading = 'All trophies';
    if (state.kind === 'missable') heading = 'Missable trophies';
    else if (state.kind !== 'all') heading = kindLabel(state.kind) + ' trophies';
    if (state.grade !== 'all') heading += ' — ' + gradeLabel(state.grade);
    listHeading.textContent = heading;
    resultLine.textContent = 'Showing ' + shown + ' of ' + TOTAL + ' trophies · ' + state.earned.length + ' earned';
  }

  function bindEvents() {
    var search = document.getElementById('search');
    search.addEventListener('input', function () {
      state.query = search.value.trim();
      renderGrid();
    });

    document.querySelectorAll('#filters button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.kind = btn.getAttribute('data-kind');
        document.querySelectorAll('#filters button').forEach(function (b) { b.classList.toggle('active', b === btn); });
        renderGrid();
      });
    });

    var gradeFilter = document.getElementById('grade-filter');
    gradeFilter.addEventListener('change', function () {
      state.grade = gradeFilter.value;
      renderGrid();
    });

    var spoiler = document.getElementById('spoiler-toggle');
    spoiler.checked = state.spoiler;
    spoiler.addEventListener('change', function () {
      state.spoiler = spoiler.checked;
      saveState();
      renderGrid();
    });

    document.getElementById('export-btn').addEventListener('click', function () {
      var payload = {
        app: 'leonida-trophy-atlas',
        version: 1,
        game: 'Grand Theft Auto VI',
        platform: 'PlayStation 5',
        exportedAt: new Date().toISOString(),
        earned: state.earned.slice().sort(function (a, b) { return a - b; })
      };
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      a.download = 'leonida-trophy-atlas-progress.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      resultLine.textContent = 'Progress exported (' + state.earned.length + ' trophies earned).';
    });

    var importFile = document.getElementById('import-file');
    document.getElementById('import-btn').addEventListener('click', function () { importFile.click(); });
    importFile.addEventListener('change', function () {
      var file = importFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          var ids = Array.isArray(parsed) ? parsed : parsed.earned;
          if (!Array.isArray(ids)) throw new Error('bad file');
          var valid = ids.filter(function (id) { return typeof id === 'number' && id >= 1 && id <= TOTAL; });
          state.earned = valid;
          saveState();
          renderProgress();
          renderGrid();
          resultLine.textContent = 'Progress imported: ' + valid.length + ' trophies earned.';
        } catch (e) {
          resultLine.textContent = 'That file could not be read as a Leonida Trophy Atlas progress file.';
        }
      };
      reader.readAsText(file);
      importFile.value = '';
    });

    document.getElementById('reset-btn').addEventListener('click', function () {
      if (!window.confirm('Reset all progress? This clears every earned tick.')) return;
      state.earned = [];
      saveState();
      renderProgress();
      renderGrid();
      resultLine.textContent = 'Progress reset.';
    });
  }

  function applyHash() {
    var hash = window.location.hash || '';
    var match = hash.match(/^#\/trophy\/(\d+)$/);
    if (match) {
      var id = parseInt(match[1], 10);
      var t = doc.trophies.find(function (x) { return x.id === id; });
      if (t) {
        expanded[id] = true;
        renderGrid();
        var el = document.getElementById('trophy-' + id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    if (hash === '#/spoiler-on') {
      state.spoiler = true;
      document.getElementById('spoiler-toggle').checked = true;
      saveState();
      renderGrid();
      return;
    }
    if (hash === '#/roadmap') {
      var roadmap = document.getElementById('roadmap');
      if (roadmap) roadmap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function init() {
    loadState();
    try {
      var res = await fetch('data/trophies.json');
      doc = await res.json();
    } catch (e) {
      resultLine.textContent = 'Could not load the trophy data. Open this page from a local server (for example, node serve.ts) rather than as a file.';
      return;
    }
    renderFacts();
    renderRoadmap();
    renderFilterCounts();
    renderProgress();
    renderGrid();
    bindEvents();
    applyHash();
    window.addEventListener('hashchange', applyHash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
