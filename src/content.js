/**
 * mdREADER v8 — Abricot Labs
 * Rendu : marked (GFM) + DOMPurify + highlight.js, tout embarqué (aucun appel réseau).
 */
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedFootnote from 'marked-footnote';
import markedAlert from 'marked-alert';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import css from './styles.css';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import shell from 'highlight.js/lib/languages/shell';
import python from 'highlight.js/lib/languages/python';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import cssLang from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import ini from 'highlight.js/lib/languages/ini';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import nginx from 'highlight.js/lib/languages/nginx';
import powershell from 'highlight.js/lib/languages/powershell';
import csharp from 'highlight.js/lib/languages/csharp';
import ruby from 'highlight.js/lib/languages/ruby';
import lua from 'highlight.js/lib/languages/lua';

Object.entries({
  javascript, typescript, json, bash, shell, python, yaml, xml, css: cssLang, sql, markdown,
  diff, dockerfile, ini, go, rust, php, java, c, cpp, nginx, powershell, csharp, ruby, lua
}).forEach(([name, def]) => hljs.registerLanguage(name, def));

(async function () {
  'use strict';

  // --- Garde : on ne traite que les documents texte brut (un seul <pre>) ---
  const b0 = document.body;
  if (!b0 || b0.children.length !== 1 || b0.firstElementChild.tagName !== 'PRE') return;
  if (document.documentElement.hasAttribute('data-mdreader')) return;
  const norm = (s) => s.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  let current = norm(b0.firstElementChild.textContent || '');
  if (!current.trim()) return;

  // --- Réglages (chrome.storage si dispo, sinon localStorage) ---
  const hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  const DEFAULTS = { theme: null, sidebar: null, breaks: true, live: true };
  let settings = { ...DEFAULTS };
  try {
    if (hasChrome) settings = { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
    else settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('mdreader-settings') || '{}') };
  } catch (e) { /* valeurs par défaut */ }
  function save(patch) {
    Object.assign(settings, patch);
    try {
      if (hasChrome) chrome.storage.local.set(patch);
      else localStorage.setItem('mdreader-settings', JSON.stringify(settings));
    } catch (e) { /* ignoré */ }
  }

  // --- Markdown -> HTML sûr ---
  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const marked = new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      emptyLangClass: 'hljs',
      highlight(code, lang) {
        try {
          if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        } catch (e) { /* repli */ }
        return escapeHtml(code);
      }
    }),
    markedAlert(),
    markedFootnote()
  );

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^https?:/i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy');
  });
  const URI_RE = /^(?:(?:https?|ftps?|file|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

  function parseFrontmatter(src) {
    const meta = {};
    const m = src.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
    if (!m) return { meta, body: src };
    m[1].split('\n').forEach((line) => {
      const kv = line.match(/^([A-Za-z_][\w.:-]*):\s*(.*?)\s*$/);
      if (kv) meta[kv[1].toLowerCase().replace(/^dc[.:_]/, '')] = kv[2].replace(/^(["'])(.*)\1$/, '$2');
    });
    return { meta, body: src.slice(m[0].length) };
  }

  function renderHtml(src) {
    const dirty = marked.parse(src, { async: false, gfm: true, breaks: !!settings.breaks });
    return DOMPurify.sanitize(dirty, { ALLOWED_URI_REGEXP: URI_RE });
  }

  const slugify = (s) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';

  const mk = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = mk('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      ta.remove();
    });
  }

  // Ids de titres, ancres, blocs de code, tableaux. Retourne la liste des titres (h1–h3) pour le sommaire.
  function postprocess(article) {
    const used = new Set();
    const headings = [];
    article.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      if (h.classList.contains('sr-only')) return;
      const text = h.textContent.trim();
      const base = slugify(text);
      let id = base, n = 1;
      while (used.has(id)) id = base + '-' + (++n);
      used.add(id);
      h.id = id;
      const level = +h.tagName[1];
      if (level <= 3) headings.push({ level, text, id });
      if (level >= 2 && level <= 4) {
        const a = mk('a', 'anchor', '#');
        a.setAttribute('href', '#' + id);
        a.setAttribute('aria-hidden', 'true');
        h.prepend(a);
      }
    });

    article.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      if (!code) return;
      const lang = ((code.className.match(/language-([^\s]+)/) || [])[1] || '').toLowerCase();
      const wrap = mk('div', 'codeblock');
      const head = mk('div', 'code-head');
      head.append(mk('span', 'dots'), mk('span', 'code-lang', lang), mk('button', 'copy-btn', 'Copier'));
      pre.replaceWith(wrap);
      wrap.append(head, pre);
    });

    article.querySelectorAll('table').forEach((t) => {
      const w = mk('div', 'table-wrap');
      t.replaceWith(w);
      w.append(t);
    });
    return headings;
  }

  // --- Construction de la page ---
  const fontBase = hasChrome && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('fonts/') : './fonts/';
  let fileName = 'document.md';
  try { fileName = decodeURIComponent(location.pathname.split('/').pop()) || fileName; } catch (e) { /* brut */ }

  document.documentElement.setAttribute('data-mdreader', '8');
  document.documentElement.replaceChildren();
  const head = mk('head');
  head.innerHTML = '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">';
  head.appendChild(mk('title'));
  const style = mk('style');
  style.textContent = css.replace(/__FONT_BASE__/g, fontBase);
  head.appendChild(style);
  document.documentElement.appendChild(head);

  const body = mk('body');
  body.innerHTML = `
    <header class="header">
      <button class="btn" id="sidebarToggle" title="Sommaire" aria-label="Sommaire">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </button>
      <div class="brand"><span class="brand-name">mdREADER</span><span class="brand-sub">Abricot Labs</span></div>
      <div class="header-divider"></div>
      <div class="doc-info">
        <div class="doc-title" id="docTitle"></div>
        <div class="doc-meta">
          <span>Fichier : <span class="value" id="docFile"></span></span>
          <span id="docAuthorWrap" hidden>Auteur : <span class="value" id="docAuthor"></span></span>
        </div>
      </div>
      <div class="header-actions">
        <button class="meta-btn" id="metaToggle" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>Infos</span>
        </button>
        <div class="theme-switch">
          <button class="theme-btn" id="darkBtn" title="Sombre" aria-label="Thème sombre"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
          <button class="theme-btn" id="lightBtn" title="Clair" aria-label="Thème clair"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></button>
        </div>
      </div>
    </header>
    <div class="meta-bar" id="metaBar">
      <div class="meta-item"><span class="meta-label">Lecture</span><span class="meta-value" id="statTime"></span></div>
      <div class="meta-item"><span class="meta-label">Mots</span><span class="meta-value" id="statWords"></span></div>
      <button class="chip" id="breaksChip" title="Un retour à la ligne simple devient un saut de ligne">Sauts de ligne</button>
      <button class="chip" id="liveChip" title="Recharge le rendu quand le fichier change">Actualisation auto</button>
    </div>
    <div class="progress-bar" id="progressBar"></div>
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header"><div class="sidebar-title">Sommaire</div></div>
        <nav class="toc" id="toc"></nav>
      </aside>
      <main class="content"><article class="markdown-body" id="article"></article></main>
    </div>
    <footer class="footer">
      <a href="https://github.com/cheezelcom/mdreader" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        mdREADER v8 · GitHub
      </a>
    </footer>`;
  document.documentElement.appendChild(body);

  const $ = (id) => document.getElementById(id);
  const article = $('article');
  const toc = $('toc');
  let tocLinks = new Map();
  let headingEls = [];

  // --- Rendu / mise à jour ---
  function update() {
    const y = window.scrollY;
    const { meta, body: src } = parseFrontmatter(current);
    article.innerHTML = renderHtml(src);
    const headings = postprocess(article);

    const h1 = headings.find((h) => h.level === 1);
    const title = meta.title || (h1 && h1.text) || fileName.replace(/\.(md|markdown|mdown|mkd)$/i, '');
    document.title = title + ' – mdREADER';
    $('docTitle').textContent = title;
    $('docFile').textContent = fileName;
    const author = meta.author || meta.creator || '';
    $('docAuthor').textContent = author;
    $('docAuthorWrap').hidden = !author;

    const words = (article.textContent.trim().match(/\S+/g) || []).length;
    $('statWords').textContent = words.toLocaleString('fr-FR');
    $('statTime').textContent = Math.max(1, Math.ceil(words / 200)) + ' min';

    toc.replaceChildren();
    tocLinks = new Map();
    if (!headings.length) {
      toc.appendChild(mk('p', 'toc-empty', 'Aucun titre'));
    } else {
      const ul = mk('ul');
      headings.forEach((h) => {
        const li = mk('li', 'toc-level-' + h.level);
        const a = mk('a', null, h.text);
        a.setAttribute('href', '#' + h.id);
        li.appendChild(a);
        ul.appendChild(li);
        tocLinks.set(h.id, a);
      });
      toc.appendChild(ul);
    }
    headingEls = headings.map((h) => document.getElementById(h.id)).filter(Boolean);
    window.scrollTo({ top: y, behavior: 'instant' });
    onScroll();
  }

  // --- Thème ---
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  function applyTheme() {
    const t = settings.theme || (mq.matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', t);
    $('darkBtn').classList.toggle('active', t === 'dark');
    $('lightBtn').classList.toggle('active', t === 'light');
  }
  $('darkBtn').addEventListener('click', () => { save({ theme: 'dark' }); applyTheme(); });
  $('lightBtn').addEventListener('click', () => { save({ theme: 'light' }); applyTheme(); });
  mq.addEventListener('change', () => { if (!settings.theme) applyTheme(); });
  applyTheme();

  // --- Sidebar, infos, options ---
  const narrow = () => window.innerWidth <= 900;
  function applySidebar() { document.body.classList.toggle('sidebar-hidden', !settings.sidebarOpen); }
  settings.sidebarOpen = settings.sidebar != null && !narrow() ? settings.sidebar : !narrow();
  applySidebar();
  $('sidebarToggle').addEventListener('click', () => {
    settings.sidebarOpen = !settings.sidebarOpen;
    if (!narrow()) save({ sidebar: settings.sidebarOpen });
    applySidebar();
  });

  $('metaToggle').addEventListener('click', function () {
    const open = $('metaBar').classList.toggle('open');
    document.body.classList.toggle('meta-open', open);
    this.classList.toggle('active', open);
    this.setAttribute('aria-expanded', String(open));
    onScroll();
  });

  function syncChips() {
    $('breaksChip').classList.toggle('on', !!settings.breaks);
    $('liveChip').classList.toggle('on', !!settings.live);
    $('breaksChip').setAttribute('aria-pressed', String(!!settings.breaks));
    $('liveChip').setAttribute('aria-pressed', String(!!settings.live));
  }
  $('breaksChip').addEventListener('click', () => { save({ breaks: !settings.breaks }); syncChips(); update(); });
  $('liveChip').addEventListener('click', () => { save({ live: !settings.live }); syncChips(); settings.live ? startLive() : stopLive(); });
  syncChips();

  // --- Navigation interne ---
  function scrollToId(raw) {
    let id = raw;
    try { id = decodeURIComponent(raw); } catch (e) { /* brut */ }
    const t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function onAnchorClick(e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    scrollToId(href.slice(1));
    try { history.replaceState(null, '', href); } catch (err) { /* ignoré */ }
    if (a.closest('.toc') && narrow()) { settings.sidebarOpen = false; applySidebar(); }
  }
  article.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (btn) {
      const code = btn.closest('.codeblock').querySelector('pre');
      copyText(code.textContent).then(
        () => { btn.textContent = 'Copié ✓'; setTimeout(() => (btn.textContent = 'Copier'), 1500); },
        () => { btn.textContent = 'Échec'; setTimeout(() => (btn.textContent = 'Copier'), 1500); }
      );
      return;
    }
    onAnchorClick(e);
  });
  toc.addEventListener('click', onAnchorClick);

  // --- Progression + section active ---
  let ticking = false, activeId = null;
  function onScroll() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    $('progressBar').style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    const topOffset = 120;
    let cur = null;
    for (const el of headingEls) {
      if (el.getBoundingClientRect().top <= topOffset) cur = el.id; else break;
    }
    if (cur !== activeId) {
      if (activeId && tocLinks.get(activeId)) tocLinks.get(activeId).classList.remove('active');
      activeId = cur;
      const a = cur && tocLinks.get(cur);
      if (a) { a.classList.add('active'); a.scrollIntoView({ block: 'nearest' }); }
    }
  }
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });


  // --- Actualisation automatique ---
  let timer = null, busy = false, failures = 0;
  async function poll() {
    if (document.hidden || busy) return;
    busy = true;
    try {
      const r = await fetch(location.href, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const t = norm(await r.text());
      failures = 0;
      if (t !== current) { current = t; update(); }
    } catch (e) {
      if (++failures >= 5) { stopLive(); $('liveChip').title = 'Actualisation indisponible (accès aux fichiers non autorisé ?)'; }
    } finally { busy = false; }
  }
  function startLive() { stopLive(); failures = 0; timer = setInterval(poll, 1000); }
  function stopLive() { if (timer) clearInterval(timer); timer = null; }

  update();
  if (location.hash) setTimeout(() => scrollToId(location.hash.slice(1)), 50);
  if (settings.live) startLive();
})();
