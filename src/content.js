/**
 * mdREADER v7.0 - Abricot Labs
 * Fixes: line breaks, tables, DC metadata, footer
 */

(function() {
  'use strict';

  const pre = document.querySelector('pre');
  const rawContent = pre ? pre.textContent : document.body.innerText || document.body.textContent;
  
  if (!rawContent || rawContent.trim().length < 10) return;

  const fileName = decodeURIComponent(window.location.pathname.split('/').pop()) || 'document.md';

  // === EXTRACT DC METADATA (YAML frontmatter) ===
  let dcMetadata = {};
  let contentWithoutFrontmatter = rawContent;
  
  const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    contentWithoutFrontmatter = rawContent.slice(frontmatterMatch[0].length);
    const yamlContent = frontmatterMatch[1];
    
    yamlContent.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
      if (match) {
        dcMetadata[match[1].toLowerCase()] = match[2];
      }
    });
  }

  // === MARKDOWN PARSER (improved) ===
  function parseMarkdown(md) {
    let result = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Code blocks first
    result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });
    
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Tables
    result = result.replace(/^\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/gm, (match, header, body) => {
      const headers = header.split('|').map(h => h.trim()).filter(h => h);
      const rows = body.trim().split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );
      
      let table = '<table><thead><tr>';
      headers.forEach(h => table += `<th>${h}</th>`);
      table += '</tr></thead><tbody>';
      rows.forEach(row => {
        table += '<tr>';
        row.forEach(cell => table += `<td>${cell}</td>`);
        table += '</tr>';
      });
      table += '</tbody></table>';
      return table;
    });
    
    // Headers
    result = result
      .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Text formatting
    result = result
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Blockquotes
    result = result.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    result = result.replace(/<\/blockquote>\n<blockquote>/g, '\n');
    
    // Horizontal rules
    result = result.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>');
    
    // Links and images
    result = result
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Lists
    result = result
      .replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>')
      .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Task lists
    result = result
      .replace(/<li>\[ \] /g, '<li class="task"><input type="checkbox" disabled> ')
      .replace(/<li>\[x\] /gi, '<li class="task"><input type="checkbox" checked disabled> ');
    
    // Line breaks: two spaces or backslash at end of line
    result = result.replace(/  \n/g, '<br>\n');
    result = result.replace(/\\\n/g, '<br>\n');
    
    // Paragraphs
    const lines = result.split('\n');
    const processed = [];
    let paragraphContent = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBlockElement = /^<(h[1-6]|ul|ol|li|pre|blockquote|table|hr|img|div)/.test(line);
      const isEndBlockElement = /^<\/(ul|ol|pre|blockquote|table)>/.test(line);
      const isEmpty = line.trim() === '';
      
      if (isBlockElement || isEndBlockElement) {
        if (paragraphContent.length > 0) {
          processed.push('<p>' + paragraphContent.join('<br>') + '</p>');
          paragraphContent = [];
        }
        processed.push(line);
      } else if (isEmpty) {
        if (paragraphContent.length > 0) {
          processed.push('<p>' + paragraphContent.join('<br>') + '</p>');
          paragraphContent = [];
        }
      } else {
        paragraphContent.push(line);
      }
    }
    
    if (paragraphContent.length > 0) {
      processed.push('<p>' + paragraphContent.join('<br>') + '</p>');
    }
    
    result = processed.join('\n');
    result = result.replace(/<p><\/p>/g, '').replace(/<p>\s*<\/p>/g, '').replace(/<p><br><\/p>/g, '');
    
    return result;
  }

  let title = 'Document';
  const titleMatch = contentWithoutFrontmatter.match(/^#\s+(.+)$/m);
  if (titleMatch) title = titleMatch[1].trim();
  if (dcMetadata.title) title = dcMetadata.title;

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

  const wordCount = contentWithoutFrontmatter.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  let htmlContent = parseMarkdown(contentWithoutFrontmatter);
  htmlContent = htmlContent.replace(/<h([1-6])>(.+?)<\/h[1-6]>/g, (m, l, t) => {
    const id = t.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]+/g, '-');
    return `<h${l} id="${id}">${t}</h${l}>`;
  });

  const toc = generateTOC(contentWithoutFrontmatter);
  const authorDisplay = dcMetadata.author || dcMetadata.creator || '';

  // === BUILD PAGE ===
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
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .header {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 72px;
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
        height: 32px;
        background: var(--border);
        flex-shrink: 0;
      }

      .doc-info {
        flex: 1;
        min-width: 0;
        padding-right: 12px;
      }

      .doc-label {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 10px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        line-height: 1.2;
      }

      .doc-title {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.3;
      }

      .doc-meta {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--text-muted);
        line-height: 1.2;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .doc-meta-item { display: flex; align-items: center; gap: 4px; }
      .doc-meta-item .label { color: var(--text-muted); }
      .doc-meta-item .value { color: var(--accent); }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

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

      .meta-bar {
        position: fixed;
        top: 72px; left: 0; right: 0;
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

      .meta-bar.open { height: 44px; border-color: var(--border); }

      .meta-item { display: flex; align-items: center; gap: 8px; }
      .meta-label { font-family: 'Instrument Sans', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
      .meta-value { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--accent); font-weight: 500; }

      .progress-bar {
        position: fixed;
        top: 72px; left: 0; right: 0;
        height: 2px;
        background: var(--accent);
        transform-origin: left;
        transform: scaleX(0);
        z-index: 998;
        transition: top 0.2s ease;
      }

      body.meta-open .progress-bar { top: 116px; }

      .layout {
        display: flex;
        flex: 1;
        padding-top: 72px;
        transition: padding-top 0.2s ease;
      }

      body.meta-open .layout { padding-top: 116px; }

      .sidebar {
        position: fixed;
        left: 0;
        top: 72px;
        width: 260px;
        height: calc(100vh - 72px - 48px);
        background: var(--bg-secondary);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        transform: translateX(0);
        transition: transform 0.25s ease, top 0.2s ease, height 0.2s ease, background 0.25s ease, border-color 0.25s ease;
        z-index: 100;
      }

      body.sidebar-hidden .sidebar { transform: translateX(-100%); }
      body.meta-open .sidebar { top: 116px; height: calc(100vh - 116px - 48px); }

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
      
      .markdown-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9em; }
      .markdown-body th, .markdown-body td { padding: 0.6rem 0.8rem; text-align: left; border: 1px solid var(--border); }
      .markdown-body th { background: var(--bg-secondary); font-family: 'Instrument Sans', sans-serif; font-weight: 600; color: var(--text-primary); }
      .markdown-body td { color: var(--text-secondary); }
      .markdown-body tr:hover td { background: var(--accent-dim); }

      .footer {
        height: 48px;
        background: var(--bg-secondary);
        border-top: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: background 0.25s ease, border-color 0.25s ease;
      }

      .footer a {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 11px;
        color: var(--text-muted);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: color 0.15s ease;
      }

      .footer a:hover { color: var(--accent); }
      .footer svg { width: 16px; height: 16px; }

      @media (max-width: 768px) {
        .header { padding: 0 12px; gap: 10px; height: 64px; }
        .header::before { font-size: 36px; }
        .brand-name { font-size: 14px; }
        .brand-sub { font-size: 8px; }
        .doc-title { font-size: 12px; }
        .meta-btn span { display: none; }
        .meta-btn { padding: 7px 10px; }
        .sidebar { width: 240px; box-shadow: 2px 0 12px rgba(0,0,0,0.2); top: 64px; height: calc(100vh - 64px - 48px); }
        body:not(.sidebar-visible) .sidebar { transform: translateX(-100%); }
        body.sidebar-visible .sidebar { transform: translateX(0); }
        .content { margin-left: 0 !important; padding: 24px 16px; max-width: 100% !important; }
        .layout { padding-top: 64px; }
        .progress-bar { top: 64px; }
        .meta-bar { top: 64px; gap: 24px; }
        body.meta-open .layout { padding-top: 108px; }
        body.meta-open .sidebar { top: 108px; height: calc(100vh - 108px - 48px); }
        body.meta-open .progress-bar { top: 108px; }
      }


      /* ===== TICKET THERMAL PRINT ===== */
      .ticket-header, .ticket-footer, .ticket-cut { display: none; }

      @media print {
        @page ticket-page { size: 80mm auto; margin: 3mm 2mm; }

        body.ticket-print-mode * {
          font-family: 'Courier New', Courier, monospace !important;
          font-size: 9pt !important;
          line-height: 1.35 !important;
          color: #000 !important;
          background: transparent !important;
        }
        body.ticket-print-mode .header,
        body.ticket-print-mode .meta-bar,
        body.ticket-print-mode .progress-bar,
        body.ticket-print-mode .sidebar,
        body.ticket-print-mode .footer { display: none !important; }
        body.ticket-print-mode .layout { padding-top: 0 !important; display: block !important; }
        body.ticket-print-mode .content { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
        body.ticket-print-mode .ticket-header {
          display: block !important; text-align: center;
          border-bottom: 1px dashed #000; padding-bottom: 4pt; margin-bottom: 6pt;
        }
        body.ticket-print-mode .ticket-header .t-title {
          font-size: 11pt !important; font-weight: bold !important;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        body.ticket-print-mode .ticket-header .t-meta { font-size: 7pt !important; }
        body.ticket-print-mode .markdown-body h1 {
          font-size: 11pt !important; font-weight: bold !important;
          text-align: center; text-transform: uppercase;
          border-bottom: 1px solid #000 !important;
          padding-bottom: 3pt; margin-bottom: 6pt;
        }
        body.ticket-print-mode .markdown-body h2 {
          font-size: 9pt !important; font-weight: bold !important;
          text-transform: uppercase;
          border-top: 1px dashed #000 !important; border-bottom: none !important;
          padding: 4pt 0 2pt !important; margin: 6pt 0 3pt !important;
        }
        body.ticket-print-mode .markdown-body h3 { font-size: 9pt !important; font-weight: bold !important; }
        body.ticket-print-mode .markdown-body p { margin-bottom: 3pt !important; }
        body.ticket-print-mode .markdown-body ul,
        body.ticket-print-mode .markdown-body ol { padding-left: 10pt !important; margin: 2pt 0 4pt !important; }
        body.ticket-print-mode .markdown-body li { margin-bottom: 1pt !important; }
        body.ticket-print-mode .markdown-body li::marker { content: '- ' !important; }
        body.ticket-print-mode .markdown-body pre,
        body.ticket-print-mode .markdown-body code {
          font-size: 7.5pt !important; border: 1px solid #000 !important;
          padding: 2pt 4pt !important; border-radius: 0 !important;
          white-space: pre-wrap !important; word-break: break-all !important;
        }
        body.ticket-print-mode .markdown-body pre::before { display: none !important; }
        body.ticket-print-mode .markdown-body blockquote {
          border-left: 2px solid #000 !important; background: transparent !important;
          padding: 2pt 6pt !important; font-style: italic !important;
        }
        body.ticket-print-mode .markdown-body table { font-size: 7pt !important; border-collapse: collapse !important; width: 100% !important; }
        body.ticket-print-mode .markdown-body th,
        body.ticket-print-mode .markdown-body td { border: 1px solid #000 !important; padding: 2pt 3pt !important; background: transparent !important; }
        body.ticket-print-mode .markdown-body img { display: none !important; }
        body.ticket-print-mode .markdown-body hr { border: none !important; border-top: 1px dashed #000 !important; margin: 6pt 0 !important; }
        body.ticket-print-mode .ticket-footer {
          display: block !important; text-align: center;
          border-top: 1px dashed #000; margin-top: 8pt; padding-top: 4pt;
          font-size: 7pt !important;
        }
        body.ticket-print-mode .ticket-cut {
          display: block !important; text-align: center;
          font-size: 8pt !important; letter-spacing: 0.3em; margin-top: 6pt;
        }
      }
      /* ===== END TICKET ===== */

      @media print {
        @page { size: A4; margin: 18mm 15mm; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          --bg-primary: #ffffff !important; --bg-secondary: #f9f9f9 !important; --bg-elevated: #ffffff !important;
          --bg-header: #ffffff !important; --text-primary: #000000 !important; --text-secondary: #333333 !important;
          --text-muted: #666666 !important; --border: #cccccc !important; --code-bg: #f5f5f5 !important; --accent: #d35400 !important;
          background: white !important; color: black !important; font-size: 11pt !important;
        }
        .header { position: relative !important; height: auto !important; padding: 12px 0 !important; border-bottom: 2px solid var(--accent) !important; background: white !important; }
        .header::before { display: none !important; }
        .btn, .theme-switch, .meta-btn, .header-divider { display: none !important; }
        .brand { position: absolute; right: 0; top: 50%; transform: translateY(-50%); }
        .brand-name { font-size: 12px !important; color: var(--accent) !important; }
        .brand-sub { font-size: 7px !important; }
        .doc-info { padding: 0 !important; }
        .doc-label { display: none !important; }
        .doc-title { font-size: 14pt !important; font-weight: 600 !important; color: black !important; }
        .doc-meta { font-size: 9pt !important; margin-top: 4px !important; }
        .sidebar, .meta-bar, .progress-bar, .footer { display: none !important; }
        .layout { padding-top: 0 !important; display: block !important; }
        .content { margin: 0 !important; padding: 20px 0 0 0 !important; max-width: 100% !important; width: 100% !important; }
        .markdown-body { font-size: 11pt !important; line-height: 1.5 !important; }
        .markdown-body h1 { font-size: 18pt !important; margin-bottom: 12pt !important; page-break-after: avoid !important; color: black !important; }
        .markdown-body h2 { font-size: 14pt !important; margin-top: 16pt !important; margin-bottom: 8pt !important; padding-top: 8pt !important; page-break-after: avoid !important; border-top: 1px solid #ccc !important; color: black !important; }
        .markdown-body h3 { font-size: 12pt !important; margin-top: 12pt !important; page-break-after: avoid !important; color: #333 !important; }
        .markdown-body p { color: black !important; orphans: 3 !important; widows: 3 !important; }
        .markdown-body pre { font-size: 9pt !important; white-space: pre-wrap !important; word-wrap: break-word !important; border: 1px solid #ddd !important; page-break-inside: avoid !important; }
        .markdown-body pre::before { display: none !important; }
        .markdown-body code { color: #333 !important; background: #f0f0f0 !important; }
        .markdown-body a { color: #333 !important; text-decoration: underline !important; }
        .markdown-body blockquote { border-left: 2px solid #999 !important; background: #f9f9f9 !important; page-break-inside: avoid !important; }
        .markdown-body img { max-width: 100% !important; page-break-inside: avoid !important; }
        .markdown-body table { page-break-inside: avoid !important; }
        .markdown-body th { background: #f0f0f0 !important; }
        .markdown-body ul, .markdown-body ol { color: black !important; }
        .markdown-body li::marker { color: #666 !important; }
      }
    </style>
  `;
  document.documentElement.appendChild(head);

  const body = document.createElement('body');
  body.innerHTML = `
    <header class="header">
      <button class="btn" id="sidebarToggle" title="Sommaire">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="brand">
        <span class="brand-name">mdREADER</span>
        <span class="brand-sub">Abricot Labs</span>
      </div>
      <div class="header-divider"></div>
      <div class="doc-info">
        <div class="doc-label">Vous consultez</div>
        <div class="doc-title">${title}</div>
        <div class="doc-meta">
          <span class="doc-meta-item"><span class="label">Fichier:</span> <span class="value">${fileName}</span></span>
          ${authorDisplay ? `<span class="doc-meta-item"><span class="label">Auteur:</span> <span class="value">${authorDisplay}</span></span>` : ''}
        </div>
      </div>
      <div class="header-actions">
        <button class="meta-btn" id="ticketPrintBtn" title="Imprimer en ticket thermique">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span>Ticket</span>
        </button>
        <button class="meta-btn" id="metaToggle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>Infos</span>
        </button>
        <div class="theme-switch">
          <button class="theme-btn" id="darkBtn" title="Sombre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="theme-btn" id="lightBtn" title="Clair">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
    <div class="meta-bar" id="metaBar">
      <div class="meta-item"><span class="meta-label">Lecture</span><span class="meta-value">${readingTime} min</span></div>
      <div class="meta-item"><span class="meta-label">Mots</span><span class="meta-value">${wordCount.toLocaleString()}</span></div>
    </div>
    <div class="progress-bar" id="progressBar"></div>
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Sommaire
          </div>
        </div>
        <nav class="toc">${toc}</nav>
        <div class="sidebar-footer">
          <div class="stat"><span class="stat-label">Lecture</span><span class="stat-value">${readingTime} min</span></div>
          <div class="stat"><span class="stat-label">Mots</span><span class="stat-value">${wordCount.toLocaleString()}</span></div>
        </div>
      </aside>
      <main class="content">
        <div class="ticket-header">
          <div class="t-title">${title}</div>
          <div class="t-meta">${fileName} &nbsp;|&nbsp; ${readingTime} min &nbsp;|&nbsp; ${wordCount} mots</div>
        </div>
        <article class="markdown-body">${htmlContent}</article>
      </main>
    </div>
    <footer class="footer">
      <a href="https://github.com/cheezelcom/mdreader" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        mdREADER sur GitHub
      </a>
    </footer>
  `;
  document.documentElement.appendChild(body);

  // === SCRIPTS ===
  // === TICKET PRINT ===
  document.getElementById('ticketPrintBtn').addEventListener('click', function() {
    var isTicket = document.body.classList.toggle('ticket-print-mode');
    this.classList.toggle('active', isTicket);
    if (isTicket) {
      this.querySelector('span').textContent = 'Annuler';
      // Inject @page size for ticket
      var styleEl = document.getElementById('ticket-page-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'ticket-page-style';
        styleEl.textContent = '@page { size: 80mm auto; margin: 3mm 2mm; }';
        document.head.appendChild(styleEl);
      }
      setTimeout(function() {
        window.print();
        document.body.classList.remove('ticket-print-mode');
        document.getElementById('ticketPrintBtn').classList.remove('active');
        document.getElementById('ticketPrintBtn').querySelector('span').textContent = 'Ticket';
        var s = document.getElementById('ticket-page-style');
        if (s) s.remove();
      }, 150);
    } else {
      this.querySelector('span').textContent = 'Ticket';
      var s = document.getElementById('ticket-page-style');
      if (s) s.remove();
    }
  });
  // === END TICKET ===

  function setTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
    document.getElementById('darkBtn').classList.toggle('active', theme === 'dark');
    document.getElementById('lightBtn').classList.toggle('active', theme === 'light');
    try { localStorage.setItem('mdreader-theme', theme); } catch(e) {}
  }
  
  document.getElementById('darkBtn').addEventListener('click', function() { setTheme('dark'); });
  document.getElementById('lightBtn').addEventListener('click', function() { setTheme('light'); });
  
  var savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('mdreader-theme') || 'dark'; } catch(e) {}
  setTheme(savedTheme);

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

  document.getElementById('metaToggle').addEventListener('click', function() {
    var metaBar = document.getElementById('metaBar');
    var isOpen = metaBar.classList.toggle('open');
    document.body.classList.toggle('meta-open', isOpen);
    this.classList.toggle('active', isOpen);
  });

  window.addEventListener('scroll', function() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var progress = h > 0 ? window.scrollY / h : 0;
    document.getElementById('progressBar').style.transform = 'scaleX(' + progress + ')';
  });

  var tocLinks = document.querySelectorAll('.toc a');
  for (var i = 0; i < tocLinks.length; i++) {
    tocLinks[i].addEventListener('click', function(e) {
      e.preventDefault();
      var targetId = this.getAttribute('href').substring(1);
      var target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        if (window.innerWidth <= 768) {
          sidebarVisible = false;
          updateSidebar();
        }
      }
    });
  }
})();
