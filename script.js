/* =====================================================================
   CVForge – script.js  (vanilla JS, no build step, no eval)
   1 Config · 2 Utilities · 3 State · 4 Notifications · 5 Undo/Redo
   6 LocalStorage · 7 Photo · 8 Editor/forms · 9 CV rendering
   10 Templates & design · 11 PDF & print · 12 Import/export
   13 Actions & events · 14 Init
   ===================================================================== */
(() => {
'use strict';

/* ---------- 1. CONFIG ---------- */
const STORAGE_KEY = 'cvforge.v1.cv';
const PAGE_W = 794, PAGE_H = 1122, PAD_V = 44, BAND_GAP = 26;   // A4 at 96 dpi
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const LANG_LEVELS = ['Basic', 'Intermediate', 'Advanced', 'Fluent', 'Native'];

const FONTS = {
  'Arial': "Arial, Helvetica, sans-serif",
  'Calibri': "Calibri, Carlito, 'Segoe UI', Arial, sans-serif",
  'Inter': "Inter, 'Segoe UI', Arial, sans-serif",
  'Roboto': "Roboto, 'Segoe UI', Arial, sans-serif",
  'Georgia': "Georgia, 'Times New Roman', serif",
  'Times New Roman': "'Times New Roman', Times, serif"
};

const TEMPLATES = {
  modern:       { name: 'Modern',       layout: 'sidebar', side: ['skills', 'languages', 'interests'], skills: 'bars',  tint: '#1f3a5f', note: 'Colored sidebar with photo and skill bars.' },
  classic:      { name: 'Classic',      layout: 'single',  photo: 'top',   skills: 'text',  tint: '#222222', note: 'Centered serif header and traditional rules.' },
  minimal:      { name: 'Minimal',      layout: 'single',  photo: 'left',  skills: 'text',  tint: '#8a93a3', note: 'Light, airy and quiet. Lets the content lead.' },
  professional: { name: 'Professional', layout: 'single',  photo: 'right', skills: 'grid',  tint: '#1f3a5f', note: 'Clear header rule with a two-column skill grid.' },
  creative:     { name: 'Creative',     layout: 'sidebar', side: ['skills', 'languages', 'interests'], skills: 'chips', tint: '#0f5257', note: 'Tinted sidebar with an accent edge.' },
  student:      { name: 'Student',      layout: 'single',  photo: 'left',  skills: 'chips', tint: '#364a7a', note: 'Highlighted headings, ideal for first CVs.' },
  corporate:    { name: 'Corporate',    layout: 'band',    photo: 'right', skills: 'grid',  tint: '#2b2f36', note: 'Full-width header band, formal and structured.' },
  ats:          { name: 'ATS-Friendly', layout: 'single',  skills: 'text', tint: '#000000', note: 'Plain single column with standard headings.' }
};
const TPL_KEYS = ['modern', 'classic', 'minimal', 'professional', 'creative', 'student', 'corporate'];

const PRESETS = [
  { n: 'Navy',     p: '#1f3a5f', a: '#c2410c', t: '#1e2530' },
  { n: 'Graphite', p: '#2b2f36', a: '#6b7280', t: '#1f2328' },
  { n: 'Forest',   p: '#1d4b3a', a: '#a16207', t: '#1e2a25' },
  { n: 'Burgundy', p: '#6b1f2a', a: '#b45309', t: '#2a1f22' },
  { n: 'Teal',     p: '#0f5257', a: '#b45309', t: '#10262a' },
  { n: 'Indigo',   p: '#364a7a', a: '#c2410c', t: '#1e2530' }
];

const PERSONAL_FIELDS = [
  { k: 'fullName',    l: 'Full name',          ph: 'e.g. Alex Morgan', ac: 'name' },
  { k: 'title',       l: 'Professional title', ph: 'e.g. Web Developer', ac: 'organization-title' },
  { k: 'email',       l: 'Email',              type: 'email', ac: 'email' },
  { k: 'phone',       l: 'Phone number',       type: 'tel', ac: 'tel' },
  { k: 'address',     l: 'Address',            ac: 'street-address' },
  { k: 'dob',         l: 'Date of birth',      type: 'date' },
  { k: 'nationality', l: 'Nationality' },
  { k: 'gender',      l: 'Gender',             type: 'select', opts: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
  { k: 'website',     l: 'Website',            im: 'url', ph: 'yoursite.com' },
  { k: 'linkedin',    l: 'LinkedIn',           im: 'url', ph: 'linkedin.com/in/username' },
  { k: 'github',      l: 'GitHub',             im: 'url', ph: 'github.com/username' }
];

const SECTIONS = {
  personal:       { icon: '👤', title: 'Personal Information' },
  summary:        { icon: '📝', title: 'Professional Summary' },
  education:      { icon: '🎓', title: 'Education' },
  experience:     { icon: '💼', title: 'Work Experience' },
  skills:         { icon: '🛠️', title: 'Skills' },
  projects:       { icon: '🚀', title: 'Projects' },
  certifications: { icon: '🏅', title: 'Certifications' },
  languages:      { icon: '🌐', title: 'Languages' },
  interests:      { icon: '🎯', title: 'Interests & Hobbies' },
  references:     { icon: '🤝', title: 'References' }
};
const DEFAULT_ORDER = Object.keys(SECTIONS);

const range = (a, b, cur) => [a, cur ? 'Present' : b].filter(x => x && String(x).trim()).join(' – ');

/* Data schema for every list-type section. Drives the editor, validation and defaults. */
const SCHEMA = {
  education: {
    add: 'Add Education', added: 'Education added.', removed: 'Education removed.', plural: 'education entries',
    fields: [
      { k: 'degree', l: 'Degree / Qualification', span: 2, ph: 'e.g. BSc Computer Science' },
      { k: 'institution', l: 'Institution' }, { k: 'location', l: 'Location' },
      { k: 'start', l: 'Start year', ph: '2018' }, { k: 'end', l: 'End year', ph: '2022 or Expected 2026' },
      { k: 'grade', l: 'Grade / GPA', span: 2 },
      { k: 'desc', l: 'Description', t: 'textarea', span: 2 }
    ],
    title: i => i.degree || i.institution || 'New education',
    sub: i => [i.degree ? i.institution : '', range(i.start, i.end)].filter(Boolean).join(' · ')
  },
  experience: {
    add: 'Add Experience', added: 'Experience added.', removed: 'Experience removed.', plural: 'work experiences',
    fields: [
      { k: 'title', l: 'Job title', span: 2 }, { k: 'company', l: 'Company' }, { k: 'location', l: 'Location' },
      { k: 'start', l: 'Start date', ph: 'Jan 2021' }, { k: 'end', l: 'End date', ph: 'Dec 2023' },
      { k: 'current', l: 'I currently work here', t: 'checkbox', span: 2 },
      { k: 'duties', l: 'Responsibilities (one per line)', t: 'textarea', span: 2, rows: 4 },
      { k: 'achievements', l: 'Achievements (one per line)', t: 'textarea', span: 2, rows: 3 }
    ],
    title: i => i.title || i.company || 'New experience',
    sub: i => [i.title ? i.company : '', range(i.start, i.end, i.current)].filter(Boolean).join(' · ')
  },
  skills: {
    add: 'Add Skill', added: 'Skill added.', removed: 'Skill removed.', plural: 'skills', inline: true,
    defaults: { level: 'Intermediate' },
    fields: [{ k: 'name', l: 'Skill name', ph: 'e.g. Python' }, { k: 'level', l: 'Skill level', t: 'select', opts: LEVELS }]
  },
  projects: {
    add: 'Add Project', added: 'Project added.', removed: 'Project removed.', plural: 'projects',
    fields: [
      { k: 'name', l: 'Project name', span: 2 },
      { k: 'desc', l: 'Description', t: 'textarea', span: 2 },
      { k: 'tech', l: 'Technologies', span: 2, ph: 'e.g. React, Node.js' },
      { k: 'url', l: 'Project URL' }, { k: 'github', l: 'GitHub URL' }
    ],
    title: i => i.name || 'New project', sub: i => i.tech
  },
  certifications: {
    add: 'Add Certification', added: 'Certification added.', removed: 'Certification removed.', plural: 'certifications',
    fields: [
      { k: 'name', l: 'Certificate name', span: 2 }, { k: 'org', l: 'Organization' }, { k: 'date', l: 'Issue date', ph: 'Mar 2024' },
      { k: 'credId', l: 'Credential ID' }, { k: 'url', l: 'Credential URL' }
    ],
    title: i => i.name || 'New certification', sub: i => [i.org, i.date].filter(Boolean).join(' · ')
  },
  languages: {
    add: 'Add Language', added: 'Language added.', removed: 'Language removed.', plural: 'languages', inline: true,
    defaults: { speaking: 'Fluent', reading: 'Fluent', writing: 'Fluent' },
    fields: [
      { k: 'name', l: 'Language', ph: 'e.g. English' },
      { k: 'speaking', l: 'Speaking', t: 'select', opts: LANG_LEVELS, vis: true },
      { k: 'reading', l: 'Reading', t: 'select', opts: LANG_LEVELS, vis: true },
      { k: 'writing', l: 'Writing', t: 'select', opts: LANG_LEVELS, vis: true }
    ]
  },
  interests: { add: 'Add Interest', added: 'Interest added.', removed: 'Interest removed.', plural: 'interests', fields: [{ k: 'name', l: 'Interest' }] },
  references: {
    add: 'Add Reference', added: 'Reference added.', removed: 'Reference removed.', plural: 'references',
    fields: [
      { k: 'name', l: 'Name', span: 2 }, { k: 'position', l: 'Position' }, { k: 'org', l: 'Organization' },
      { k: 'email', l: 'Email' }, { k: 'phone', l: 'Phone' }
    ],
    title: i => i.name || 'New reference', sub: i => [i.position, i.org].filter(Boolean).join(' · ')
  },
  custom: {
    add: 'Add Custom Section', added: 'Custom section added.', removed: 'Custom section removed.',
    fields: [{ k: 'title', l: 'Section title' }, { k: 'content', l: 'Section content', t: 'textarea' }]
  }
};
const LIST_KEYS = Object.keys(SCHEMA);
const CUSTOM_IDEAS = ['Achievements', 'Volunteer Experience', 'Awards', 'Publications', 'Training', 'Extracurricular Activities'];

const SUMMARIES = {
  'Software Developer': ['Software developer with hands-on experience building responsive, well-tested web applications. Comfortable across the stack, clear in communication, and good at turning vague requirements into simple, reliable features.', 'Motivated developer who writes clean, maintainable code and picks up new tools quickly. Looking for a team where I can ship useful products and keep growing.'],
  'Designer': ['Creative designer who pairs strong visual thinking with a clear understanding of user needs. Experienced in taking ideas from rough sketches to polished, consistent interfaces and brand assets.', 'Detail-oriented designer with a sharp eye for typography, layout and usability, who works closely with developers and stakeholders to deliver on time.'],
  'Marketing Specialist': ['Results-driven marketing specialist with experience planning campaigns, creating engaging content and tracking performance. Skilled at turning audience insights into measurable growth.', 'Creative and analytical marketer who builds consistent brand messaging across digital channels and enjoys testing what works.'],
  'Accountant': ['Meticulous accountant experienced in bookkeeping, reconciliations and financial reporting. Known for accuracy, meeting deadlines and keeping records audit-ready.', 'Reliable finance professional with a solid grounding in accounting standards, who explains numbers clearly to non-financial colleagues.'],
  'Teacher': ['Dedicated teacher who builds a supportive, structured classroom where every student can participate. Skilled at planning engaging lessons and tracking progress with care.', 'Patient and creative educator who adapts teaching methods to different learners and communicates openly with parents and colleagues.'],
  'Nurse': ['Compassionate nurse with experience delivering safe, patient-centred care in busy clinical settings. Calm under pressure, thorough in documentation and a dependable team member.', 'Registered nurse committed to clear communication, patient dignity and evidence-based practice.'],
  'Sales Representative': ['Motivated sales professional with a record of building lasting client relationships and meeting targets. Listens first, then recommends solutions that fit.', 'Confident communicator who manages a pipeline well, follows up consistently and closes with integrity.'],
  'Project Manager': ['Organised project manager experienced in planning, budgeting and delivering projects on schedule. Keeps stakeholders informed and teams focused on outcomes.', 'Pragmatic leader who breaks complex work into clear steps, manages risk early and supports teams to do their best work.'],
  'Customer Service': ['Friendly customer service professional who resolves issues quickly and keeps customers informed. Patient, clear and comfortable working with support tools.', 'Reliable team member who stays calm with difficult requests and turns problems into positive experiences.'],
  'Engineer': ['Analytical engineer with a strong foundation in design, testing and problem solving. Comfortable working from specifications to delivery with attention to safety and quality.', 'Practical engineer who documents clearly, collaborates across teams and continually improves processes.'],
  'Data Analyst': ['Data analyst who turns messy data into clear insights using SQL, spreadsheets and visualisation tools. Careful about data quality and skilled at explaining findings simply.', 'Curious analyst with a knack for spotting patterns and helping teams make evidence-based decisions.'],
  'Student / Fresh Graduate': ['Motivated recent graduate with a solid academic foundation and hands-on project experience. Quick learner, reliable and eager to contribute in a first professional role.', 'Enthusiastic student with strong teamwork and communication skills, looking for an opportunity to apply my knowledge and grow.'],
  'Other': ['Dependable professional with a track record of learning quickly, communicating clearly and finishing what I start. Looking for a role where I can add value from day one.', 'Adaptable team player who takes ownership of tasks and enjoys solving practical problems.']
};
const PROFESSION_GUESS = [
  ['Software Developer', /develop|program|software|web|full.?stack|front.?end|back.?end/i], ['Designer', /design|ui|ux|graphic/i],
  ['Marketing Specialist', /market|seo|brand|content/i], ['Accountant', /account|finance|audit|bookkeep/i],
  ['Teacher', /teach|lectur|tutor|educat/i], ['Nurse', /nurs|health|clinic/i], ['Sales Representative', /sales|business dev/i],
  ['Project Manager', /project|product manager|scrum/i], ['Customer Service', /customer|support|service/i],
  ['Engineer', /engineer/i], ['Data Analyst', /data|analyst/i], ['Student / Fresh Graduate', /student|graduate|intern/i]
];

/* ---------- 2. UTILITIES ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape user text before it goes into HTML (prevents markup injection). */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const str = (v, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : '');
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const BUL = /^\s*(?:[-•*–])\s+/;

/** Turn free text into paragraphs, with "- " lines becoming bullets. */
function rich(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim());
  let out = '', list = [];
  const flush = () => { if (list.length) { out += '<ul>' + list.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'; list = []; } };
  lines.forEach(l => { if (BUL.test(l)) list.push(l.replace(BUL, '').trim()); else { flush(); out += `<p>${esc(l.trim())}</p>`; } });
  flush();
  return out;
}
/** Every non-empty line becomes a bullet. */
function bullets(text) {
  const items = String(text || '').split(/\r?\n/).map(l => l.replace(BUL, '').trim()).filter(Boolean);
  return items.length ? '<ul>' + items.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '';
}
/** Only allow http(s) links. Returns '' for anything else (blocks javascript: etc). */
function safeUrl(v) {
  v = String(v || '').trim();
  if (!v || /\s/.test(v)) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; }
}
const shortUrl = v => String(v).trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
function linkHTML(v, label) {
  const h = safeUrl(v), t = esc(label || shortUrl(v));
  return h ? `<a href="${esc(h)}">${t}</a>` : t;
}
const mailHTML = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v);
const telHTML = v => { const d = v.replace(/[^\d+]/g, ''); return d.length >= 5 ? `<a href="tel:${esc(d)}">${esc(v)}</a>` : esc(v); };
function fmtDate(v) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v + 'T00:00:00');
    if (!isNaN(d)) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return v;
}
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const isImg = s => typeof s === 'string' && s.length < 4e6 && /^data:image\/(jpeg|png);base64,/.test(s.slice(0, 40));
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const getPath = p => p.split('.').reduce((o, k) => o?.[k], state);
function setPath(p, v) { const ks = p.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], state)[last] = v; }

