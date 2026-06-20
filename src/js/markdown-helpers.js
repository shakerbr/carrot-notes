/**
 * Markdown formatting helpers for CarrotNotes (plain script, no bundler).
 */
(function (global) {
  const CHECKLIST_RE = /^(\s*)- \[([ xX])\]\s(.*)$/;
  const BULLET_RE = /^(\s*)[-*+]\s+(.*)$/;
  const NUMBER_RE = /^(\s*)(\d+)\.\s+(.*)$/;

  function getLineRange(state, selection) {
    const fromLine = state.doc.lineAt(selection.from).number;
    const toLine = state.doc.lineAt(selection.to).number;
    return { fromLine, toLine };
  }

  function classifyLine(text) {
    if (CHECKLIST_RE.test(text)) return 'checklist';
    if (NUMBER_RE.test(text)) return 'number';
    if (BULLET_RE.test(text)) return 'bullet';
    return 'paragraph';
  }

  function stripListPrefix(text) {
    let m = text.match(CHECKLIST_RE);
    if (m) return m[1] + m[3];
    m = text.match(NUMBER_RE);
    if (m) return m[1] + m[3];
    m = text.match(BULLET_RE);
    if (m) return m[1] + m[2];
    return text;
  }

  function applyListPrefix(format, text, index) {
    const body = stripListPrefix(text);
    if (format === 'bullet') return `- ${body}`;
    if (format === 'number') return `${index + 1}. ${body}`;
    if (format === 'checklist') return `- [ ] ${body}`;
    return body;
  }

  function toggleLineFormat(view, format) {
    const { state } = view;
    const sel = state.selection.main;
    const { fromLine, toLine } = getLineRange(state, sel);
    const lines = [];

    for (let n = fromLine; n <= toLine; n++) {
      const line = state.doc.line(n);
      lines.push({ from: line.from, to: line.to, text: line.text, kind: classifyLine(line.text) });
    }

    if (lines.length === 0) return false;

    let targetFormat = format;
    if (format === 'checklist' && lines.every((l) => l.kind === 'checklist')) {
      targetFormat = 'paragraph';
    } else if (format !== 'paragraph' && lines.every((l) => l.kind === format)) {
      targetFormat = 'paragraph';
    }

    const changes = lines.map((line, i) => ({
      from: line.from,
      to: line.to,
      insert: targetFormat === 'paragraph'
        ? stripListPrefix(line.text)
        : applyListPrefix(targetFormat, line.text, i),
    }));

    view.dispatch({ changes });
    return true;
  }

  function toggleWrap(view, startMarker, endMarker) {
    const { state } = view;
    const sel = state.selection.main;
    if (sel.empty) return false;

    const selected = state.sliceDoc(sel.from, sel.to);
    const len = startMarker.length;
    const before = state.sliceDoc(Math.max(0, sel.from - len), sel.from);
    const after = state.sliceDoc(sel.to, sel.to + endMarker.length);

    if (before === startMarker && after === endMarker) {
      view.dispatch({
        changes: [
          { from: sel.from - len, to: sel.from, insert: '' },
          { from: sel.to, to: sel.to + endMarker.length, insert: '' },
        ],
        selection: { anchor: sel.from - len, head: sel.to - len },
      });
      return true;
    }

    if (selected.startsWith(startMarker) && selected.endsWith(endMarker)) {
      const inner = selected.slice(len, selected.length - endMarker.length);
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: inner },
        selection: { anchor: sel.from, head: sel.from + inner.length },
      });
      return true;
    }

    const wrapped = startMarker + selected + endMarker;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: wrapped },
      selection: { anchor: sel.from + len, head: sel.to + len },
    });
    return true;
  }

  function stripInlineMarkers(text) {
    return text
      .replace(/<u>([\s\S]*?)<\/u>/gi, '$1')
      .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
      .replace(/\*([\s\S]*?)\*/g, '$1')
      .replace(/~~([\s\S]*?)~~/g, '$1');
  }

  function removeFormat(view) {
    const { state } = view;
    const sel = state.selection.main;
    if (sel.empty) return false;
    const selected = state.sliceDoc(sel.from, sel.to);
    const cleaned = stripInlineMarkers(selected);
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: cleaned },
      selection: { anchor: sel.from, head: sel.from + cleaned.length },
    });
    return true;
  }

  function applyFormat(view, cmd) {
    switch (cmd) {
      case 'bold':
        return toggleWrap(view, '**', '**');
      case 'italic':
        return toggleWrap(view, '*', '*');
      case 'underline':
        return toggleWrap(view, '<u>', '</u>');
      case 'strikeThrough':
        return toggleWrap(view, '~~', '~~');
      case 'removeFormat':
        return removeFormat(view);
      case 'insertUnorderedList':
        return toggleLineFormat(view, 'bullet');
      case 'insertOrderedList':
        return toggleLineFormat(view, 'number');
      case 'insertChecklist':
        return toggleLineFormat(view, 'checklist');
      default:
        return false;
    }
  }

  function contextAround(state, pos, radius) {
    const start = Math.max(0, pos - radius);
    const end = Math.min(state.doc.length, pos + radius);
    return {
      before: state.sliceDoc(start, pos),
      after: state.sliceDoc(pos, end),
      full: state.sliceDoc(start, end),
    };
  }

  function markerActive(before, after, startMarker, endMarker) {
    const startIdx = before.lastIndexOf(startMarker);
    if (startIdx === -1) return false;
    const between = before.slice(startIdx + startMarker.length);
    if (between.includes(startMarker) || between.includes(endMarker)) return false;
    const endIdx = after.indexOf(endMarker);
    return endIdx !== -1;
  }

  function getActiveFormats(view) {
    if (!view || !view.hasFocus) {
      return { bold: false, italic: false, underline: false, strikeThrough: false };
    }

    const { state } = view;
    const pos = state.selection.main.head;
    const ctx = contextAround(state, pos, 80);

    const bold = markerActive(ctx.before, ctx.after, '**', '**');
    const strikeThrough = markerActive(ctx.before, ctx.after, '~~', '~~');
    const underline = markerActive(ctx.before, ctx.after, '<u>', '</u>');

    let italic = false;
    if (!bold) {
      const startIdx = ctx.before.lastIndexOf('*');
      if (startIdx !== -1 && ctx.before[startIdx - 1] !== '*' && ctx.before.slice(startIdx + 1).indexOf('*') === -1) {
        const endIdx = ctx.after.indexOf('*');
        if (endIdx !== -1 && ctx.after[endIdx + 1] !== '*') italic = true;
      }
    }

    return { bold, italic, underline, strikeThrough };
  }

  function plainTextPreview(md) {
    if (!md || !md.trim()) return '';
    return md
      .split('\n')
      .map((line) => {
        let t = line;
        t = t.replace(CHECKLIST_RE, (_, _indent, check, body) => (check.toLowerCase() === 'x' ? '☑ ' : '☐ ') + body);
        t = t.replace(NUMBER_RE, (_, indent, _n, body) => indent + body);
        t = t.replace(BULLET_RE, (_, indent, body) => indent + '• ' + body);
        t = t.replace(/^#+\s+/, '');
        return stripInlineMarkers(t);
      })
      .join('\n')
      .trim();
  }

  function renderPreviewHtml(md) {
    if (!md || !md.trim()) return '';
    if (global.CarrotMarked && global.CarrotMarked.marked) {
      return global.CarrotMarked.marked.parse(md);
    }
    return plainTextPreview(md).replace(/\n/g, '<br>');
  }

  global.CarrotMarkdown = {
    toggleLineFormat,
    applyFormat,
    getActiveFormats,
    plainTextPreview,
    renderPreviewHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
