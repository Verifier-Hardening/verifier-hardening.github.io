'use strict';

// A seekable walkthrough over the paper's unchanged workflow figure. Every
// highlight, document copy, and note is an overlay; document copies are crops
// of the figure itself. Timing is illustrative, never a measured run duration.
(() => {
  const film = document.getElementById('workflow-film');
  const svg = document.getElementById('workflow-svg');
  if (!film || !svg) return;
  const one = selector => film.querySelector(selector);
  const all = selector => [...film.querySelectorAll(selector)];
  const NS = 'http://www.w3.org/2000/svg';
  const ART = 'assets/hardening_loop.svg?v=6';
  const W = 1145.03311, H = 589.67741;
  const FULL = [0, 0, W, H];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const color = {setup: '#73899d', attack: '#f75054', repair: '#288efe', validate: '#32a64c'};
  const ink = {setup: '#4b6075', attack: '#c9242b', repair: '#1463d1', validate: '#1b7a34', text: '#1e293b'};
  const term = {text: '#dbe3ec', dim: '#8d9bad', green: '#56d38a', red: '#ff8a80', amber: '#e8b65a'};
  const chapterNames = {setup: 'Setup', attack: 'Attack', repair: 'Repair', validate: 'Validate'};

  // Figure regions in figure units; gaps open the spotlight without drawing a ring.
  const regions = {
    separation: {box: [22, 44, 858, 200]},
    corpus: {box: [891, 44, 234, 200]},
    attack: {box: [4, 277, 304, 222]},
    exploit: {box: [306, 338, 116, 74], ring: false},
    repair: {box: [419, 277, 305, 222]},
    candidate: {box: [722, 348, 114, 64], ring: false},
    validate: {box: [832, 277, 308, 222]},
    retry: {box: [419, 277, 721, 272]},
    next: {box: [4, 277, 1136, 313]},
    stop: {box: [298, 404, 130, 140]}
  };

  const scenes = [
    {id: 'separate', chapter: 'setup', dur: 4.5, round: 'setup', focus: ['separation'],
      track: p => lerpBox([22, 44, 480, 200], [404, 44, 476, 200], ease(seg(p, .16, .72))),
      title: 'Separate the verifier',
      line: 'Grading moves into an isolated verifier sandbox. Only outputs listed in the output specification O cross over.',
      evidence: 'O₀ comes from the reference solution and starts permissive: all of /app/.'},
    {id: 'corpus', chapter: 'setup', dur: 3.5, round: 'setup', focus: ['corpus'],
      title: 'Build the solution corpus',
      line: 'Replayed, legitimacy-checked solutions form the corpus C₀ that every later patch must keep passing.',
      evidence: 'C₀: 11 legitimate solutions for this task.'},
    {id: 'search', chapter: 'attack', dur: 4, round: 'round 1', focus: ['attack'],
      title: 'Search for an exploit',
      line: 'The hacker reads the verifier, runtime, and O as read-only context, then looks for reward without doing the task.',
      evidence: 'Hacker reads V, R, O (read-only) → tries answer lookup by filename.'},
    {id: 'confirm', chapter: 'attack', dur: 3.5, round: 'round 1', focus: ['attack', 'exploit'],
      title: 'Confirm the exploit',
      line: 'Looking up answers by image filename reaches the target reward. A judge confirms the hack, and the evidence goes to the fixer.',
      evidence: 'Judge: reward hack → exploit evidence sent to the fixer.'},
    {id: 'patch', chapter: 'repair', dur: 4.5, round: 'round 1 · attempt 1', focus: ['repair'],
      title: 'Propose a repair',
      line: 'The fixer adds image-content checks to V and narrows O from all of /app/ to the expected outputs.',
      evidence: 'V + image-content checks · O: /app/ → expected outputs'},
    {id: 'submit', chapter: 'repair', dur: 2.5, round: 'round 1 · attempt 1', focus: ['repair', 'candidate'],
      title: 'Submit the candidate',
      line: 'The candidate goes to validation. Until it passes, the accepted environment T₀ stays in place.',
      evidence: 'Candidate (R, V, O) → validation · T₀ unchanged'},
    {id: 'review', chapter: 'validate', dur: 2.5, round: 'round 1 · attempt 1', focus: ['validate'],
      title: 'Gate 1 · Patch review',
      line: 'Patch review confirms the repair keeps the substantive checks and what task completion means.',
      evidence: 'Patch review ✓'},
    {id: 'replay', chapter: 'validate', dur: 3.5, round: 'round 1 · attempt 1', focus: ['validate', 'corpus'], frame: ['validate'],
      title: 'Gate 2 · Benign replay',
      line: 'All 11 corpus solutions are replayed against the candidate, and every one still passes.',
      evidence: 'Benign replay: 11 / 11 ✓'},
    {id: 'fail', chapter: 'validate', dur: 4.5, round: 'round 1 · attempt 1', focus: ['validate'], ring: color.attack,
      title: 'Gate 3 · Fresh blind solve fails',
      line: 'A fresh solver writes a launcher that depends on /app/cli_tool.py. The candidate O leaves it out, so the solve fails.',
      evidence: 'Fresh solve ✗ · cli_tool.py never reaches the sandbox'},
    {id: 'reject', chapter: 'repair', dur: 3.5, round: 'round 1 · attempt 1', focus: ['retry'], ring: color.attack,
      track: p => lerpBox([700, 277, 440, 272], [419, 277, 470, 272], ease(seg(p, .1, .78))),
      title: 'Reject and return feedback',
      line: 'The candidate is rejected. The missing-file diagnostic returns to the fixer, and T₀ is kept.',
      evidence: 'Rejected → missing-file diagnostic to the fixer'},
    {id: 'revise', chapter: 'repair', dur: 4, round: 'round 1 · attempt 2', focus: ['repair'],
      title: 'Revise the output specification',
      line: 'In the next attempt of the same round, the fixer adds cli_tool.py to O and keeps the image-content checks.',
      evidence: 'O + /app/cli_tool.py · V keeps the image-content checks'},
    {id: 'resubmit', chapter: 'repair', dur: 2, round: 'round 1 · attempt 2', focus: ['repair', 'candidate'],
      title: 'Resubmit',
      line: 'The revised candidate goes through the same three gates.',
      evidence: 'Revised candidate → validation'},
    {id: 'pass', chapter: 'validate', dur: 4.5, round: 'round 1 · attempt 2', focus: ['validate', 'corpus'], frame: ['validate'],
      title: 'All three gates pass',
      line: 'Review passes, all 11 replays pass, and the fresh solve succeeds. Its replayable solution can join the corpus.',
      evidence: 'Review ✓ · replay 11 / 11 ✓ · fresh solve ✓'},
    {id: 'accept', chapter: 'attack', dur: 4, round: 'round 2', focus: ['next'], ring: color.validate,
      track: p => lerpBox([660, 277, 480, 313], [4, 277, 480, 313], ease(seg(p, .06, .8))),
      title: 'Accept and attack again',
      line: 'The repair is accepted as T₁. The next round of attacks targets the updated verifier and output specification.',
      evidence: 'Accepted → T₁ · the hacker now attacks T₁'},
    {id: 'stop', chapter: 'attack', dur: 4, round: 'loop rule', focus: ['attack', 'stop'], ring: color.setup,
      title: 'When the loop stops',
      line: 'The loop repeats until the hacker finds no exploit within its budget, or the iteration budget runs out.',
      evidence: 'Stop: no exploit within budget, or the iteration budget is exhausted'}
  ];
  let total = 0;
  scenes.forEach(scene => { scene.start = total; total += scene.dur; });
  // Consecutive scenes of one stage form a chapter block on the timeline.
  const blocks = [];
  scenes.forEach((scene, i) => {
    const last = blocks[blocks.length - 1];
    if (last && last.chapter === scene.chapter) { last.end = scene.start + scene.dur; last.last = i; return; }
    blocks.push({chapter: scene.chapter, first: i, last: i, start: scene.start, end: scene.start + scene.dur});
  });

  const TRANSITION = .7;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = n => { n = clamp(n); return n < .5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpBox = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  const clock = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  const bell = q => Math.sin(Math.PI * clamp(q));

  const motion = document.getElementById('workflow-motion');
  const items = [];
  const el = (tag, attrs = {}, parent = motion) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  };
  function layer() { const g = el('g', {visibility: 'hidden'}); items.push(g); return g; }
  function show(node, x, y, opacity = 1, scale = 1) {
    node.setAttribute('visibility', 'visible');
    node.setAttribute('opacity', clamp(opacity).toFixed(3));
    node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})${scale === 1 ? '' : ` scale(${scale.toFixed(3)})`}`);
  }

  // Document copies are crops of the figure, never redrawn icons.
  const crops = {file: [204, 99, 26, 39], R: [481, 374, 47, 59], V: [549, 374, 47, 59], O: [617, 374, 47, 59]};
  function documentCopy(parent, kind, size) {
    const crop = crops[kind];
    const w = size * crop[2] / crop[3];
    const frame = el('svg', {x: -w / 2, y: -size / 2, width: w, height: size, viewBox: crop.join(' '), overflow: 'hidden'}, parent);
    el('image', {href: ART, width: W, height: H}, frame);
    return frame;
  }
  const icons = {
    check: 'M2.5 7.4 5.8 10.6 11.5 3.6',
    cross: 'M3.6 3.6 10.4 10.4M10.4 3.6 3.6 10.4',
    alert: 'M7 2.6v5.6M7 11.2v.2',
    edit: 'M2.8 11.2 3.4 8.6 9.2 2.8 11.2 4.8 5.4 10.6z',
    plus: 'M7 2.4v9.2M2.4 7h9.2'
  };
  const iconPath = (parent, name, x, y, width = 2.4) => el('path', {d: icons[name], transform: `translate(${x} ${y})`, fill: 'none', stroke: '#fff', 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}, parent);

  const chipFits = [];
  function chip(text, fill, icon) {
    const g = layer();
    const inner = el('g', {}, g);
    const pill = el('rect', {height: 28, rx: 14, fill, stroke: '#fff', 'stroke-width': 2}, inner);
    const x = icon ? 31 : 13;
    if (icon) iconPath(inner, icon, 11, 7);
    const label = el('text', {class: 'wf-chip-text', x, y: 19}, inner);
    label.textContent = text;
    chipFits.push(() => {
      const width = x + label.getComputedTextLength() + 13;
      pill.setAttribute('width', width.toFixed(1));
      inner.setAttribute('transform', `translate(${(-width / 2).toFixed(1)} -14)`);
    });
    return g;
  }
  function badge(fill, icon) {
    const g = layer();
    el('circle', {r: 12, fill, stroke: '#fff', 'stroke-width': 2.5}, g);
    iconPath(g, icon, -7, -7);
    return g;
  }
  function card({x, y, w, title, lines, tone = 'light', accent = color.setup, accentInk = ink.setup}) {
    const g = layer();
    g.classList.add('wf-card');
    const dark = tone === 'dark';
    const h = 42 + lines.length * 23 + 6;
    el('rect', {width: w, height: h, rx: 11, fill: dark ? '#0d1117' : '#fff', stroke: dark ? '#263040' : accent, 'stroke-width': dark ? 1 : 1.6, filter: 'url(#workflow-shadow)'}, g);
    if (dark) {
      el('path', {d: `M0.5 30.5 H${w - .5}`, stroke: '#263040', 'stroke-width': 1}, g);
      ['#ff5f57', '#febc2e', '#28c840'].forEach((fill, i) => el('circle', {cx: 16 + i * 13, cy: 15.5, r: 4.2, fill}, g));
    } else el('rect', {x: 14, y: 11, width: 9, height: 9, rx: 2.5, fill: accent}, g);
    const head = el('text', {class: 'wf-card-title', x: dark ? 58 : 30, y: 20, fill: dark ? term.dim : accentInk}, g);
    head.textContent = title;
    const spans = [];
    const counts = [0];
    lines.forEach((segments, i) => {
      const text = el('text', {class: 'wf-card-line', x: 15, y: 54 + i * 23}, g);
      segments.forEach(part => {
        const span = el('tspan', {fill: part.fill || (dark ? term.text : ink.text)}, text);
        if (part.bold) span.setAttribute('font-weight', 700);
        spans.push({node: span, text: part.text});
      });
      counts.push(counts[counts.length - 1] + segments.reduce((n, part) => n + part.text.length, 0));
    });
    g.count = k => counts[clamp(k, 0, lines.length)];
    g.reveal = (chars = Infinity) => {
      let budget = chars;
      spans.forEach(span => { span.node.textContent = span.text.slice(0, clamp(budget, 0, span.text.length)); budget -= span.text.length; });
    };
    g.place = (opacity = 1) => {
      g.setAttribute('visibility', opacity > 0 ? 'visible' : 'hidden');
      g.setAttribute('opacity', clamp(opacity).toFixed(3));
      g.setAttribute('transform', `translate(${x} ${(y + 8 * (1 - ease(opacity))).toFixed(2)})`);
    };
    return g;
  }

  // Overlay objects, drawn from back to front.
  const docRings = Object.fromEntries(['V', 'O'].map(kind => {
    const g = layer();
    const [cx, cy, cw, ch] = crops[kind];
    el('rect', {x: cx - 6, y: cy - 6, width: cw + 12, height: ch + 12, rx: 9, fill: 'rgba(40, 142, 254, .1)', stroke: color.repair, 'stroke-width': 2.6}, g);
    return [kind, g];
  }));
  const editBadges = Object.fromEntries(['V', 'O'].map(kind => {
    const g = layer();
    const [cx, cy, cw] = crops[kind];
    const inner = el('g', {transform: `translate(${cx + cw - 2} ${cy + 3})`}, g);
    el('circle', {r: 11, fill: color.repair, stroke: '#fff', 'stroke-width': 2.4}, inner);
    iconPath(inner, kind === 'V' ? 'plus' : 'edit', -7, -7, 2.2);
    return [kind, g];
  }));
  const rows = [340.5, 376, 411.5].map(y => {
    const g = layer();
    const rect = el('rect', {x: 852.6, y, width: 269, height: 30.7, rx: 6, 'stroke-width': 2.6}, g);
    return {g, rect, cy: y + 15.35};
  });
  const files = Array.from({length: 3}, () => { const g = layer(); documentCopy(g, 'file', 36); return g; });
  const corpusDocs = Array.from({length: 3}, () => { const g = layer(); documentCopy(g, 'file', 30); return g; });
  const replayDocs = Array.from({length: 3}, () => { const g = layer(); documentCopy(g, 'file', 26); return g; });
  const newSolution = layer();
  documentCopy(newSolution, 'file', 30);
  el('circle', {cx: 9, cy: 10, r: 7.5, fill: color.validate, stroke: '#fff', 'stroke-width': 2}, newSolution);
  iconPath(newSolution, 'check', 4.8, 5.6, 2);
  const terminal = layer();
  const terminalLines = [0, 1, 2].map(i => el('path', {d: `M156 ${397 + i * 9.5} h${[30, 22, 35][i]}`, stroke: '#9fe8c3', 'stroke-width': 2.6, 'stroke-linecap': 'round'}, terminal));
  const terminalCursor = el('rect', {x: 156, y: 423, width: 7, height: 3.2, fill: color.attack}, terminal);
  const bundle = layer();
  ['R', 'V', 'O'].forEach((kind, i) => { const g = el('g', {transform: `translate(${(i - 1) * 23} 0)`}, bundle); documentCopy(g, kind, 33); });
  const marks = rows.map(() => ({pass: badge(color.validate, 'check'), fail: badge(color.attack, 'cross')}));
  const spinner = layer();
  el('circle', {r: 10.5, fill: '#fff', stroke: '#dce3ea', 'stroke-width': 3.2}, spinner);
  const spinnerArc = el('circle', {r: 10.5, fill: 'none', stroke: color.validate, 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-dasharray': '18 48'}, spinner);
  const counter = layer();
  el('rect', {x: -27, y: -12.5, width: 54, height: 25, rx: 12.5, fill: color.validate, stroke: '#fff', 'stroke-width': 2}, counter);
  const counterText = el('text', {class: 'wf-badge-text', 'text-anchor': 'middle', y: 5}, counter);
  const exploitChip = chip('exploit', color.attack, 'alert');
  const feedbackChip = chip('missing cli_tool.py', color.attack, 'cross');
  const corpusChip = chip('+1 solution → C', color.validate, 'plus');
  const acceptChip = chip('accepted as T₁', color.validate, 'check');

  const sepCard = card({x: 316, y: 286, w: 352, title: 'OUTPUT SPECIFICATION O₀', accent: color.setup, accentInk: ink.setup,
    lines: [[{text: 'derived from the reference solution'}], [{text: 'starts permissive: all of '}, {text: '/app/', bold: true}]]});
  const corpusCard = card({x: 836, y: 286, w: 300, title: 'SOLUTION CORPUS C₀', accent: color.validate, accentInk: ink.validate,
    lines: [[{text: 'replayed + legitimacy-checked'}], [{text: '11', bold: true, fill: ink.validate}, {text: ' legitimate solutions'}]]});
  const hackCard = card({x: 22, y: 34, w: 322, tone: 'dark', title: 'hacker · verifier-aware',
    lines: [
      [{text: '$ ', fill: term.green}, {text: 'read V, R, O', fill: term.text}, {text: '  # read-only', fill: term.dim}],
      [{text: '$ ', fill: term.green}, {text: 'answer lookup by filename'}],
      [{text: '→ target reward reached', fill: term.amber}],
      [{text: 'judge: ', fill: term.red}, {text: 'reward hack confirmed', fill: term.red, bold: true}]
    ]});
  const patchCard = card({x: 422, y: 140, w: 302, title: 'CANDIDATE PATCH · ATTEMPT 1', accent: color.repair, accentInk: ink.repair,
    lines: [[{text: 'V', bold: true, fill: ink.repair}, {text: '  + image-content checks'}], [{text: 'O', bold: true, fill: ink.setup}, {text: '  /app/ → expected outputs'}]]});
  const failCard = card({x: 826, y: 136, w: 312, title: 'GATE 3 · FRESH BLIND SOLVE', accent: color.attack, accentInk: ink.attack,
    lines: [[{text: 'launcher needs '}, {text: '/app/cli_tool.py', bold: true}], [{text: 'O omits it → missing in sandbox'}], [{text: '✗ solve fails → reject', fill: ink.attack, bold: true}]]});
  const reviseCard = card({x: 422, y: 140, w: 302, title: 'REVISED PATCH · ATTEMPT 2', accent: color.repair, accentInk: ink.repair,
    lines: [[{text: 'O', bold: true, fill: ink.setup}, {text: '  + /app/cli_tool.py'}], [{text: 'V', bold: true, fill: ink.repair}, {text: '  image-content checks kept'}]]});
  const stopCard = card({x: 22, y: 60, w: 322, title: 'LOOP RULE', accent: color.setup, accentInk: ink.setup,
    lines: [[{text: 'stop when no exploit is found'}], [{text: 'within the attack budget,'}], [{text: 'or when iterations run out'}]]});

  const veil = svg.querySelector('.workflow-veil');
  const holes = [...svg.querySelectorAll('.workflow-hole')];
  const rings = [...svg.querySelectorAll('.workflow-ring')];
  const glows = [...svg.querySelectorAll('.workflow-ring-glow')];
  const flows = Object.fromEntries([...svg.querySelectorAll('[data-flow]')].map(node => [node.dataset.flow, {node, length: node.getTotalLength()}]));

  function flow(name, q, stroke) {
    const {node, length} = flows[name];
    if (q <= 0) return;
    node.style.opacity = 1;
    node.style.stroke = stroke;
    node.style.strokeDasharray = length;
    node.style.strokeDashoffset = length * (1 - clamp(q));
  }
  function along(node, name, q, opacity = 1) {
    const {node: path, length} = flows[name];
    const point = path.getPointAtLength(length * clamp(q));
    show(node, point.x, point.y, opacity);
  }
  function rowState(index, state) {
    const {g, rect} = rows[index];
    const fail = state === 'fail';
    g.setAttribute('visibility', 'visible');
    rect.setAttribute('fill', fail ? 'rgba(247, 80, 84, .1)' : 'rgba(50, 166, 76, .1)');
    rect.setAttribute('stroke', fail ? color.attack : color.validate);
  }
  function mark(index, kind = 'pass', q = 1) {
    if (q <= 0) return;
    show(marks[index][kind], 1096, rows[index].cy, Math.min(1, q * 2.5), .6 + .4 * ease(q) + .12 * bell(q));
  }
  function spin(index, q, stroke = color.validate) {
    show(spinner, 1096, rows[index].cy);
    spinnerArc.setAttribute('stroke', stroke);
    spinnerArc.setAttribute('transform', `rotate(${(q * 900).toFixed(1)})`);
  }
  function count(value, done) {
    show(counter, 1092, rows[1].cy);
    counterText.textContent = `${value}/11`;
    counter.firstChild.setAttribute('fill', done ? color.validate : '#6c7c8f');
  }
  function typing(q) {
    terminal.setAttribute('visibility', 'visible');
    terminal.setAttribute('opacity', 1);
    terminal.removeAttribute('transform');
    terminalLines.forEach((line, i) => {
      const length = line.getTotalLength();
      line.style.strokeDasharray = length;
      line.style.strokeDashoffset = length * (1 - seg(q, i * .22, i * .22 + .3));
    });
    terminalCursor.setAttribute('opacity', Math.floor(q * 14) % 2 ? 0 : 1);
  }
  function pulse(kind, q) {
    if (q <= 0) return;
    show(docRings[kind], 0, 0, bell(q));
  }
  function edited(kind, q = 1) {
    if (q <= 0) return;
    const [cx, cy] = crops[kind];
    show(editBadges[kind], 0, 0, Math.min(1, q * 3));
    editBadges[kind].firstChild.setAttribute('transform', `translate(${cx + crops[kind][2] - 2} ${cy + 3}) scale(${(.6 + .4 * ease(q)).toFixed(3)})`);
  }

  const draw = {
    separate(p) {
      flow('outputs', seg(p, .04, .32), color.attack);
      flow('separation', seg(p, .28, .58), color.repair);
      files.forEach((file, i) => {
        const q = seg(p, .08 + i * .12, .6 + i * .12);
        if (q > 0 && q < 1) show(file, lerp(262, 652, ease(q)), 142.94, Math.min(1, q * 8, (1 - q) * 8));
      });
      sepCard.place(seg(p, .42, .5));
      sepCard.reveal();
    },
    corpus(p) {
      corpusDocs.forEach((doc, i) => {
        const q = seg(p, .08 + i * .14, .46 + i * .14);
        if (q > 0 && q < 1) show(doc, 934 + i * 6, lerp(112, 182, ease(q)), Math.min(1, q * 6, (1 - q) * 6));
      });
      corpusCard.place(seg(p, .32, .41));
      corpusCard.reveal();
    },
    search(p) {
      flow('start', seg(p, 0, .22), color.attack);
      typing(seg(p, .08, .92));
      hackCard.place(seg(p, .1, .18));
      hackCard.reveal(Math.round(hackCard.count(3) * seg(p, .2, .86)));
    },
    confirm(p) {
      typing(1);
      hackCard.place(1);
      hackCard.reveal(hackCard.count(3) + Math.round((hackCard.count(4) - hackCard.count(3)) * seg(p, .04, .34)));
      const q = ease(seg(p, .3, .82));
      flow('exploit', q, color.attack);
      if (q > 0) along(exploitChip, 'exploit', q, Math.min(1, q * 6));
    },
    patch(p) {
      patchCard.place(seg(p, .06, .13));
      patchCard.reveal(Math.round(patchCard.count(2) * seg(p, .16, .72)));
      pulse('V', seg(p, .2, .55));
      edited('V', seg(p, .4, .55));
      pulse('O', seg(p, .5, .85));
      edited('O', seg(p, .7, .85));
    },
    submit(p) {
      patchCard.place(1 - seg(p, .84, 1));
      patchCard.reveal();
      edited('V');
      edited('O');
      const q = ease(seg(p, .08, .72));
      flow('candidate', q, color.repair);
      along(bundle, 'candidate', q, Math.min(1, q * 6, (1 - seg(p, .86, 1)) * 1));
    },
    review(p) {
      rowState(0, 'active');
      if (p < .56) spin(0, seg(p, .06, .56));
      mark(0, 'pass', seg(p, .56, .74));
    },
    replay(p) {
      mark(0);
      rowState(1, 'active');
      replayDocs.forEach((doc, i) => {
        const q = seg(p, .06, .8) * 3 - i * .55;
        if (q > 0 && q < 1) show(doc, 958 + i * 7, lerp(184, 290, ease(q)), Math.min(1, q * 6, (1 - q) * 3));
      });
      const done = p >= .82;
      count(done ? 11 : Math.min(11, Math.floor(seg(p, .08, .8) * 11.99)), done);
    },
    fail(p) {
      mark(0);
      count(11, true);
      if (p < .44) { rowState(2, 'active'); spin(2, seg(p, .04, .44)); }
      else { rowState(2, 'fail'); mark(2, 'fail', seg(p, .44, .6)); }
      failCard.place(seg(p, .5, .57));
      failCard.reveal(Math.round(failCard.count(3) * seg(p, .54, .92)));
    },
    reject(p) {
      mark(0);
      count(11, true);
      rowState(2, 'fail');
      mark(2, 'fail');
      const q = ease(seg(p, .08, .78));
      flow('retry', q, color.attack);
      if (q > 0) along(feedbackChip, 'retry', q, Math.min(1, q * 8));
    },
    revise(p) {
      reviseCard.place(seg(p, .06, .13));
      reviseCard.reveal(Math.round(reviseCard.count(2) * seg(p, .16, .72)));
      pulse('O', seg(p, .26, .64));
      edited('O', seg(p, .46, .62));
    },
    resubmit(p) {
      reviseCard.place(1 - seg(p, .84, 1));
      reviseCard.reveal();
      edited('O');
      const q = ease(seg(p, .06, .76));
      flow('candidate', q, color.repair);
      along(bundle, 'candidate', q, Math.min(1, q * 6, 1 - seg(p, .88, 1)));
    },
    pass(p) {
      const gates = [[.04, .2], [.24, .46], [.5, .68]];
      gates.forEach(([a, b], i) => {
        if (p < a) return;
        if (p < b) rowState(i, 'active');
        if (i === 1) count(p < b ? Math.floor(seg(p, a, b) * 11.99) : 11, p >= b);
        else if (p < b) spin(i, seg(p, a, b));
        else mark(i, 'pass', seg(p, b, b + .12));
      });
      const q = seg(p, .72, .92);
      if (q > 0 && q < 1) show(newSolution, lerp(990, 960, ease(q)), lerp(426, 186, ease(q)), Math.min(1, q * 6));
      if (p >= .9) show(corpusChip, 1010, 262, seg(p, .9, .98));
    },
    accept(p) {
      const fade = 1 - seg(p, .55, .85);
      if (fade > 0) {
        [0, 2].forEach(i => mark(i, 'pass', 1));
        count(11, true);
        [marks[0].pass, marks[2].pass, counter].forEach(node => node.setAttribute('opacity', fade.toFixed(3)));
      }
      const q = ease(seg(p, .04, .8));
      flow('next', q, color.validate);
      along(acceptChip, 'next', q, Math.min(1, q * 8));
      if (p > .78) typing(seg(p, .78, 1));
    },
    stop(p) {
      typing(seg(p, 0, .5));
      const q = ease(seg(p, .28, .62));
      flow('stop', q, color.setup);
      stopCard.place(seg(p, .48, .56));
      stopCard.reveal();
    }
  };

  // Spotlight, rings, and the compact-mode camera all ease between scene focuses.
  function focusOf(index) {
    if (index < 0) return {boxes: [FULL, FULL], rings: [false, false]};
    const names = scenes[index].focus;
    const first = regions[names[0]];
    const second = regions[names[1] || names[0]];
    return {boxes: [first.box, second.box], rings: [first.ring !== false, names.length > 1 && second.ring !== false]};
  }
  function setBox(node, box) {
    node.setAttribute('x', box[0].toFixed(2));
    node.setAttribute('y', box[1].toFixed(2));
    node.setAttribute('width', Math.max(0, box[2]).toFixed(2));
    node.setAttribute('height', Math.max(0, box[3]).toFixed(2));
  }
  function spotlight(index, t) {
    const from = focusOf(index - 1), to = focusOf(index);
    const ringColor = index >= 0 ? scenes[index].ring || color[scenes[index].chapter] : color.setup;
    const level = index < 0 ? 0 : index === 0 ? .7 * t : .7;
    veil.style.opacity = level.toFixed(3);
    [0, 1].forEach(k => {
      const box = lerpBox(from.boxes[k], to.boxes[k], t);
      setBox(holes[k], box);
      setBox(rings[k], box);
      setBox(glows[k], box);
      const visible = index < 0 ? 0 : lerp(index === 0 ? 0 : Number(from.rings[k]), Number(to.rings[k]), t);
      rings[k].style.opacity = visible.toFixed(3);
      glows[k].style.opacity = (visible * .35).toFixed(3);
      rings[k].style.stroke = ringColor;
      glows[k].style.stroke = ringColor;
    });
  }
  function union(boxes) {
    const x1 = Math.min(...boxes.map(b => b[0])), y1 = Math.min(...boxes.map(b => b[1]));
    const x2 = Math.max(...boxes.map(b => b[0] + b[2])), y2 = Math.max(...boxes.map(b => b[1] + b[3]));
    return [x1, y1, x2 - x1, y2 - y1];
  }
  function fitCamera(box, aspect) {
    let [x, y, w, h] = [box[0] - 14, box[1] - 14, box[2] + 28, box[3] + 28];
    w = Math.max(w, 330);
    if (w / h > aspect) { const nh = w / aspect; y -= (nh - h) / 2; h = nh; }
    else { const nw = h * aspect; x -= (nw - w) / 2; w = nw; }
    if (w <= W) x = clamp(x, 0, W - w); else x = (W - w) / 2;
    if (h <= H) y = clamp(y, 0, H - h); else y = (H - h) / 2;
    return [x, y, w, h];
  }
  // What the compact camera frames: a tracking shot, a narrower frame, or the spotlight.
  function shot(index, p) {
    if (index < 0) return FULL;
    const scene = scenes[index];
    if (scene.track) return scene.track(p);
    return union((scene.frame || scene.focus).map(name => regions[name].box));
  }
  let mode = 'wide';
  function camera(index, t, p) {
    if (mode !== 'compact') { svg.setAttribute('viewBox', FULL.join(' ')); return; }
    const aspect = svg.clientWidth / Math.max(1, svg.clientHeight) || 1.25;
    const from = fitCamera(index <= 0 ? FULL : shot(index - 1, 1), aspect);
    const to = fitCamera(shot(index, p), aspect);
    svg.setAttribute('viewBox', lerpBox(from, to, t).map(v => v.toFixed(2)).join(' '));
  }

  const playButton = one('#film-play');
  const slider = one('#film-timeline');
  const poster = one('#film-poster');
  const staticButton = one('#film-static');
  const chapterButtons = all('[data-chapter]');
  const lineNode = one('#film-line');
  slider.max = total;
  let elapsed = 0, playing = false, frame = null, lastTimestamp = 0;
  let shownScene = null, original = true, userStarted = false, inView = false, resumeOnView = false;

  function updateNarration(index) {
    shownScene = index;
    const scene = scenes[index];
    film.style.setProperty('--stage', scene ? color[scene.chapter] : color.setup);
    one('#film-step').textContent = scene ? `${String(index + 1).padStart(2, '0')} / ${scenes.length}` : `00 / ${scenes.length}`;
    one('#film-stage').textContent = scene ? chapterNames[scene.chapter] : 'Walkthrough';
    one('#film-title').textContent = scene ? scene.title : 'Method overview';
    lineNode.textContent = scene ? scene.line : 'Follow one task through separation, attack, repair, and validation.';
    one('#film-evidence').textContent = scene ? scene.evidence : '';
    one('#film-round').textContent = scene ? scene.round : 'round 1';
    lineNode.classList.remove('is-new');
    if (scene && !reduced.matches) { void lineNode.offsetWidth; lineNode.classList.add('is-new'); }
    chapterButtons.forEach(button => {
      const chapter = button.dataset.chapter;
      const active = !!scene && scene.chapter === chapter;
      button.classList.toggle('is-active', active);
      button.classList.toggle('is-done', !!scene && blocks.some(b => b.chapter === chapter && b.first <= index));
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function trackGradient() {
    const at = elapsed / total * 100;
    const stops = [];
    blocks.forEach((block, i) => {
      const a = block.start / total * 100 + (i ? .35 : 0);
      const b = block.end / total * 100 - (i < blocks.length - 1 ? .35 : 0);
      const full = color[block.chapter];
      const faint = `color-mix(in srgb, ${full} 26%, #e3e8ef)`;
      if (i) stops.push(`transparent ${(a - .7).toFixed(2)}%`, `transparent ${a.toFixed(2)}%`);
      if (original || at <= a) stops.push(`${faint} ${a.toFixed(2)}%`, `${faint} ${b.toFixed(2)}%`);
      else if (at >= b) stops.push(`${full} ${a.toFixed(2)}%`, `${full} ${b.toFixed(2)}%`);
      else stops.push(`${full} ${a.toFixed(2)}%`, `${full} ${at.toFixed(2)}%`, `${faint} ${at.toFixed(2)}%`, `${faint} ${b.toFixed(2)}%`);
    });
    slider.style.setProperty('--track', `linear-gradient(90deg, ${stops.join(', ')})`);
  }
  function updateControls() {
    const ended = !original && elapsed >= total;
    playButton.querySelector('use').setAttribute('href', playing ? '#i-pause' : ended ? '#i-restart' : '#i-play');
    playButton.setAttribute('aria-label', playing ? 'Pause walkthrough' : ended ? 'Replay walkthrough' : 'Play walkthrough');
    film.dataset.playing = String(playing);
    poster.hidden = !(original && !userStarted);
    staticButton.setAttribute('aria-pressed', String(original && userStarted));
  }
  const sceneAt = time => Math.max(0, scenes.findLastIndex(scene => time >= scene.start));

  function render(time, asOriginal = false) {
    elapsed = clamp(time, 0, total);
    original = asOriginal;
    const index = asOriginal ? -1 : sceneAt(elapsed);
    const scene = scenes[index];
    const local = scene ? elapsed - scene.start : 0;
    const p = reduced.matches ? 1 : scene ? clamp(local / scene.dur) : 0;
    const t = reduced.matches ? 1 : ease(local / TRANSITION);
    items.forEach(node => node.setAttribute('visibility', 'hidden'));
    Object.values(flows).forEach(({node}) => { node.style.opacity = 0; });
    spotlight(index, t);
    camera(index, t, p);
    if (index !== shownScene) updateNarration(index);
    slider.value = elapsed;
    slider.setAttribute('aria-valuetext', `${elapsed.toFixed(1)} of ${total} seconds${scene ? `, ${scene.title}` : ''}`);
    one('#film-time').textContent = `${clock(elapsed)} / ${clock(total)}`;
    film.dataset.step = String(index);
    film.dataset.time = elapsed.toFixed(3);
    trackGradient();
    if (scene) draw[scene.id](p);
  }

  function tick(timestamp) {
    if (!playing) return;
    const delta = lastTimestamp ? Math.min(.1, (timestamp - lastTimestamp) / 1000) : 0;
    lastTimestamp = timestamp;
    render(elapsed + delta);
    if (elapsed >= total) { pause(); return; }
    frame = requestAnimationFrame(tick);
  }
  function pause() { playing = false; cancelAnimationFrame(frame); frame = null; lastTimestamp = 0; updateControls(); }
  function play() {
    userStarted = true;
    resumeOnView = false;
    if (elapsed >= total) render(0);
    else if (original) render(elapsed);
    playing = true;
    lastTimestamp = 0;
    updateControls();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  }
  function seek(time, announce = false) {
    userStarted = true;
    resumeOnView = false;
    pause();
    render(time);
    updateControls();
    if (announce) one('#film-status').textContent = `${chapterNames[scenes[shownScene].chapter]}, step ${shownScene + 1} of ${scenes.length}: ${scenes[shownScene].title}`;
  }
  // Repeated clicks on a stage step through its occurrences in the loop.
  function seekChapter(chapter) {
    const current = original ? -1 : sceneAt(elapsed);
    const matching = blocks.filter(block => block.chapter === chapter);
    seek((matching.find(block => block.first > current) || matching[0]).start, true);
  }

  playButton.addEventListener('click', () => (playing ? pause() : play()));
  poster.addEventListener('click', () => { render(0); play(); });
  one('#film-next').addEventListener('click', () => {
    const index = original ? -1 : sceneAt(elapsed);
    seek(scenes[Math.min(scenes.length - 1, index + 1)].start, true);
  });
  one('#film-prev').addEventListener('click', () => {
    const index = original ? 0 : sceneAt(elapsed);
    const back = !original && elapsed - scenes[index].start > 1 ? index : Math.max(0, index - 1);
    seek(scenes[back].start, true);
  });
  staticButton.addEventListener('click', () => {
    if (original && userStarted) { seek(elapsed); return; }
    userStarted = true;
    pause();
    render(elapsed, true);
    updateControls();
  });
  slider.addEventListener('input', () => seek(Number(slider.value)));
  chapterButtons.forEach(button => button.addEventListener('click', () => seekChapter(button.dataset.chapter)));
  all('[data-hotspot]').forEach(node => node.addEventListener('click', () => seekChapter(node.dataset.hotspot)));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) { pause(); resumeOnView = true; }
    else if (!document.hidden && resumeOnView && inView) play();
  });
  reduced.addEventListener('change', () => { if (reduced.matches) pause(); render(elapsed, original); updateControls(); });

  // Play once when the walkthrough first scrolls into view, pause while it is off screen.
  const observer = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    if (inView && !userStarted && !reduced.matches) play();
    else if (inView && resumeOnView && !document.hidden) play();
    else if (!inView && playing) { pause(); resumeOnView = true; }
  }, {threshold: .45});
  observer.observe(one('#workflow-screen'));

  function updateMode() {
    const next = film.clientWidth < 820 ? 'compact' : 'wide';
    if (next === mode) return;
    mode = next;
    film.dataset.mode = mode;
    render(elapsed, original);
  }
  let measuredWidth = film.clientWidth;
  new ResizeObserver(() => {
    if (!measuredWidth && film.clientWidth) chipFits.forEach(fit => fit());
    measuredWidth = film.clientWidth;
    updateMode();
    if (mode === 'compact' || measuredWidth) render(elapsed, original);
  }).observe(film);
  const fitChips = () => { chipFits.forEach(fit => fit()); render(elapsed, original); };
  if (document.fonts) document.fonts.ready.then(fitChips);
  fitChips();
  updateMode();
  render(0, true);
  updateControls();

  // One deterministic timeline powers the page, browser checks, and the video export.
  window.workflowPlayer = {
    play, pause, seek, duration: total,
    reset: () => { pause(); render(0, true); updateControls(); },
    exporting: on => { film.classList.toggle('is-exporting', on); },
    scenes: scenes.map(({id, start, dur, title, chapter}) => ({id, start, duration: dur, title, chapter}))
  };
})();