/* ---------- 3. STATE ---------- */
let state;
let photoImg = null;                                         // decoded source photo
const ui = { open: new Set(), collapsed: new Set(), profession: '' };  // UI-only state (not undone/saved)

function blankPersonal() { return Object.fromEntries(PERSONAL_FIELDS.map(f => [f.k, ''])); }
function blankPhoto() { return { src: '', out: '', shape: 'rect', zoom: 1, x: 0, y: 0 }; }
function blankState() {
  return {
    v: 1, demo: false,
    meta: { template: 'modern', ats: false, primary: '#1f3a5f', accent: '#c2410c', text: '#1e2530', font: 'Inter', fontSize: 14, refsOnRequest: false },
    personal: blankPersonal(), photo: blankPhoto(), summary: '',
    education: [], experience: [], skills: [], projects: [], certifications: [], languages: [], interests: [], references: [], custom: [],
    order: [...DEFAULT_ORDER]
  };
}
function cleanItem(k, raw) {
  const sc = SCHEMA[k], o = { id: /^[a-z0-9]{3,20}$/i.test(raw?.id) ? raw.id : uid() };
  sc.fields.forEach(f => {
    const v = raw?.[f.k];
    if (f.t === 'checkbox') o[f.k] = !!v;
    else if (f.t === 'select') o[f.k] = f.opts.includes(v) ? v : (sc.defaults?.[f.k] || '');
    else o[f.k] = str(v, f.t === 'textarea' ? 5000 : 300);
  });
  return o;
}
const blankItem = k => cleanItem(k, {});

/** Validate and sanitize any incoming data (saved, imported or undone) into a safe state object. */
function normalize(raw) {
  const b = blankState();
  if (!raw || typeof raw !== 'object') return b;
  const m = raw.meta || {};
  if (TPL_KEYS.includes(m.template)) b.meta.template = m.template;
  b.meta.ats = !!m.ats; b.meta.refsOnRequest = !!m.refsOnRequest;
  ['primary', 'accent', 'text'].forEach(k => { if (/^#[0-9a-f]{6}$/i.test(m[k])) b.meta[k] = m[k]; });
  if (FONTS[m.font]) b.meta.font = m.font;
  const fs = Number(m.fontSize); if (fs >= 11 && fs <= 16) b.meta.fontSize = fs;
  PERSONAL_FIELDS.forEach(f => { b.personal[f.k] = str(raw.personal?.[f.k], 300); });
  const p = raw.photo || {};
  if (isImg(p.src) && isImg(p.out)) { b.photo.src = p.src; b.photo.out = p.out; }
  b.photo.shape = p.shape === 'circle' ? 'circle' : 'rect';
  b.photo.zoom = clamp(Number(p.zoom) || 1, 1, 3); b.photo.x = clamp(Number(p.x) || 0, -1, 1); b.photo.y = clamp(Number(p.y) || 0, -1, 1);
  b.summary = str(raw.summary, 3000); b.demo = !!raw.demo;
  LIST_KEYS.forEach(k => { b[k] = (Array.isArray(raw[k]) ? raw[k] : []).slice(0, 100).map(it => cleanItem(k, it)); });
  const valid = new Set([...DEFAULT_ORDER, ...b.custom.map(c => 'c_' + c.id)]);
  let order = Array.isArray(raw.order) ? raw.order.filter((k, i, a) => valid.has(k) && a.indexOf(k) === i) : [...DEFAULT_ORDER];
  b.custom.forEach(c => { if (!order.includes('c_' + c.id)) order.push('c_' + c.id); });
  if (order.includes('personal')) order = ['personal', ...order.filter(k => k !== 'personal')];
  b.order = order;
  return b;
}

function hasContent() {
  return PERSONAL_FIELDS.some(f => state.personal[f.k]) || state.summary || state.photo.src ||
    LIST_KEYS.some(k => state[k].length);
}
function resetUI() {
  ui.open.clear();
  ui.collapsed = new Set(state.order.filter(k => k !== 'personal'));
}
async function restorePhoto() {
  photoImg = null;
  if (state.photo.src) { try { photoImg = await loadImage(state.photo.src); } catch { photoImg = null; } }
  bindPhoto();
}

/* ---------- 4. NOTIFICATIONS ---------- */
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), type === 'error' ? 4500 : 2600);
}
/** Accessible confirm dialog. Resolves true (confirm) or false (cancel / Esc). */
function confirmDialog({ title, message, confirm = 'Delete', danger = true }) {
  return new Promise(resolve => {
    const m = $('#modal'), ok = $('#mOk'), cancel = $('#mCancel'), prev = document.activeElement;
    $('#mTitle').textContent = title; $('#mMsg').textContent = message; ok.textContent = confirm;
    ok.className = 'btn ' + (danger ? 'danger-fill' : 'primary');
    m.hidden = false; cancel.focus();
    const done = v => {
      m.hidden = true; ok.onclick = cancel.onclick = null; document.removeEventListener('keydown', onKey, true);
      prev?.focus?.(); resolve(v);
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
      if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === ok ? cancel : ok).focus(); }
    };
    ok.onclick = () => done(true); cancel.onclick = () => done(false);
    document.addEventListener('keydown', onKey, true);
  });
}

