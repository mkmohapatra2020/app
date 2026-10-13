// Minimal HTML sanitiser for article bodies from the API: keeps basic
// formatting tags, drops scripts, event handlers and javascript: URLs.
const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'A', 'IMG', 'FIGURE', 'FIGCAPTION', 'SPAN', 'CODE', 'PRE', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
const ATTRS = { A: ['href', 'title'], IMG: ['src', 'alt', 'width', 'height'] };

export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const walk = (node) => {
    [...node.children].forEach((el) => {
      if (!ALLOWED.has(el.tagName)) { el.replaceWith(...(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(el.tagName) ? [] : el.childNodes)); return; }
      [...el.attributes].forEach((a) => { if (!(ATTRS[el.tagName] || []).includes(a.name)) el.removeAttribute(a.name); });
      ['href', 'src'].forEach((k) => { const v = el.getAttribute(k); if (v && !/^(https?:|\/|#|mailto:|tel:)/i.test(v.trim())) el.removeAttribute(k); });
      if (el.tagName === 'A') { el.setAttribute('rel', 'noopener'); el.setAttribute('target', '_blank'); }
      if (el.tagName === 'IMG') el.setAttribute('loading', 'lazy');
      walk(el);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
