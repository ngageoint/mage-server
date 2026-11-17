import { GuideDocument, GuideTopic, GuideImage, GuideSection, guideImagePosition } from './guide.model';

const ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);
}

/** Readable text stand-in for a Material icon ligature (no font needed offline). */
export function iconLabel(icon: string): string {
  const text = String(icon ?? '').replace(/_/g, ' ').trim();
  return text ? `[${text}]` : '';
}

function anchorId(topic: GuideTopic): string {
  return 'topic-' + String(topic.id).replace(/[^a-zA-Z0-9_-]/g, '-');
}

const STYLES = `
body{margin:0;background:#f3f6f8;color:#1d2a33;font:15px/1.55 Georgia,'Times New Roman',serif}
main{max-width:820px;margin:0 auto;padding:32px 24px 64px;background:#fbfcfd}
header{border-bottom:3px solid #1565a8;padding-bottom:12px;margin-bottom:20px}
h1{font:600 26px/1.2 system-ui,sans-serif;margin:0 0 4px;color:#123a5c}
h2{font:600 20px/1.3 system-ui,sans-serif;color:#123a5c;margin:36px 0 6px;padding-top:12px;border-top:1px solid #d5dee5}
h3{font:600 15px/1.3 system-ui,sans-serif;color:#0d6e6e;margin:20px 0 6px}
.meta{font:13px system-ui,sans-serif;color:#4c5d69}
.icon{display:inline-block;font:600 11px/1.6 ui-monospace,Consolas,monospace;color:#0d6e6e;background:#e2f1f0;border-radius:3px;padding:0 5px;margin-right:6px}
.notice{border-left:4px solid #1565a8;background:#e8f1f9;padding:10px 14px;font:13px/1.5 system-ui,sans-serif;margin:16px 0}
.review{border-left-color:#b26a00;background:#fdf3e2}
.audience{font:12px system-ui,sans-serif;color:#4c5d69;text-transform:uppercase;letter-spacing:.06em}
.controls{font:13px system-ui,sans-serif;color:#33434e}
nav ol{font:14px system-ui,sans-serif;padding-left:22px}
nav a{color:#1565a8}
ol.steps li{margin-bottom:4px}
figure.screen-reference{margin:18px 0;padding:12px;border:1px solid #d5dee5;border-radius:6px;break-inside:avoid}
figure.screen-reference img{display:block;width:100%;height:auto;max-height:520px;object-fit:contain}
figcaption{font:13px/1.5 system-ui,sans-serif;color:#4c5d69;margin-top:8px}
@media print{body{background:#fbfcfd}main{padding:0}h2{break-before:page;border-top:0}figure.screen-reference img{max-height:340px}}
`;

function renderPictures(section: GuideSection, position: string): string {
  return (section.images || []).filter(image => guideImagePosition(image, section) === position).map(image => {
    if (!/^data:image\/(?:svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(image.dataUrl)) {
      throw new Error('Guide pictures must be embedded offline image data.');
    }
    return `<figure class="screen-reference"><img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.alt)}"><figcaption>${escapeHtml(image.caption)}</figcaption></figure>`;
  }).join('');
}

function renderTopic(topic: GuideTopic): string {
  const controls = topic.controls?.length
    ? `<p class="controls"><strong>Controls referenced:</strong> ${topic.controls
        .map(c => `<span class="icon">${escapeHtml(iconLabel(c.icon))}</span>${escapeHtml(c.label)}`)
        .join('; ')}</p>`
    : '';
  const sections = (topic.sections ?? []).map(s => `
<h3>${escapeHtml(s.title)}</h3>
${renderPictures(s, 'paragraph:0')}
${(s.body ?? []).map((p, i) => `<p>${escapeHtml(p)}</p>${renderPictures(s, `paragraph:${i + 1}`)}`).join('\n')}
${s.steps?.length ? `<ol class="steps">${s.steps.map((st, i) => `<li>${escapeHtml(st)}${renderPictures(s, `step:${i + 1}`)}</li>`).join('')}</ol>` : ''}`).join('\n');
  return `<section id="${anchorId(topic)}">
<h2><span class="icon">${escapeHtml(iconLabel(topic.icon))}</span>${escapeHtml(topic.title)}</h2>
<div class="audience">For: ${escapeHtml(topic.audience)} &middot; In MAGE: ${escapeHtml(topic.route)}</div>
<p>${escapeHtml(topic.summary)}</p>
${controls}${sections}
</section>`;
}

/**
 * Render a self-contained offline HTML guide. No scripts, remote assets, fonts,
 * or user/session data. When topicId matches a topic, only that chapter is included.
 */
export function renderGuideHtml(doc: GuideDocument, topicId?: string): string {
  const all = doc?.topics ?? [];
  const single = topicId ? all.find(t => t.id === topicId) : undefined;
  const topics = single ? [single] : all;
  const title = single ? `MAGE User Guide - ${single.title}` : 'MAGE User Guide';
  const toc = `<nav aria-label="Contents"><h3>Contents</h3><ol>${topics
    .map(t => `<li><a href="#${anchorId(t)}">${escapeHtml(t.title)}</a></li>`)
    .join('')}</ol></nav>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${STYLES}</style></head>
<body><main>
<header><h1>${escapeHtml(title)}</h1>
<div class="meta">Version ${escapeHtml(doc?.version)} &middot; ${escapeHtml(doc?.edition)} edition</div></header>
<div class="notice">Offline reference copy. Actions described here must be performed inside the MAGE application; nothing in this file connects to a server. Bracketed labels such as [add location] describe the icon shown on the matching control.</div>
${toc}
${topics.map(renderTopic).join('\n')}
</main></body></html>`;
}

export function guideFileName(doc: GuideDocument, topicId?: string): string {
  const v = String(doc?.version ?? '').replace(/[^a-zA-Z0-9.-]/g, '');
  const part = topicId ? '-' + String(topicId).replace(/[^a-zA-Z0-9-]/g, '') : '-all';
  return `mage-user-guide${part}${v ? '-' + v : ''}.html`;
}

/** Trigger a browser download. Throws on failure so callers can report it. */
export function downloadGuide(doc: GuideDocument, topicId?: string, revokeDelayMs = 4000): void {
  const blob = new Blob([renderGuideHtml(doc, topicId)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = guideFileName(doc, topicId);
  a.rel = 'noopener';
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
  }
}