/* ---------- 5. UNDO / REDO ---------- */
const H = { stack: [], idx: -1, timer: 0 };
function pushHistory(now) {
  clearTimeout(H.timer);
  const run = () => {
    H.timer = 0;
    const s = JSON.stringify(state);
    if (H.stack[H.idx] === s) return;
    H.stack = H.stack.slice(0, H.idx + 1); H.stack.push(s);
    if (H.stack.length > 60) H.stack.shift();
    H.idx = H.stack.length - 1; updateUndoButtons();
  };
  if (now) run(); else H.timer = setTimeout(run, 700);
}
function flushHistory() { if (H.timer) { clearTimeout(H.timer); H.timer = 0; pushHistory(true); } }
function updateUndoButtons() { $('#undoBtn').disabled = H.idx <= 0; $('#redoBtn').disabled = H.idx >= H.stack.length - 1; }
function stepHistory(d) {
  flushHistory();
  const i = H.idx + d;
  if (i < 0 || i >= H.stack.length) return;
  H.idx = i; state = normalize(JSON.parse(H.stack[i]));
  updateUndoButtons(); renderAll(); restorePhoto(); scheduleSave();
  toast(d < 0 ? 'Undone.' : 'Redone.');
}

/* ---------- 6. LOCAL STORAGE ---------- */
let saveTimer = 0;
function setSaveStatus(s, text) { const el = $('#saveStatus'); el.dataset.state = s; el.textContent = text; }
function saveNow(manual) {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSaveStatus('saved', 'Auto Saved · ' + t);
    if (manual) toast('CV saved successfully.');
  } catch {
    setSaveStatus('error', 'Not saved');
    toast('Could not save: browser storage is full or blocked. Use Export CV Data to keep a backup.', 'error');
  }
}
function scheduleSave() { setSaveStatus('saving', 'Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(() => saveNow(false), 600); }
function loadSaved() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalize(JSON.parse(raw)) : null; } catch { return null; }
}

/** After a typing-level change: cheap updates only. */
function typed() { renderPreviewSoon(); renderQuality(); pushHistory(false); scheduleSave(); }
/** After a structural change (add/delete/move/import): rebuild editor too. */
function commit() { renderEditor(); renderPreviewNow(); renderQuality(); syncBanner(); pushHistory(true); scheduleSave(); }

/* ---------- 7. PHOTO ---------- */
const photoDims = () => state.photo.shape === 'circle' ? { w: 480, h: 480 } : { w: 420, h: 540 };
/** Draw the source photo into `canvas` using zoom + offset (offsets are fractions of the frame). */
function drawPhoto(canvas) {
  const p = state.photo, { w, h } = photoDims();
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e9edf3'; ctx.fillRect(0, 0, w, h);
  if (!photoImg) return;
  const s = Math.max(w / photoImg.width, h / photoImg.height) * p.zoom;
  const dw = photoImg.width * s, dh = photoImg.height * s;
  const mx = (dw - w) / 2 / w, my = (dh - h) / 2 / h;
  p.x = clamp(p.x, -mx, mx); p.y = clamp(p.y, -my, my);
  ctx.drawImage(photoImg, (w - dw) / 2 + p.x * w, (h - dh) / 2 + p.y * h, dw, dh);
}
function bindPhoto() {
  const c = $('#photoCanvas'); if (!c) return;
  drawPhoto(c);
  c.classList.toggle('empty', !photoImg);
  c.tabIndex = photoImg ? 0 : -1;
  const z = $('#photoZoom'); if (z) { z.value = state.photo.zoom; z.disabled = !photoImg; }
  const st = $('#photoStage'); if (st) st.className = 'photo-stage' + (state.photo.shape === 'circle' ? ' circle' : '');
  const em = $('#photoEmpty'); if (em) em.hidden = !!photoImg;
}
/** Bake the current crop into a compressed JPEG used by the CV. */
function commitPhoto() {
  const c = $('#photoCanvas'); if (!c) return;
  drawPhoto(c);
  state.photo.out = photoImg ? c.toDataURL('image/jpeg', 0.92) : '';
  typed();
}
async function loadPhotoFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) { toast('Please choose a JPG or PNG image.', 'error'); return; }
  if (file.size > 15 * 1024 * 1024) { toast('That image is over 15 MB. Please choose a smaller one.', 'error'); return; }
  try {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url); URL.revokeObjectURL(url);
    const sc = Math.min(1, 1000 / Math.max(img.width, img.height));     // compress large images
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    state.photo.src = c.toDataURL('image/jpeg', 0.86);
    photoImg = await loadImage(state.photo.src);
    Object.assign(state.photo, { zoom: 1, x: 0, y: 0 });
    state.photo.out = ''; commitPhoto();
    commit(); toast('Photo added. Drag it to position.');
  } catch { toast('That image could not be read. Try a different file.', 'error'); }
}
function removePhoto() {
  photoImg = null; state.photo = { ...blankPhoto(), shape: state.photo.shape };
  commit(); toast('Photo removed.');
}
function sampleAvatar() {
  const c = document.createElement('canvas'); c.width = 420; c.height = 540;
  const x = c.getContext('2d'); x.fillStyle = '#cfd8e6'; x.fillRect(0, 0, 420, 540);
  x.fillStyle = '#8fa1bb'; x.beginPath(); x.arc(210, 210, 88, 0, 7); x.fill();
  x.beginPath(); x.ellipse(210, 470, 170, 130, 0, 0, 7); x.fill();
  return c.toDataURL('image/jpeg', 0.9);
}

/* ---------- 8. EDITOR / FORMS ---------- */
const ed = $('#editorDyn');
const secMeta = key => key.startsWith('c_')
  ? { icon: '✨', title: state.custom.find(c => 'c_' + c.id === key)?.title.trim() || 'Custom section' }
  : SECTIONS[key];
const itemOf = (sec, id) => state[sec]?.find(x => x.id === id);

function renderEditor() {
  ed.innerHTML = state.order.map(secCard).join('') + addBar();
  fillValues(ed); bindPhoto(); renderSuggestions(); updateSummaryCount();
}
function secCard(key, i) {
  const m = secMeta(key), pinned = key === 'personal', closed = ui.collapsed.has(key), t = esc(m.title);
  const first = state.order[0] === 'personal' ? 1 : 0;
  return `<section class="card sec${closed ? ' collapsed' : ''}" data-key="${key}" aria-label="${t}">
  <header class="sec-head">
    ${pinned ? '<span class="handle pin" title="Personal information is always the CV header" aria-hidden="true">📌</span>'
      : `<button type="button" class="handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder ${t}">⋮⋮</button>`}
    <button type="button" class="sec-title" data-act="toggle" data-key="${key}" aria-expanded="${!closed}"><span aria-hidden="true">${m.icon}</span><span>${t}</span></button>
    <div class="sec-tools">
      ${pinned ? '' : `<button type="button" class="ib" data-act="sec-up" data-key="${key}" title="Move section up" aria-label="Move ${t} up"${i <= first ? ' disabled' : ''}>↑</button>
      <button type="button" class="ib" data-act="sec-down" data-key="${key}" title="Move section down" aria-label="Move ${t} down"${i >= state.order.length - 1 ? ' disabled' : ''}>↓</button>`}
      <button type="button" class="btn sm" data-act="toggle" data-key="${key}" data-role="edit">${closed ? 'Edit' : 'Done'}</button>
      <button type="button" class="btn sm danger" data-act="sec-del" data-key="${key}" title="Delete this section" aria-label="Delete ${t} section">Delete</button>
    </div>
  </header>
  <div class="sec-body"${closed ? ' hidden' : ''}>${bodyFor(key)}</div></section>`;
}
function bodyFor(key) {
  if (key === 'personal') return personalBody();
  if (key === 'summary') return summaryBody();
  if (key.startsWith('c_')) return customBody(key.slice(2));
  if (key === 'interests') return interestsBody();
  return listBody(key);
}
function addBar() {
  const missing = DEFAULT_ORDER.filter(k => !state.order.includes(k));
  return `<div class="card add-bar"><strong>Add a section</strong>
    ${missing.map(k => `<button type="button" class="btn sm" data-act="sec-add" data-key="${k}">+ ${esc(SECTIONS[k].title)}</button>`).join('')}
    <button type="button" class="btn sm primary" data-act="custom-add">+ Add Custom Section</button></div>`;
}

