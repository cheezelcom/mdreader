/**
 * mdREADER v6.0 - Abricot Labs
 * Fixes: boutons fonctionnels, print light mode, perfectionnement UI
 */

(function() {
  'use strict';

  const pre = document.querySelector('pre');
  const rawContent = pre ? pre.textContent : document.body.innerText || document.body.textContent;
  
  if (!rawContent || rawContent.trim().length < 10) return;

  const fileName = decodeURIComponent(window.location.pathname.split('/').pop()) || 'document.md';

  // === MARKDOWN PARSER ===
  function parseMarkdown(md) {
    return md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
      .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>')
      .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/<li>\[ \] /g, '<li class="task"><input type="checkbox" disabled> ')
      .replace(/<li>\[x\] /gi, '<li class="task"><input type="checkbox" checked disabled> ')
      .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<\/blockquote>\n<blockquote>/g, '\n');
  }

  let title = 'Document';
  const titleMatch = rawContent.match(/^#\s+(.+)$/m);
  if (titleMatch) title = titleMatch[1].trim();

  function generateTOC(content) {
    const headings = [];
    const regex = /^(#{1,3})\s+(.+)$/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      headings.push({ 
        level: match[1].length, 
        text: match[2].trim(), 
        id: match[2].trim().toLowerCase().replace(/[^\w]+/g, '-') 
      });
    }
    if (headings.length === 0) return '<p class="toc-empty">Aucun titre</p>';
    return '<ul>' + headings.map(h => 
      `<li class="toc-level-${h.level}"><a href="#${h.id}">${h.text}</a></li>`
    ).join('') + '</ul>';
  }

  const wordCount = rawContent.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  let htmlContent = parseMarkdown(rawContent);
  htmlContent = htmlContent.replace(/<h([1-6])>(.+?)<\/h[1-6]>/g, (m, l, t) => {
    const id = t.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]+/g, '-');
    return `<h${l} id="${id}">${t}</h${l}>`;
  });

  const toc = generateTOC(rawContent);

  // === CLEAR & REBUILD ===
  while (document.documentElement.firstChild) {
    document.documentElement.removeChild(document.documentElement.firstChild);
  }

  const head = document.createElement('head');
  head.innerHTML = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - mdREADER</title>
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg-primary: #0a0a0b;
        --bg-secondary: #111113;
        --bg-elevated: #18181b;
        --bg-header: #0d0d0e;
        --text-primary: #fafafa;
        --text-secondary: #a1a1aa;
        --text-muted: #71717a;
        --accent: #f97316;
        --accent-light: #fb923c;
        --accent-dim: rgba(249, 115, 22, 0.12);
        --border: #27272a;
        --code-bg: #1c1c1f;
      }

      .light {
        --bg-primary: #ffffff;
        --bg-secondary: #f9f9f9;
        --bg-elevated: #ffffff;
        --bg-header: #ffffff;
        --text-primary: #111111;
        --text-secondary: #444444;
        --text-muted: #888888;
        --border: #e5e5e5;
        --code-bg: #f5f5f5;
        --accent-dim: rgba(249, 115, 22, 0.08);
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }
      html { scroll-behavior: smooth; }

      body {
        font-family: 'Newsreader', Georgia, serif;
        background: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.7;
        font-size: 18px;
        -webkit-font-smoothing: antialiased;
        transition: background 0.25s ease, color 0.25s ease;
      }

      /* === HEADER === */
      .header {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 60px;
        background: var(--bg-header);
        border-bottom: 1px solid var(--border);
        z-index: 1000;
        display: flex;
        align-items: center;
        padding: 0 20px;
        gap: 14px;
        transition: background 0.25s ease, border-color 0.25s ease;
      }

      .header::before {
        content: 'ABRICOT LABS';
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Instrument Sans', sans-serif;
        font-size: 72px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: var(--accent);
        opacity: 0.035;
        pointer-events: none;
        white-space: nowrap;
      }

      .btn {
        width: 36px; height: 36px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        transition: all 0.15s ease;
        flex-shrink: 0;
      }

      .btn:hover {
        background: var(--accent-dim);
        color: var(--accent);
        border-color: var(--accent);
      }

      .btn svg { width: 18px; height: 18px; pointer-events: none; }

      .brand {
        display: flex;
        flex-direction: column;
        gap: 0;
        flex-shrink: 0;
      }

      .brand-name {
        font-family: 'Instrument Sans', sans-serif;
        font-weight: 700;
        font-size: 15px;
        color: var(--accent);
        letter-spacing: -0.01em;
        line-height: 1.1;
      }

      .brand-sub {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 9px;
        color: var(--text-muted);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .header-divider {
        width: 1px;
        height: 28px;
        background: var(--border);
        flex-shrink: 0;
      }

      .doc-info {
        flex: 1;
        min-width: 0;
        padding-right: 12px;
      }

      .doc-title {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
      }

      .doc-title span { color: var(--text-muted); font-weight: 400; }

      .doc-filename {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--text-muted);
        line-height: 1.2;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      /* Meta toggle button */
      .meta-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 12px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-family: 'Instrument Sans', sans-serif;
        font-size: 11px;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .meta-btn:hover, .meta-btn.active {
        background: var(--accent-dim);
        border-color: var(--accent);
        color: var(--accent);
      }

      .meta-btn svg { width: 14px; height: 14px; pointer-events: none; }

      /* Theme switch */
      .theme-switch {
        display: flex;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 3px;
      }

      .theme-btn {
        width: 28px; height: 28px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }

      .theme-btn:hover { color: var(--text-primary); }
      .theme-btn.active { background: var(--accent); color: #fff; }
      .theme-btn svg { width: 14px; height: 14px; pointer-events: none; }

      /* === META BAR === */
      .meta-bar {
        position: fixed;
        top: 60px; left: 0; right: 0;
        height: 0;
        background: var(--bg-secondary);
        border-bottom: 1px solid transparent;
        overflow: hidden;
        transition: height 0.2s ease, border-color 0.2s ease;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 40px;
      }

      .meta-bar.open { 
        height: 44px; 
        border-color: var(--border);
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .meta-label {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .meta-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        color: var(--accent);
        font-weight: 500;
      }

      /* === PROGRESS === */
      .progress-bar {
        position: fixed;
        top: 60px; left: 0; right: 0;
        height: 2px;
        background: var(--accent);
        transform-origin: left;
        transform: scaleX(0);
        z-index: 998;
        transition: top 0.2s ease;
      }

      body.meta-open .progress-bar { top: 104px; }

      /* === LAYOUT === */
      .layout {
        display: flex;
        min-height: 100vh;
        padding-top: 60px;
        transition: padding-top 0.2s ease;
      }

      body.meta-open .layout { padding-top: 104px; }

      /* === SIDEBAR === */
      .sidebar {
        position: fixed;
        left: 0;
        top: 60px;
        width: 260px;
        height: calc(100vh - 60px);
        background: var(--bg-secondary);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        transform: translateX(0);
        transition: transform 0.25s ease, top 0.2s ease, height 0.2s ease, background 0.25s ease, border-color 0.25s ease;
        z-index: 100;
      }

      body.sidebar-hidden .sidebar { transform: translateX(-100%); }
      body.meta-open .sidebar { top: 104px; height: calc(100vh - 104px); }

      .sidebar-header {
        padding: 14px 18px;
        border-bottom: 1px solid var(--border);
      }

      .sidebar-title {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sidebar-title svg { width: 14px; height: 14px; color: var(--accent); }

      .toc {
        flex: 1;
        overflow-y: auto;
        padding: 10px 14px;
      }

      .toc ul { list-style: none; }
      .toc li { margin-bottom: 2px; }

      .toc a {
        display: block;
        color: var(--text-secondary);
        text-decoration: none;
        font-family: 'Instrument Sans', sans-serif;
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 6px;
        border-left: 2px solid transparent;
        transition: all 0.15s ease;
      }

      .toc a:hover {
        color: var(--text-primary);
        background: var(--accent-dim);
        border-left-color: var(--accent);
      }

      .toc-level-2 a { padding-left: 18px; font-size: 11px; }
      .toc-level-3 a { padding-left: 28px; font-size: 10px; color: var(--text-muted); }
      .toc-empty { color: var(--text-muted); font-size: 11px; font-style: italic; padding: 10px; }

      .sidebar-footer {
        padding: 12px 18px;
        border-top: 1px solid var(--border);
        display: flex;
        gap: 20px;
      }

      .stat { display: flex; flex-direction: column; gap: 1px; }
      .stat-label { font-family: 'Instrument Sans', sans-serif; font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
      .stat-value { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--accent); }

      /* === CONTENT === */
      .content {
        flex: 1;
        margin-left: 260px;
        padding: 40px 60px 60px;
        max-width: 820px;
        transition: margin-left 0.25s ease, max-width 0.25s ease;
      }

      body.sidebar-hidden .content { 
        margin-left: 0; 
        max-width: 720px; 
        margin-left: auto;
        margin-right: auto;
      }

      /* Typography */
      .markdown-body h1 { font-size: 2.2rem; font-weight: 400; line-height: 1.2; margin-bottom: 1.25rem; color: var(--text-primary); }
      .markdown-body h2 { font-size: 1.4rem; font-weight: 600; margin: 2rem 0 0.75rem; padding-top: 1.25rem; border-top: 1px solid var(--border); color: var(--text-primary); }
      .markdown-body h3 { font-size: 1.1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: var(--text-secondary); }
      .markdown-body h4, .markdown-body h5, .markdown-body h6 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--text-secondary); }
      .markdown-body p { margin-bottom: 1rem; color: var(--text-secondary); }
      .markdown-body a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s; }
      .markdown-body a:hover { border-bottom-color: var(--accent); }
      .markdown-body strong { color: var(--text-primary); font-weight: 600; }
      .markdown-body ul, .markdown-body ol { margin: 0.75rem 0; padding-left: 1.25rem; color: var(--text-secondary); }
      .markdown-body li { margin-bottom: 0.25rem; }
      .markdown-body li::marker { color: var(--accent); }
      .markdown-body code { font-family: 'JetBrains Mono', monospace; font-size: 0.8em; background: var(--code-bg); padding: 0.15em 0.3em; border-radius: 4px; color: var(--accent); }
      .markdown-body pre { background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 1rem 0; position: relative; }
      .markdown-body pre::before { content: ''; position: absolute; top: 10px; left: 12px; width: 7px; height: 7px; background: #ff5f57; border-radius: 50%; box-shadow: 12px 0 0 #febc2e, 24px 0 0 #28c840; }
      .markdown-body pre code { background: none; padding: 0; color: var(--text-secondary); display: block; padding-top: 0.5rem; font-size: 0.85em; }
      .markdown-body blockquote { border-left: 3px solid var(--accent); margin: 1rem 0; padding: 0.5rem 1rem; background: var(--accent-dim); border-radius: 0 6px 6px 0; }
      .markdown-body blockquote p { margin: 0; color: var(--text-primary); font-style: italic; }
      .markdown-body hr { border: none; height: 1px; background: var(--border); margin: 1.5rem 0; }
      .markdown-body img { max-width: 100%; border-radius: 6px; margin: 1rem 0; }

      /* === RESPONSIVE === */
      @media (max-width: 768px) {
        .header { padding: 0 12px; gap: 10px; }
        .header::before { font-size: 36px; }
        .brand-name { font-size: 14px; }
        .brand-sub { font-size: 8px; }
        .doc-title { font-size: 12px; }
        .meta-btn span { display: none; }
        .meta-btn { padding: 7px 10px; }
        .sidebar { width: 240px; box-shadow: 2px 0 12px rgba(0,0,0,0.2); }
        body:not(.sidebar-visible) .sidebar { transform: translateX(-100%); }
        body.sidebar-visible .sidebar { transform: translateX(0); }
        .content { margin-left: 0 !important; padding: 24px 16px; max-width: 100% !important; }
        .meta-bar { gap: 24px; }
      }

      /* === PRINT - LIGHT MODE FORCED === */
      @media print {
        @page { 
          size: A4; 
          margin: 18mm 15mm; 
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          --bg-primary: #ffffff !important;
          --bg-secondary: #f9f9f9 !important;
          --bg-elevated: #ffffff !important;
          --bg-header: #ffffff !important;
          --text-primary: #000000 !important;
          --text-secondary: #333333 !important;
          --text-muted: #666666 !important;
          --border: #cccccc !important;
          --code-bg: #f5f5f5 !important;
          --accent: #d35400 !important;
          background: white !important;
          color: black !important;
          font-size: 11pt !important;
        }

        .header {
          position: relative !important;
          height: auto !important;
          padding: 12px 0 !important;
          border-bottom: 2px solid var(--accent) !important;
          background: white !important;
        }

        .header::before { display: none !important; }
        .btn, .theme-switch, .meta-btn, .header-divider { display: none !important; }
        
        .brand {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .brand-name { font-size: 12px !important; color: var(--accent) !important; }
        .brand-sub { font-size: 7px !important; }
        
        .doc-info { padding: 0 !important; }
        .doc-title { font-size: 14pt !important; font-weight: 600 !important; color: black !important; }
        .doc-title span { display: none !important; }
        .doc-filename { font-size: 9pt !important; color: #666 !important; }

        .sidebar, .meta-bar, .progress-bar { display: none !important; }

        .layout { 
          padding-top: 0 !important; 
          display: block !important; 
        }

        .content {
          margin: 0 !important;
          padding: 20px 0 0 0 !important;
          max-width: 100% !important;
          width: 100% !important;
        }

        .markdown-body { 
          font-size: 11pt !important; 
          line-height: 1.5 !important; 
        }
        
        .markdown-body h1 { 
          font-size: 18pt !important; 
          margin-bottom: 12pt !important;
          page-break-after: avoid !important; 
          color: black !important;
        }
        
        .markdown-body h2 { 
          font-size: 14pt !important; 
          margin-top: 16pt !important;
          margin-bottom: 8pt !important;
          padding-top: 8pt !important;
          page-break-after: avoid !important; 
          border-top: 1px solid #ccc !important;
          color: black !important;
        }
        
        .markdown-body h3 { 
          font-size: 12pt !important; 
          margin-top: 12pt !important;
          page-break-after: avoid !important; 
          color: #333 !important;
        }
        
        .markdown-body p {
          color: black !important;
          orphans: 3 !important;
          widows: 3 !important;
        }
        
        .markdown-body pre { 
          font-size: 9pt !important; 
          white-space: pre-wrap !important; 
          word-wrap: break-word !important;
          border: 1px solid #ddd !important;
          page-break-inside: avoid !important;
        }
        
        .markdown-body pre::before { display: none !important; }
        
        .markdown-body code {
          color: #333 !important;
          background: #f0f0f0 !important;
        }
        
        .markdown-body a { 
          color: #333 !important; 
          text-decoration: underline !important; 
        }
        
        .markdown-body blockquote {
          border-left: 2px solid #999 !important;
          background: #f9f9f9 !important;
          page-break-inside: avoid !important;
        }
        
        .markdown-body img { 
          max-width: 100% !important; 
          page-break-inside: avoid !important; 
        }
        
        .markdown-body ul, .markdown-body ol {
          color: black !important;
        }
        
        .markdown-body li::marker {
          color: #666 !important;
        }
      }
    </style>
  `;
  document.documentElement.appendChild(head);

  const body = document.createElement('body');
  body.innerHTML = `
    <header class="header">
      <button class="btn" id="sidebarToggle" title="Sommaire">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="15" y2="12"/>
          <line x1="3" y1="18" x2="18" y2="18"/>
        </svg>
      </button>
      
      <div class="brand">
        <span class="brand-name">mdREADER</span>
        <span class="brand-sub">Abricot Labs</span>
      </div>
      
      <div class="header-divider"></div>
      
      <div class="doc-info">
        <div class="doc-title"><span>Vous consultez </span>${title}</div>
        <div class="doc-filename">${fileName}</div>
      </div>
      
      <div class="header-actions">
        <button class="meta-btn" id="metaToggle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>Infos</span>
        </button>
        
        <div class="theme-switch">
          <button class="theme-btn" id="darkBtn" title="Sombre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <button class="theme-btn" id="lightBtn" title="Clair">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
    
    <div class="meta-bar" id="metaBar">
      <div class="meta-item">
        <span class="meta-label">Lecture</span>
        <span class="meta-value">${readingTime} min</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Mots</span>
        <span class="meta-value">${wordCount.toLocaleString()}</span>
      </div>
    </div>
    
    <div class="progress-bar" id="progressBar"></div>
    
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Sommaire
          </div>
        </div>
        <nav class="toc">${toc}</nav>
        <div class="sidebar-footer">
          <div class="stat">
            <span class="stat-label">Lecture</span>
            <span class="stat-value">${readingTime} min</span>
          </div>
          <div class="stat">
            <span class="stat-label">Mots</span>
            <span class="stat-value">${wordCount.toLocaleString()}</span>
          </div>
        </div>
      </aside>
      
      <main class="content">
        <article class="markdown-body">${htmlContent}</article>
      </main>
    </div>
  `;
  document.documentElement.appendChild(body);

  // === SCRIPTS ===
  
  // Theme
  function setTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
    document.getElementById('darkBtn').classList.toggle('active', theme === 'dark');
    document.getElementById('lightBtn').classList.toggle('active', theme === 'light');
    try { localStorage.setItem('mdreader-theme', theme); } catch(e) {}
  }
  
  document.getElementById('darkBtn').addEventListener('click', function() { setTheme('dark'); });
  document.getElementById('lightBtn').addEventListener('click', function() { setTheme('light'); });
  
  // Load saved theme
  var savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('mdreader-theme') || 'dark'; } catch(e) {}
  setTheme(savedTheme);

  // Sidebar toggle
  var sidebarVisible = window.innerWidth > 768;
  
  function updateSidebar() {
    document.body.classList.toggle('sidebar-hidden', !sidebarVisible);
    document.body.classList.toggle('sidebar-visible', sidebarVisible);
  }
  
  document.getElementById('sidebarToggle').addEventListener('click', function() {
    sidebarVisible = !sidebarVisible;
    updateSidebar();
  });
  
  updateSidebar();

  // Meta bar toggle
  document.getElementById('metaToggle').addEventListener('click', function() {
    var metaBar = document.getElementById('metaBar');
    var isOpen = metaBar.classList.toggle('open');
    document.body.classList.toggle('meta-open', isOpen);
    this.classList.toggle('active', isOpen);
  });

  // Progress bar
  window.addEventListener('scroll', function() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var progress = h > 0 ? window.scrollY / h : 0;
    document.getElementById('progressBar').style.transform = 'scaleX(' + progress + ')';
  });

  // TOC smooth scroll
  var tocLinks = document.querySelectorAll('.toc a');
  for (var i = 0; i < tocLinks.length; i++) {
    tocLinks[i].addEventListener('click', function(e) {
      e.preventDefault();
      var targetId = this.getAttribute('href').substring(1);
      var target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        // Fermer sidebar sur mobile
        if (window.innerWidth <= 768) {
          sidebarVisible = false;
          updateSidebar();
        }
      }
    });
  }

})();
