/**
 * Preview helpers — markdown is stored, rendered visually in the editor and dashboard.
 */
(function (global) {
  function plainTextPreview(md) {
    if (!md || !md.trim()) return '';
    if (global.CarrotMarked && global.CarrotMarked.marked) {
      const html = global.CarrotMarked.marked.parse(md);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const text = (doc.body.textContent || '').replace(/\s+\n/g, '\n').trim();
      return text;
    }
    return md.trim();
  }

  function renderPreviewHtml(md) {
    if (!md || !md.trim()) return '';
    if (global.CarrotMarked && global.CarrotMarked.marked) {
      return global.CarrotMarked.marked.parse(md);
    }
    return plainTextPreview(md).replace(/\n/g, '<br>');
  }

  global.CarrotMarkdown = {
    plainTextPreview,
    renderPreviewHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