/* -- personal + photo -- */
function personalFieldHTML(f) {
  const id = 'p-' + f.k, a = `id="${id}" data-path="personal.${f.k}"`;
  const ctl = f.type === 'select'
    ? `<select ${a}><option value="">Not specified</option>${f.opts.map(o => `<option>${esc(o)}</option>`).join('')}</select>`
    : `<input ${a} type="${f.type || 'text'}"${f.im ? ` inputmode="${f.im}"` : ''} placeholder="${esc(f.ph || '')}" autocomplete="${f.ac || 'off'}">`;
  return `<div class="fld"><label for="${id}">${esc(f.l)}</label><div class="fld-wrap">${ctl}${f.type === 'select' ? '' :
    `<button type="button" class="clr" data-act="clear-field" data-target="${id}" title="Clear ${esc(f.l)}" aria-label="Clear ${esc(f.l)}">✕</button>`}</div></div>`;
}
function personalBody() {
  const has = !!state.photo.src;
  return `<div class="photo-box">
    <div class="photo-stage${state.photo.shape === 'circle' ? ' circle' : ''}" id="photoStage">
      <canvas id="photoCanvas" role="img" aria-label="Photo frame. Drag to reposition, or use arrow keys."></canvas>
      <div class="photo-empty" id="photoEmpty">Passport-size photo<br>(optional)</div>
    </div>
    <div class="photo-controls">
      <div class="photo-btns">
        <button type="button" class="btn sm primary" data-act="photo-upload">${has ? 'Change Photo' : 'Upload Photo'}</button>
        ${has ? '<button type="button" class="btn sm danger" data-act="photo-remove">Remove Photo</button>' : ''}
        <input type="file" id="photoFile" accept="image/png,image/jpeg" hidden>
      </div>
      <div class="fld"><label for="photoShape">Photo shape</label>
        <select id="photoShape" data-path="photo.shape"><option value="rect">Passport (rectangle)</option><option value="circle">Circle</option></select></div>
      <div class="fld"><label for="photoZoom">Zoom</label><input type="range" id="photoZoom" min="1" max="3" step="0.01" value="1"></div>
      <p class="hint">JPG or PNG. Drag to position. The photo is resized and compressed on your device and is never uploaded.</p>
    </div></div>
    <div class="grid2">${PERSONAL_FIELDS.map(personalFieldHTML).join('')}</div>`;
}

/* -- summary -- */
function guessProfession() {
  const t = state.personal.title;
  return (PROFESSION_GUESS.find(([, re]) => re.test(t)) || [])[0] || 'Other';
}
function summaryBody() {
  if (!ui.profession) ui.profession = guessProfession();
  return `<div class="fld"><label for="profSel">Suggestions for</label>
      <select id="profSel" data-ui="profession">${Object.keys(SUMMARIES).map(p => `<option${p === ui.profession ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
    <div class="sug" id="sugList"></div>
    <div class="fld"><label for="sumText">Summary</label>
      <textarea id="sumText" rows="6" maxlength="3000" data-path="summary" placeholder="2–4 sentences about who you are, what you do best and what you want next."></textarea></div>
    <div class="sum-foot"><span class="muted" id="sumCount" aria-live="polite"></span>
      <button type="button" class="btn sm" data-act="sum-clear">Clear</button></div>`;
}
function renderSuggestions() {
  const box = $('#sugList'); if (!box) return;
  const list = SUMMARIES[ui.profession] || SUMMARIES.Other;
  box.innerHTML = list.map((t, i) => `<button type="button" data-act="sum-use" data-i="${i}" title="Use this suggestion">${esc(t)}</button>`).join('');
}
function updateSummaryCount() {
  const el = $('#sumCount'); if (!el) return;
  const t = state.summary.trim();
  el.textContent = `${t ? t.split(/\s+/).length : 0} words · ${state.summary.length} characters (aim for 50–100 words)`;
}

/* -- generic list sections -- */
function fieldHTML(sec, it, f, inline) {
  const id = `${it.id}-${f.k}`, a = `id="${id}" data-sec="${sec}" data-id="${it.id}" data-k="${f.k}"`;
  const cls = 'fld' + (f.span === 2 ? ' span2' : '');
  const lbl = `<label for="${id}"${inline && !f.vis ? ' class="sr-only"' : ''}>${esc(f.l)}</label>`;
  if (f.t === 'checkbox') return `<div class="${cls}"><label class="chk"><input type="checkbox" ${a}> ${esc(f.l)}</label></div>`;
  if (f.t === 'select') return `<div class="${cls}">${lbl}<select ${a}>${f.opts.map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`;
  if (f.t === 'textarea') return `<div class="${cls}">${lbl}<textarea ${a} rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}"></textarea></div>`;
  return `<div class="${cls}">${lbl}<input type="text" ${a} placeholder="${esc(f.ph || '')}" autocomplete="off"></div>`;
}
function moveBtns(sec, id, i, n) {
  return `<button type="button" class="ib" data-act="item-up" data-sec="${sec}" data-id="${id}" title="Move up" aria-label="Move up"${i === 0 ? ' disabled' : ''}>↑</button>
    <button type="button" class="ib" data-act="item-down" data-sec="${sec}" data-id="${id}" title="Move down" aria-label="Move down"${i === n - 1 ? ' disabled' : ''}>↓</button>`;
}
function itemCard(sec, it, i, n) {
  const sc = SCHEMA[sec], open = ui.open.has(it.id);
  return `<article class="it${open ? ' open' : ''}" data-item="${it.id}">
    <div class="it-head"><div class="it-txt"><strong class="it-title">${esc(sc.title(it))}</strong><span class="it-sub">${esc(sc.sub(it))}</span></div>
      <div class="it-tools">
        <button type="button" class="btn sm" data-act="item-edit" data-id="${it.id}" aria-expanded="${open}">${open ? 'Done' : 'Edit'}</button>
        ${moveBtns(sec, it.id, i, n)}
        <button type="button" class="btn sm danger" data-act="item-del" data-sec="${sec}" data-id="${it.id}">Delete</button>
      </div></div>
    <div class="it-body"${open ? '' : ' hidden'}><div class="grid2">${sc.fields.map(f => fieldHTML(sec, it, f, false)).join('')}</div></div></article>`;
}
function inlineRow(sec, it, i, n) {
  const sc = SCHEMA[sec];
  return `<div class="row-inline" data-item="${it.id}"><div class="fields">${sc.fields.map(f => fieldHTML(sec, it, f, true)).join('')}</div>
    <div class="it-tools">${moveBtns(sec, it.id, i, n)}<button type="button" class="btn sm danger" data-act="item-del" data-sec="${sec}" data-id="${it.id}" aria-label="Delete ${esc(sc.plural)} entry">Delete</button></div></div>`;
}
function listBody(key) {
  const sc = SCHEMA[key], items = state[key];
  let h = '';
  if (key === 'references') h += `<label class="chk"><input type="checkbox" data-path="meta.refsOnRequest"> Show “References available upon request” instead of listing references</label>`;
  h += `<div class="items">${items.map((it, i) => sc.inline ? inlineRow(key, it, i, items.length) : itemCard(key, it, i, items.length)).join('')}</div>`;
  if (!items.length) h += `<p class="empty">No ${sc.plural} added yet.</p>`;
  return h + `<button type="button" class="btn add-btn" data-act="add" data-sec="${key}">+ ${sc.add}</button>`;
}
function interestsBody() {
  const items = state.interests;
  return `<div class="chips-edit">${items.map(it => `<span class="chip-edit">${esc(it.name)}<button type="button" data-act="item-del" data-sec="interests" data-id="${it.id}" aria-label="Remove ${esc(it.name)}" title="Remove">✕</button></span>`).join('')}</div>
    ${items.length ? '' : '<p class="empty">No interests added yet.</p>'}
    <div class="add-row"><label class="sr-only" for="intInput">New interest</label><input type="text" id="intInput" placeholder="e.g. Photography" maxlength="60" autocomplete="off">
    <button type="button" class="btn primary" data-act="int-add">Add</button></div>`;
}
function customBody(id) {
  const c = state.custom.find(x => x.id === id); if (!c) return '';
  return `<datalist id="customIdeas">${CUSTOM_IDEAS.map(i => `<option value="${esc(i)}">`).join('')}</datalist>
    <div class="fld"><label for="ct-${id}">Section title</label>
      <input type="text" id="ct-${id}" list="customIdeas" data-sec="custom" data-id="${id}" data-k="title" placeholder="e.g. Achievements" autocomplete="off"></div>
    <div class="fld" style="margin-top:12px"><label for="cc-${id}">Section content <span class="muted">(start a line with “- ” for bullets)</span></label>
      <textarea id="cc-${id}" rows="5" data-sec="custom" data-id="${id}" data-k="content"></textarea></div>`;
}

/** Fill inputs from state (values are set as properties, never as HTML). */
function fillValues(root) {
  const set = (el, v) => { if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? ''; };
  $$('[data-path]', root).forEach(el => set(el, getPath(el.dataset.path)));
  $$('[data-sec][data-id][data-k]', root).forEach(el => { const it = itemOf(el.dataset.sec, el.dataset.id); if (it) set(el, it[el.dataset.k]); });
  $$('.it', root).forEach(syncCurrent);
  const fs = $('#fsOut'); if (fs) fs.textContent = state.meta.fontSize + ' px';
}
function syncCurrent(card) {
  const cur = $('[data-k="current"]', card), end = $('[data-k="end"]', card);
  if (cur && end) end.disabled = cur.checked;
}

/** Central input handler (event delegation): updates state, then the live preview. */
function onInput(e) {
  const t = e.target;
  if (t.dataset.ui === 'profession') { ui.profession = t.value; renderSuggestions(); return; }
  if (t.id === 'photoZoom') { state.photo.zoom = Number(t.value); drawPhoto($('#photoCanvas')); clearTimeout(onInput.pt); onInput.pt = setTimeout(commitPhoto, 150); return; }
  if (t.id === 'intInput' || t.id === 'importFile' || t.id === 'photoFile') return;
  const val = t.type === 'checkbox' ? t.checked : (t.type === 'range' ? Number(t.value) : t.value);
  if (t.dataset.path) {
    setPath(t.dataset.path, val);
    const p = t.dataset.path;
    if (p === 'photo.shape') { Object.assign(state.photo, { x: 0, y: 0 }); bindPhoto(); commitPhoto(); return; }
    if (p === 'meta.font') ensureFont(val).then(renderPreviewNow);
    if (p === 'meta.fontSize') $('#fsOut').textContent = val + ' px';
    if (p === 'meta.ats') $('#atsHint').hidden = !val;
    if (p === 'summary') updateSummaryCount();
    typed(); return;
  }
  if (t.dataset.sec && t.dataset.id) {
    const it = itemOf(t.dataset.sec, t.dataset.id); if (!it) return;
    it[t.dataset.k] = val;
    const card = t.closest('.it');
    if (card) {
      const sc = SCHEMA[t.dataset.sec];
      if (sc.title) { $('.it-title', card).textContent = sc.title(it); $('.it-sub', card).textContent = sc.sub(it); }
      syncCurrent(card);
    }
    if (t.dataset.sec === 'custom' && t.dataset.k === 'title') {
      const c = t.closest('.sec'); if (c) $('.sec-title span:last-child', c).textContent = it.title.trim() || 'Custom section';
    }
    typed();
  }
}

/* -- structural actions -- */
function addItem(sec) {
  const it = blankItem(sec); state[sec].push(it);
  if (!SCHEMA[sec].inline) ui.open.add(it.id);
  ui.collapsed.delete(sec); commit(); toast(SCHEMA[sec].added);
  const first = $(`[data-id="${it.id}"][data-k]`); first?.focus();
}
function removeItem(sec, id) {
  state[sec] = state[sec].filter(x => x.id !== id); ui.open.delete(id);
  commit(); toast(SCHEMA[sec].removed);
}
function moveItem(sec, id, d) {
  const a = state[sec], i = a.findIndex(x => x.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]]; commit();
}
function moveSection(key, d) {
  const a = state.order, i = a.indexOf(key), j = i + d, min = a[0] === 'personal' ? 1 : 0;
  if (i < 0 || j < min || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]]; commit();
}
function toggleSection(key) {
  const card = $(`.sec[data-key="${key}"]`); if (!card) return;
  const body = $('.sec-body', card), closing = !body.hidden;
  body.hidden = closing; card.classList.toggle('collapsed', closing);
  closing ? ui.collapsed.add(key) : ui.collapsed.delete(key);
  $('.sec-title', card).setAttribute('aria-expanded', String(!closing));
  $('[data-role="edit"]', card).textContent = closing ? 'Edit' : 'Done';
}
function toggleItem(id) {
  const card = $(`[data-item="${id}"]`); if (!card) return;
  const body = $('.it-body', card), open = body.hidden;
  body.hidden = !open; card.classList.toggle('open', open);
  open ? ui.open.add(id) : ui.open.delete(id);
  const b = $('[data-act="item-edit"]', card); b.textContent = open ? 'Done' : 'Edit'; b.setAttribute('aria-expanded', String(open));
}
async function deleteSection(key) {
  const m = secMeta(key);
  const ok = await confirmDialog({ title: `Delete “${m.title}”?`, message: 'Are you sure you want to delete this section? Its content will be removed from your CV. You can bring it back with Undo (Ctrl+Z).', confirm: 'Delete' });
  if (!ok) return;
  state.order = state.order.filter(k => k !== key);
  if (key === 'personal') { state.personal = blankPersonal(); state.photo = blankPhoto(); photoImg = null; }
  else if (key === 'summary') state.summary = '';
  else if (key.startsWith('c_')) state.custom = state.custom.filter(c => 'c_' + c.id !== key);
  else { state[key] = []; if (key === 'references') state.meta.refsOnRequest = false; }
  commit(); toast('Section deleted.');
}
function addSection(key) {
  if (key === 'personal') state.order.unshift(key); else state.order.push(key);
  ui.collapsed.delete(key); commit(); toast(SECTIONS[key].title + ' section added.');
}
function addCustom() {
  const c = cleanItem('custom', {}); state.custom.push(c); state.order.push('c_' + c.id);
  commit(); toast(SCHEMA.custom.added);
  const el = $(`#ct-${c.id}`); el?.focus(); el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function addInterest() {
  const inp = $('#intInput'), v = inp.value.trim(); if (!v) { inp.focus(); return; }
  const it = cleanItem('interests', { name: v }); state.interests.push(it);
  commit(); toast(SCHEMA.interests.added); $('#intInput')?.focus();
}

/* -- drag & drop section ordering (mouse / pen; touch users have the arrow buttons) -- */
let dragKey = null;
const clearMarks = () => $$('.drop-before,.drop-after,.dragging', ed).forEach(e => e.classList.remove('drop-before', 'drop-after', 'dragging'));
function bindSectionDnD() {
  ed.addEventListener('dragstart', e => {
    const h = e.target.closest?.('.handle[draggable]'); if (!h) return;
    const card = h.closest('.sec'); dragKey = card.dataset.key;
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragKey);
    try { e.dataTransfer.setDragImage(card, 24, 24); } catch { /* ignore */ }
    requestAnimationFrame(() => card.classList.add('dragging'));
  });
  ed.addEventListener('dragover', e => {
    if (!dragKey) return;
    const card = e.target.closest('.sec'); if (!card || card.dataset.key === dragKey) return;
    e.preventDefault();
    const r = card.getBoundingClientRect();
    const after = card.dataset.key === 'personal' || e.clientY > r.top + r.height / 2;
    $$('.drop-before,.drop-after', ed).forEach(x => x.classList.remove('drop-before', 'drop-after'));
    card.classList.add(after ? 'drop-after' : 'drop-before');
  });
  ed.addEventListener('drop', e => {
    if (!dragKey) return;
    const card = e.target.closest('.sec'); if (!card) return;
    e.preventDefault();
    const after = card.classList.contains('drop-after'), target = card.dataset.key;
    if (target !== dragKey) {
      const order = state.order.filter(k => k !== dragKey);
      order.splice(order.indexOf(target) + (after ? 1 : 0), 0, dragKey);
      state.order = order.includes('personal') ? ['personal', ...order.filter(k => k !== 'personal')] : order;
      dragKey = null; commit(); toast('Section moved.');
    }
  });
  ed.addEventListener('dragend', () => { dragKey = null; clearMarks(); });
}

/* -- photo pointer / keyboard interaction -- */
function bindPhotoInteraction() {
  let drag = null;
  ed.addEventListener('pointerdown', e => {
    if (e.target.id !== 'photoCanvas' || !photoImg) return;
    drag = { x: e.clientX, y: e.clientY }; e.target.setPointerCapture(e.pointerId);
  });
  ed.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = e.target.getBoundingClientRect();
    state.photo.x += (e.clientX - drag.x) / r.width; state.photo.y += (e.clientY - drag.y) / r.height;
    drag.x = e.clientX; drag.y = e.clientY; drawPhoto(e.target);
  });
  const end = () => { if (drag) { drag = null; commitPhoto(); } };
  ed.addEventListener('pointerup', end); ed.addEventListener('pointercancel', end);
  ed.addEventListener('keydown', e => {
    if (e.target.id !== 'photoCanvas' || !photoImg) return;
    const s = { ArrowLeft: [-.03, 0], ArrowRight: [.03, 0], ArrowUp: [0, -.03], ArrowDown: [0, .03] }[e.key];
    if (!s) return;
    e.preventDefault(); state.photo.x += s[0]; state.photo.y += s[1]; commitPhoto();
  });
}

/* ---------- 9. CV RENDERING ---------- */
const skillLv = x => Math.max(1, LEVELS.indexOf(x.level) + 1);
function pageStyle() {
  const m = state.meta, f = `font-family:${FONTS[m.font]};font-size:${m.fontSize}px`;
  return m.ats ? `--p:#000;--a:#000;--t:#000;${f}` : `--p:${m.primary};--a:${m.accent};--t:${m.text};${f}`;
}
function contactList() {
  const P = state.personal, a = [];
  const add = (l, h) => a.push({ l, h });
  if (P.email.trim()) add('Email', mailHTML(P.email.trim()));
  if (P.phone.trim()) add('Phone', telHTML(P.phone.trim()));
  if (P.address.trim()) add('Address', esc(P.address.trim()));
  if (P.website.trim()) add('Website', linkHTML(P.website));
  if (P.linkedin.trim()) add('LinkedIn', linkHTML(P.linkedin));
  if (P.github.trim()) add('GitHub', linkHTML(P.github));
  return a;
}
function skillsHTML(items, style) {
  if (style === 'bars') return items.map(x => `<div class="sk-bar-row"><div>${esc(x.name)}</div><div class="sk-bar"><i style="width:${skillLv(x) * 25}%"></i></div></div>`).join('');
  if (style === 'chips') return items.map(x => `<span class="chip">${esc(x.name)}${x.level ? `<small>${esc(x.level)}</small>` : ''}</span>`).join('');
  if (style === 'grid') return '<div class="sk-grid">' + items.map(x => `<div class="sk-row"><span>${esc(x.name)}</span><span class="pips">${[1, 2, 3, 4].map(n => `<i${n <= skillLv(x) ? ' class="on"' : ''}></i>`).join('')}</span></div>`).join('') + '</div>';
  return `<p>${items.map(x => esc(x.name) + (x.level ? ` (${esc(x.level)})` : '')).join(', ')}</p>`;
}
function languagesHTML(items) {
  return items.map(x => {
    const lv = [x.speaking, x.reading, x.writing];
    const txt = lv.every(v => v === lv[0]) ? lv[0] : `Speaking ${x.speaking} · Reading ${x.reading} · Writing ${x.writing}`;
    return `<div class="lang-row"><strong>${esc(x.name)}</strong> <span>${esc(txt)}</span></div>`;
  }).join('');
}

/** Turn one section into an array of "blocks". A block is the smallest unit that must not be split across pages. */
function sectionBlocks(key, col, T) {
  const s = state, ats = s.meta.ats, side = col === 'side';
  const hd = t => ({ html: `<h3 class="cv-h">${esc(t)}</h3>`, keep: true, cls: 'hd' });
  const item = html => ({ html });
  const filled = k => s[k].filter(x => (x.name ?? x.title ?? x.degree ?? x.institution ?? '').toString().trim() || x.company?.trim() || x.institution?.trim());
  if (key === 'summary') return s.summary.trim() ? [item(`<h3 class="cv-h">Professional Summary</h3><div class="cv-text">${rich(s.summary)}</div>`)] : [];
  if (key === 'education') {
    const l = s.education.filter(e => e.degree.trim() || e.institution.trim());
    return l.length ? [hd('Education'), ...l.map(e => item(`<div class="cv-row"><strong>${esc(e.degree || e.institution)}</strong><span class="cv-date">${esc(range(e.start, e.end))}</span></div>
      <div class="cv-sub">${[e.degree ? e.institution : '', e.location].filter(x => x.trim()).map(esc).join(', ')}</div>
      ${e.grade.trim() ? `<div class="cv-sub">Grade / GPA: ${esc(e.grade)}</div>` : ''}${e.desc.trim() ? `<div class="cv-text">${rich(e.desc)}</div>` : ''}`))] : [];
  }
  if (key === 'experience') {
    const l = s.experience.filter(x => x.title.trim() || x.company.trim());
    return l.length ? [hd('Work Experience'), ...l.map(x => item(`<div class="cv-row"><strong>${esc(x.title || x.company)}</strong><span class="cv-date">${esc(range(x.start, x.end, x.current))}</span></div>
      <div class="cv-sub">${[x.title ? x.company : '', x.location].filter(v => v.trim()).map(esc).join(', ')}</div>
      ${bullets(x.duties)}${x.achievements.trim() ? `<div class="cv-ach"><em>Achievements</em>${bullets(x.achievements)}</div>` : ''}`))] : [];
  }
  if (key === 'skills') {
    const l = s.skills.filter(x => x.name.trim());
    return l.length ? [hd('Skills'), item(skillsHTML(l, ats ? 'text' : T.skills))] : [];
  }
  if (key === 'projects') {
    const l = s.projects.filter(p => p.name.trim());
    return l.length ? [hd('Projects'), ...l.map(p => {
      const links = [p.url.trim() && linkHTML(p.url, ats ? '' : 'Project link'), p.github.trim() && linkHTML(p.github, ats ? '' : 'GitHub')].filter(Boolean).join(' · ');
      return item(`<div class="cv-row"><strong>${esc(p.name)}</strong><span class="cv-date cv-links">${links}</span></div>
        ${p.desc.trim() ? `<div class="cv-text">${rich(p.desc)}</div>` : ''}${p.tech.trim() ? `<div class="cv-sub">Technologies: ${esc(p.tech)}</div>` : ''}`);
    })] : [];
  }
  if (key === 'certifications') {
    const l = s.certifications.filter(c => c.name.trim());
    return l.length ? [hd('Certifications'), ...l.map(c => item(`<div class="cv-row"><strong>${esc(c.name)}</strong><span class="cv-date">${esc(c.date)}</span></div>
      <div class="cv-sub">${[c.org, c.credId.trim() ? 'ID: ' + c.credId : ''].filter(v => v.trim()).map(esc).join(' · ')}</div>
      ${c.url.trim() ? `<div class="cv-sub cv-links">${linkHTML(c.url, ats ? '' : 'View credential')}</div>` : ''}`))] : [];
  }
  if (key === 'languages') {
    const l = s.languages.filter(x => x.name.trim());
    return l.length ? [hd('Languages'), item(languagesHTML(l))] : [];
  }
  if (key === 'interests') {
    const l = s.interests.filter(x => x.name.trim());
    if (!l.length) return [];
    const html = side ? `<ul class="plain">${l.map(x => `<li>${esc(x.name)}</li>`).join('')}</ul>`
      : (T.skills === 'chips' && !ats) ? l.map(x => `<span class="chip">${esc(x.name)}</span>`).join('')
      : `<p>${l.map(x => esc(x.name)).join(', ')}</p>`;
    return [hd('Interests & Hobbies'), item(html)];
  }
  if (key === 'references') {
    if (s.meta.refsOnRequest) return [item('<h3 class="cv-h">References</h3><div class="cv-text"><p>References available upon request.</p></div>')];
    const l = s.references.filter(r => r.name.trim());
    return l.length ? [hd('References'), ...l.map(r => item(`<strong>${esc(r.name)}</strong>
      <div class="cv-sub">${[r.position, r.org].filter(v => v.trim()).map(esc).join(', ')}</div>
      <div class="cv-sub">${[r.email.trim() && mailHTML(r.email.trim()), r.phone.trim() && telHTML(r.phone.trim())].filter(Boolean).join(' · ')}</div>`))] : [];
  }
  if (key.startsWith('c_')) {
    const c = s.custom.find(x => 'c_' + x.id === key);
    return c && c.content.trim() ? [item(`<h3 class="cv-h">${esc(c.title.trim() || 'Additional Information')}</h3><div class="cv-text">${rich(c.content)}</div>`)] : [];
  }
  return [];
}

/** Build the header / sidebar / section blocks for the current state and template. */
function buildCV() {
  const s = state, P = s.personal, ats = s.meta.ats;
  const tplKey = ats ? 'ats' : s.meta.template, T = TEMPLATES[tplKey], layout = T.layout;
  const model = { tplKey, layout, side: [], main: [], band: '' };
  const push = (col, blocks) => { if (blocks.length) { blocks[blocks.length - 1].end = true; model[col].push(...blocks); } };

  if (s.order.includes('personal')) {
    const name = P.fullName.trim(), title = P.title.trim();
    const photo = (!ats && s.photo.out) ? `<img class="cv-photo ${s.photo.shape}" src="${s.photo.out}" alt="Profile photo of ${esc(name || 'the CV owner')}">` : '';
    const nameHTML = `<div class="cv-name${name ? '' : ' ph'}">${esc(name || 'Your Name')}</div>${title ? `<div class="cv-title">${esc(title)}</div>` : ''}`;
    const contacts = contactList();
    const details = [['Date of birth', fmtDate(P.dob)], ['Nationality', P.nationality], ['Gender', P.gender]].filter(d => d[1] && String(d[1]).trim());
    if (layout === 'sidebar') {
      if (photo) push('side', [{ html: photo }]);
      if (contacts.length) push('side', [{ html: `<h3 class="cv-h">Contact</h3><div style="height:.5em"></div>${contacts.map(c => `<div class="ct-item"><span class="ct-l">${c.l}</span>${c.h}</div>`).join('')}` }]);
      if (details.length) push('side', [{ html: `<h3 class="cv-h">Details</h3><div style="height:.5em"></div>${details.map(d => `<div class="ct-item"><span class="ct-l">${esc(d[0])}</span>${esc(d[1])}</div>`).join('')}` }]);
      push('main', [{ html: `<div class="cv-head">${nameHTML}</div>` }]);
    } else {
      const sep = `<span>${ats ? ' | ' : ' · '}</span>`;
      const row = contacts.map(c => `<span>${c.h}</span>`).join(sep);
      const det = details.map(d => `<span>${esc(d[0])}: ${esc(d[1])}</span>`).join(sep);
      const head = `<div class="cv-head ${T.photo || 'none'}">${(T.photo === 'left' || T.photo === 'top') ? photo : ''}<div class="cv-head-txt">${nameHTML}${row ? `<div class="cv-contact">${row}</div>` : ''}${det ? `<div class="cv-details">${det}</div>` : ''}</div>${T.photo === 'right' ? photo : ''}</div>`;
      if (layout === 'band') model.band = head; else push('main', [{ html: head }]);
    }
  }
  s.order.forEach(k => {
    if (k === 'personal') return;
    const col = (layout === 'sidebar' && T.side.includes(k)) ? 'side' : 'main';
    push(col, sectionBlocks(k, col, T));
  });
  return model;
}

const wrapBlocks = bl => bl.map(b => `<div class="blk${b.cls ? ' ' + b.cls : ''}${b.end ? ' end' : ''}">${b.html}</div>`).join('');
/** Greedy pagination: never split a block; never leave a heading alone at the bottom of a page. */
function paginate(blocks, heights, cap0, capN) {
  const pages = [[]]; let used = 0, cap = cap0;
  blocks.forEach((b, i) => {
    let need = heights[i];
    if (b.keep && i + 1 < blocks.length) need += heights[i + 1];
    if (used + need > cap - 2 && pages[pages.length - 1].length) { pages.push([]); used = 0; cap = capN; }
    pages[pages.length - 1].push(b); used += heights[i];
  });
  return pages;
}
/** Measure blocks in an offscreen probe, split into A4 pages, return final HTML. */
function layoutPages(m) {
  const probe = $('#cvProbe'), cls = `cv-page tpl-${m.tplKey} layout-${m.layout}`, st = pageStyle();
  probe.innerHTML = `<div class="${cls} probe first" style="${st}">${m.layout === 'sidebar' ? `<aside class="pg-side">${wrapBlocks(m.side)}</aside>` : ''}${m.band ? `<div class="pg-band">${m.band}</div>` : ''}<div class="pg-main">${wrapBlocks(m.main)}</div></div>`;
  const hs = sel => $$(sel, probe).map(e => e.getBoundingClientRect().height);
  const mainH = hs('.pg-main .blk'), sideH = hs('.pg-side .blk');
  const bandH = m.band ? $('.pg-band', probe).getBoundingClientRect().height : 0;
  const capN = PAGE_H - 2 * PAD_V;
  const cap0 = m.band ? PAGE_H - bandH - BAND_GAP - PAD_V : capN;
  const mainP = paginate(m.main, mainH, cap0, capN);
  const sideP = m.layout === 'sidebar' ? paginate(m.side, sideH, capN, capN) : [[]];
  const n = Math.max(mainP.length, sideP.length, 1);
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="${cls}${i === 0 ? ' first' : ''}" style="${st}" data-page="${i + 1}">
      ${m.layout === 'sidebar' ? `<aside class="pg-side">${wrapBlocks(sideP[i] || [])}</aside>` : ''}
      ${m.band && i === 0 ? `<div class="pg-band">${m.band}</div>` : ''}
      <div class="pg-main">${wrapBlocks(mainP[i] || [])}</div></div>`;
  }
  probe.innerHTML = '';
  return { html, n };
}

let rafId = 0;
function renderPreviewSoon() { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; renderPreviewNow(); }); }
function renderPreviewNow() {
  const r = layoutPages(buildCV());
  $('#cvPages').innerHTML = r.html;
  $('#pageCount').textContent = `${r.n} page${r.n > 1 ? 's' : ''} · A4`;
  fitPreview();
}
/** Scale the fixed-size A4 pages to fit the preview column. */
function fitPreview() {
  const box = $('#previewScroll'), cs = getComputedStyle(box);
  const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (avail <= 0) return;
  const k = Math.min(1, avail / PAGE_W), pages = $('#cvPages');
  const frame = $('#pagesFrame'), scaler = $('#pagesScale');
  scaler.style.transform = `scale(${k})`;
  frame.style.width = PAGE_W * k + 'px';
  frame.style.height = pages.offsetHeight * k + 'px';
}

/* -- CV quality checker -- */
function renderQuality() {
  const s = state, P = s.personal, any = k => s[k].some(x => (x.name || x.title || x.degree || x.institution || x.company || '').trim());
  const checks = [
    [!!P.fullName.trim(), 'Name added', 'Add your full name'],
    [!!P.title.trim(), 'Professional title added', 'Add a professional title'],
    [!!(P.email.trim() || P.phone.trim()), 'Contact information added', 'Add an email or phone number'],
    [s.summary.trim().length >= 50, 'Professional summary added', 'Add a professional summary'],
    [any('education'), 'Education added', 'Add your education'],
    [any('experience'), 'Experience added', 'Add work experience'],
    [any('skills'), 'Skills added', 'Add your skills'],
    [!!P.linkedin.trim(), 'LinkedIn added', 'Add LinkedIn'],
    [any('projects'), 'Projects added', 'Add projects'],
    [any('languages'), 'Languages added', 'Add languages']
  ];
  const pct = Math.round(checks.filter(c => c[0]).length / checks.length * 100);
  $('#qScore').textContent = pct + '%';
  $('#qBar').style.width = pct + '%';
  $('#qList').innerHTML = checks.map(c => `<li class="${c[0] ? 'ok' : 'no'}">${c[0] ? '✓' : '⚠'} ${esc(c[0] ? c[1] : c[2])}</li>`).join('');
}
const syncBanner = () => { $('#demoBanner').hidden = !state.demo; };

/* ---------- 10. TEMPLATES & DESIGN ---------- */
function thumbHTML(k) {
  const T = TEMPLATES[k], L = T.layout, lines = '<b></b><b></b><b></b><b></b>';
  if (L === 'sidebar') return `<div class="th th-${k} th-sidebar" style="--tc:${T.tint}"><div class="th-side"><i class="ph"></i><b></b><b></b><b></b></div><div class="th-main"><em></em>${lines}<em></em>${lines}</div></div>`;
  if (L === 'band') return `<div class="th th-${k} th-band" style="--tc:${T.tint}"><div class="th-bandbar"><em></em><i class="ph"></i></div><div class="th-main">${lines}<em></em>${lines}</div></div>`;
  return `<div class="th th-${k} th-single" style="--tc:${T.tint}"><div class="th-headline"><em></em><b></b></div><div class="th-main"><em></em>${lines}<em></em>${lines}</div></div>`;
}
function renderTemplateUI() {
  $('#tplGallery').innerHTML = [...TPL_KEYS, 'ats'].map(k => `<article class="tpl-card"><div class="thumbwrap">${thumbHTML(k)}</div>
    <h3>${esc(TEMPLATES[k].name)}</h3><p>${esc(TEMPLATES[k].note)}</p>
    <button type="button" class="btn sm" data-act="${k === 'ats' ? 'ats-on' : 'tpl-pick'}" data-key="${k}" data-go="1">${k === 'ats' ? 'Use ATS mode' : 'Use this template'}</button></article>`).join('');
  $('#presets').innerHTML = PRESETS.map((p, i) => `<button type="button" class="preset" data-act="preset" data-i="${i}" title="${esc(p.n)}" aria-label="Color preset ${esc(p.n)}" style="background:${p.p}"><i style="background:${p.a}"></i></button>`).join('');
  syncTplChips();
}
function syncTplChips() {
  $('#tplChips').innerHTML = TPL_KEYS.map(k => `<button type="button" class="tpl-chip" data-act="tpl-pick" data-key="${k}" aria-pressed="${state.meta.template === k}">${thumbHTML(k)}${esc(TEMPLATES[k].name)}</button>`).join('');
}
function pickTemplate(k, go) {
  if (!TPL_KEYS.includes(k)) return;
  state.meta.template = k; state.meta.ats = false; syncDesign();
  renderPreviewNow(); pushHistory(true); scheduleSave(); toast(`${TEMPLATES[k].name} template applied. Your content is unchanged.`);
  if (go) scrollToBuilder();
}
function syncDesign() { fillValues($('#designCard')); syncTplChips(); $('#atsHint').hidden = !state.meta.ats; }
const ensureFont = name => Promise.all([document.fonts.load(`400 14px '${name}'`), document.fonts.load(`700 14px '${name}'`)]).catch(() => {});
function scrollToBuilder() { $('#create').scrollIntoView({ behavior: 'smooth' }); }

/* ---------- 11. PDF & PRINT ---------- */
function fileBaseName() {
  const parts = state.personal.fullName.trim().split(/\s+/).filter(Boolean).map(p => p.replace(/[^\p{L}\p{N}-]/gu, '')).filter(Boolean);
  if (!parts.length) return 'My_CV';
  return (parts.length > 1 ? `${parts[0]}_${parts[parts.length - 1]}` : parts[0]) + '_CV';
}
async function downloadPDF() {
  if (!window.html2canvas || !window.jspdf) { toast('The PDF library could not load. Check your internet connection and try again.', 'error'); return; }
  if (!state.personal.fullName.trim()) toast('Tip: add your name so the file is named correctly.', 'error');
  const busy = $('#busy'); busy.hidden = false;
  let stage;
  try {
    renderPreviewNow();
    await document.fonts.ready;
    stage = document.createElement('div'); stage.className = 'pdf-stage cv-pages raw';
    stage.innerHTML = $('#cvPages').innerHTML; document.body.appendChild(stage);
    await new Promise(r => setTimeout(r, 60));
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    pdf.setProperties({ title: (state.personal.fullName.trim() || 'My') + ' – CV', creator: 'CVForge' });
    const scale = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 2 : 3;
    const pages = $$('.cv-page', stage);
    for (let i = 0; i < pages.length; i++) {
      const pg = pages[i];
      const canvas = await window.html2canvas(pg, { scale, useCORS: true, backgroundColor: '#ffffff', logging: false, width: PAGE_W, height: PAGE_H, windowWidth: PAGE_W, scrollX: 0, scrollY: 0 });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      const pr = pg.getBoundingClientRect();                       // keep links clickable
      $$('a[href]', pg).forEach(a => {
        const r = a.getBoundingClientRect();
        pdf.link((r.left - pr.left) * 210 / PAGE_W, (r.top - pr.top) * 297 / PAGE_H, r.width * 210 / PAGE_W, r.height * 297 / PAGE_H, { url: a.href });
      });
      canvas.width = canvas.height = 0;                            // free memory
    }
    pdf.save(fileBaseName() + '.pdf');
    toast('PDF generated successfully.');
  } catch (err) {
    console.error(err); toast('Could not generate the PDF. Try Print → Save as PDF instead.', 'error');
  } finally { stage?.remove(); busy.hidden = true; }
}
function printCV() {
  renderPreviewNow();
  const old = document.title; document.title = fileBaseName();      // becomes the default "Save as PDF" name
  const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  setTimeout(() => window.print(), 50);
}
function togglePreview(force) {
  const p = $('#previewPane'), on = force ?? !p.classList.contains('full');
  p.classList.toggle('full', on); document.body.classList.toggle('no-scroll', on);
  setTimeout(fitPreview, 30);
  if (on) $('#closePreview').focus();
}

/* ---------- 12. IMPORT / EXPORT / RESET ---------- */
function exportData() {
  const payload = { app: 'CVForge', version: 1, exportedAt: new Date().toISOString(), data: state };
  download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), fileBaseName().replace(/_CV$/, '') + '_CVForge_data.json');
  toast('CV data exported.');
}
async function importData(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('That file is too large to be CV data.', 'error'); return; }
  let next;
  try { const obj = JSON.parse(await file.text()); next = normalize(obj?.data || obj); }
  catch { toast('That file is not valid CVForge data.', 'error'); return; }
  if (hasContent() && !await confirmDialog({ title: 'Import CV data?', message: 'This replaces the CV you are editing. You can undo it with Ctrl+Z.', confirm: 'Import', danger: false })) return;
  state = next; next.demo = false; resetUI(); await restorePhoto(); renderAll(); pushHistory(true); scheduleSave(); toast('CV data imported.');
}
async function newCV() {
  if (!await confirmDialog({ title: 'Start a new CV?', message: 'Are you sure you want to start a new CV? Your current CV will be cleared (you can still undo with Ctrl+Z).', confirm: 'Start New' })) return;
  const meta = state.meta, b = blankState(); b.meta = { ...meta, refsOnRequest: false };
  state = b; photoImg = null; resetUI(); renderAll(); pushHistory(true); scheduleSave(); toast('New CV started.');
}
async function clearAll() {
  if (!await confirmDialog({ title: 'Clear all data?', message: 'This erases your CV, photo and settings from this browser. Export a backup first if you might need it.', confirm: 'Clear All Data' })) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  state = blankState(); photoImg = null; H.stack = []; H.idx = -1; resetUI(); renderAll(); pushHistory(true);
  setSaveStatus('saved', 'Nothing saved yet'); toast('All data cleared.');
}
async function loadSample() {
  if (hasContent() && !await confirmDialog({ title: 'Load the sample CV?', message: 'This replaces the CV you are editing with fictional demo data. You can undo it with Ctrl+Z.', confirm: 'Load Sample', danger: false })) return;
  const s = blankState(); s.demo = true; s.meta = { ...state.meta };
  Object.assign(s.personal, { fullName: 'Alex Morgan', title: 'Full-Stack Web Developer', email: 'alex.morgan@example.com', phone: '+1 555 010 0199', address: 'Springfield, Sample Country', dob: '1996-04-12', nationality: 'Sample Nationality', website: 'alexmorgan.example.com', linkedin: 'linkedin.com/in/alex-morgan-sample', github: 'github.com/alex-morgan-sample' });
  s.summary = 'Full-stack developer with five years of experience building fast, accessible web applications for small businesses and startups. Comfortable owning a feature from idea to release, writing tests, and explaining technical trade-offs to non-technical teammates.\n(Sample text: replace with your own.)';
  const mk = (k, arr) => arr.map(o => cleanItem(k, o));
  s.education = mk('education', [{ degree: 'BSc Computer Science', institution: 'Springfield State University (sample)', location: 'Springfield', start: '2015', end: '2019', grade: 'GPA 3.7 / 4.0', desc: 'Final-year project: an accessible timetable planner for students.' }]);
  s.experience = mk('experience', [
    { title: 'Senior Web Developer', company: 'Northwind Digital (sample company)', location: 'Remote', start: 'Mar 2022', current: true, duties: 'Lead a team of four building customer-facing web apps\nDesign REST APIs and review pull requests\nMentor junior developers and run weekly code clinics', achievements: 'Cut page load time by 42% by introducing code splitting\nLaunched a self-service portal used by 12,000 customers' },
    { title: 'Web Developer', company: 'Bright Path Studio (sample company)', location: 'Springfield', start: 'Jun 2019', end: 'Feb 2022', duties: 'Built responsive websites for 20+ local clients\nIntegrated payment and booking systems\nImproved accessibility to WCAG AA on all new projects' }]);
  s.skills = mk('skills', [['JavaScript', 'Expert'], ['HTML & CSS', 'Expert'], ['React', 'Advanced'], ['Python', 'Advanced'], ['SQL', 'Intermediate'], ['Communication', 'Advanced'], ['Problem Solving', 'Advanced'], ['Leadership', 'Intermediate']].map(([name, level]) => ({ name, level })));
  s.projects = mk('projects', [{ name: 'Timetable Planner', desc: 'Open-source planner that helps students build clash-free timetables.', tech: 'React, Node.js, PostgreSQL', url: 'timetable.example.com', github: 'github.com/alex-morgan-sample/timetable' }, { name: 'Recipe Box', desc: 'Offline-first recipe manager with shopping lists.', tech: 'JavaScript, IndexedDB' }]);
  s.certifications = mk('certifications', [{ name: 'Web Accessibility Specialist (sample)', org: 'Sample Institute', date: 'Mar 2023', credId: 'SAMPLE-1234' }, { name: 'Cloud Fundamentals (sample)', org: 'Sample Cloud Academy', date: 'Nov 2021' }]);
  s.languages = mk('languages', [{ name: 'English', speaking: 'Native', reading: 'Native', writing: 'Native' }, { name: 'Spanish', speaking: 'Intermediate', reading: 'Advanced', writing: 'Intermediate' }]);
  s.interests = mk('interests', ['Hiking', 'Photography', 'Open source', 'Chess'].map(name => ({ name })));
  s.references = mk('references', [{ name: 'Jamie Rivera (sample)', position: 'Engineering Manager', org: 'Northwind Digital', email: 'jamie.rivera@example.com', phone: '+1 555 010 0123' }]);
  s.meta.refsOnRequest = false;
  const c = cleanItem('custom', { title: 'Achievements', content: '- Speaker at a regional web meetup (2023)\n- Winner, Sample Hack Weekend (2020)' });
  s.custom = [c]; s.order.push('c_' + c.id);
  s.photo.src = s.photo.out = sampleAvatar();
  state = normalize(s); state.demo = true;
  resetUI(); await restorePhoto(); renderAll(); pushHistory(true); scheduleSave(); toast('Sample CV loaded. This is demo data.');
}

/* ---------- 13. ACTIONS & EVENTS ---------- */
const ACTIONS = {
  create() { scrollToBuilder(); setTimeout(() => $('#p-fullName')?.focus({ preventScroll: true }), 500); },
  save() { saveNow(true); },
  preview() { togglePreview(); },
  'close-preview'() { togglePreview(false); },
  download() { downloadPDF(); },
  print() { printCV(); },
  newcv() { newCV(); },
  undo() { stepHistory(-1); },
  redo() { stepHistory(1); },
  sample() { loadSample(); },
  export() { exportData(); },
  import() { $('#importFile').click(); },
  'clear-all'() { clearAll(); },
  'collapse-all'() { ui.collapsed = new Set(state.order); $$('.sec', ed).forEach(c => { if (!$('.sec-body', c).hidden) toggleSection(c.dataset.key); }); },
  toggle(b) { toggleSection(b.dataset.key); },
  'sec-up'(b) { moveSection(b.dataset.key, -1); },
  'sec-down'(b) { moveSection(b.dataset.key, 1); },
  'sec-del'(b) { deleteSection(b.dataset.key); },
  'sec-add'(b) { addSection(b.dataset.key); },
  'custom-add'() { addCustom(); },
  add(b) { addItem(b.dataset.sec); },
  'item-del'(b) { removeItem(b.dataset.sec, b.dataset.id); },
  'item-up'(b) { moveItem(b.dataset.sec, b.dataset.id, -1); },
  'item-down'(b) { moveItem(b.dataset.sec, b.dataset.id, 1); },
  'item-edit'(b) { toggleItem(b.dataset.id); },
  'int-add'() { addInterest(); },
  'clear-field'(b) { const el = $('#' + b.dataset.target); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); el.focus(); },
  'photo-upload'() { $('#photoFile').click(); },
  'photo-remove'() { removePhoto(); },
  'sum-use'(b) {
    state.summary = (SUMMARIES[ui.profession] || SUMMARIES.Other)[Number(b.dataset.i)] || '';
    const t = $('#sumText'); t.value = state.summary; updateSummaryCount(); typed(); toast('Suggestion added. Edit it to match your story.');
  },
  'sum-clear'() { state.summary = ''; $('#sumText').value = ''; updateSummaryCount(); typed(); },
  'tpl-pick'(b) { pickTemplate(b.dataset.key, !!b.dataset.go); },
  'ats-on'(b) { state.meta.ats = true; syncDesign(); renderPreviewNow(); pushHistory(true); scheduleSave(); toast('ATS-friendly mode on.'); if (b.dataset.go) scrollToBuilder(); },
  preset(b) { const p = PRESETS[Number(b.dataset.i)]; Object.assign(state.meta, { primary: p.p, accent: p.a, text: p.t }); syncDesign(); renderPreviewNow(); pushHistory(true); scheduleSave(); }
};

function bindEvents() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const fn = ACTIONS[b.dataset.act];
    if (!fn) return;
    if (b.tagName === 'A' && b.dataset.act === 'create') e.preventDefault();
    $('#navMenu').classList.remove('open'); $('.nav-toggle').setAttribute('aria-expanded', 'false');
    fn(b, e);
  });
  document.addEventListener('input', e => { if (e.target.closest('#editorPane')) onInput(e); });
  $('#intInput')?.addEventListener('keydown', () => {});
  ed.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'intInput') { e.preventDefault(); addInterest(); } });
  document.addEventListener('change', e => {
    if (e.target.id === 'photoFile') { loadPhotoFile(e.target.files[0]); e.target.value = ''; }
    if (e.target.id === 'importFile') { importData(e.target.files[0]); e.target.value = ''; }
  });
  bindSectionDnD(); bindPhotoInteraction();

  // Drag a photo file straight onto the photo frame
  ed.addEventListener('dragover', e => { if (e.dataTransfer?.types?.includes('Files') && e.target.closest('#photoStage')) e.preventDefault(); });
  ed.addEventListener('drop', e => { const f = e.dataTransfer?.files?.[0]; if (f && e.target.closest('#photoStage')) { e.preventDefault(); loadPhotoFile(f); } });

  document.addEventListener('keydown', e => {
    if ($('#modal').hidden === false) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); stepHistory(-1); }
    else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); stepHistory(1); }
    else if (mod && k === 's') { e.preventDefault(); saveNow(true); }
    else if (e.key === 'Escape' && $('#previewPane').classList.contains('full')) togglePreview(false);
  });

  const nt = $('.nav-toggle');
  nt.addEventListener('click', () => { const o = $('#navMenu').classList.toggle('open'); nt.setAttribute('aria-expanded', String(o)); nt.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); });
  $('#navMenu').addEventListener('click', e => { if (e.target.closest('a')) { $('#navMenu').classList.remove('open'); nt.setAttribute('aria-expanded', 'false'); } });
  new ResizeObserver(fitPreview).observe($('#previewScroll'));
  window.addEventListener('pagehide', () => { flushHistory(); saveNow(false); });
  window.addEventListener('beforeprint', renderPreviewNow);
}

function renderAll() {
  syncDesign(); renderEditor(); renderPreviewNow(); renderQuality(); syncBanner(); updateUndoButtons();
}

/* ---------- 14. INIT ---------- */
function init() {
  const saved = loadSaved();
  state = saved || blankState();
  if (saved && hasContent()) {
    $('#heroStart').textContent = 'Continue Editing';
    $('#restoredNote').hidden = false;
  }
  resetUI(); renderTemplateUI(); bindEvents(); renderAll();
  pushHistory(true);
  if (saved) setSaveStatus('saved', 'Auto Saved');
  restorePhoto();
  ensureFont(state.meta.font).then(() => document.fonts.ready).then(renderPreviewNow);
}
init();
})();