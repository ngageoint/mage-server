#!/usr/bin/env node
/* Source-linked guide compiler. No network, credentials, user data or AI calls. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const text = html => html.replace(/<mat-icon\b[^>]*>[\s\S]*?<\/mat-icon>/g, '')
  .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function readControl(root, id, file) {
  const html = fs.readFileSync(path.resolve(root, file), 'utf8');
  const key = escapeRegex(id);
  const tags = [...html.matchAll(new RegExp(`<([\\w-]+)\\b([^>]*\\bdata-guide="${key}"[^>]*)>([\\s\\S]*?)<\\/\\1>`, 'g'))];
  let label, icon;
  if (tags.length === 1) {
    const [, , attributes, body] = tags[0];
    label = attributes.match(/(?:aria-label|matTooltip)="([^"]+)"/)?.[1] || text(body);
    icon = body.match(/<mat-icon\b[^>]*>([^<]+)<\/mat-icon>/)?.[1]?.trim() || '';
  } else if (tags.length === 0) {
    const labels = [...html.matchAll(new RegExp(`<([\\w-]+)\\b[^>]*\\bdata-guide-label="${key}"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'g'))];
    const icons = [...html.matchAll(new RegExp(`<mat-icon\\b[^>]*\\bdata-guide-icon="${key}"[^>]*>([^<]+)<\\/mat-icon>`, 'g'))];
    if (labels.length !== 1 || icons.length !== 1) throw new Error(`Missing or ambiguous guide control ${id} in ${file}`);
    label = text(labels[0][2]);
    icon = icons[0][1].trim();
  } else throw new Error(`Duplicate guide control ${id} in ${file}`);
  if (!label || /\{\{|\}\}/.test(label) || /\{\{|\}\}/.test(icon)) {
    throw new Error(`Guide control ${id} needs a static accessible label/icon`);
  }
  return { id, label, icon };
}

function sourceFiles(root, entries) {
  const result = new Set();
  const walk = file => {
    const absolute = path.resolve(root, file);
    if (!fs.existsSync(absolute)) throw new Error(`Guide workflow source is missing: ${file}`);
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) walk(`${file}/${name}`);
    } else if (!/\.(spec|test)\.[^.]+$/.test(file) && /\.(ts|js|html|scss|md|json)$/.test(file)) result.add(file);
  };
  entries.forEach(walk);
  return [...result].sort();
}

function readImage(root, image) {
  if (typeof image.file !== 'string' || !image.file.startsWith('docs/images/')) throw new Error('Guide images must be in docs/images/');
  const file = path.resolve(root, image.file);
  const base = path.resolve(root, 'docs/images') + path.sep;
  if (!file.startsWith(base) || !fs.existsSync(file) || !fs.realpathSync(file).startsWith(fs.realpathSync(base) + path.sep)) {
    throw new Error(`Missing or unsafe guide image: ${image.file}`);
  }
  const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(file)];
  const bytes = fs.readFileSync(file);
  // Real OSM map captures contain detailed raster tiles. Keep a bounded 1 MiB
  // allowance without downsampling the controls readers need to recognise.
  if (!mime || !bytes.length || bytes.length > 1024 * 1024) throw new Error(`Unsupported or oversized guide image: ${image.file}`);
  if (mime === 'image/svg+xml') {
    const svg = bytes.toString('utf8');
    const withoutLocalPaint = svg.replace(/url\(\s*["']?#[\w-]+["']?\s*\)/g, '');
    if (!/<svg\b/i.test(svg) || /<script\b|<foreignObject\b|<!DOCTYPE|<!ENTITY|\bon[a-z]+\s*=|javascript:|@import|url\s*\(/i.test(withoutLocalPaint) ||
      /\b(?:href|src)\s*=\s*["'](?!#)/i.test(svg)) throw new Error(`Guide SVG must be self-contained and non-executable: ${image.file}`);
  }
  if (typeof image.alt !== 'string' || !image.alt.trim() || typeof image.caption !== 'string' || !image.caption.trim()) {
    throw new Error(`Guide image needs alternative text and a caption: ${image.file}`);
  }
  return { dataUrl: `data:${mime};base64,${bytes.toString('base64')}`, hash: digest(bytes) };
}

function compile(root, reviewed = {}) {
  // Review acknowledgement cannot make stale pictures current. The production
  // prebuild hook recaptures with the real compiled app before compiling help.
  if (fs.existsSync(path.join(root, 'docs/guide-captures.json'))) {
    const stale = require('./sync-guide-screens.cjs').captureStatus(root);
    if (stale) throw new Error(`${stale} Run npm run guides:capture, then regenerate the guide.`);
  }
  const input = JSON.parse(fs.readFileSync(path.join(root, 'docs/user-guides.json'), 'utf8'));
  const controls = Object.fromEntries(Object.entries(input.controls).map(([id, file]) => [id, readControl(root, id, file)]));
  const replace = value => value.replace(/\{\{control:([^}]+)\}\}/g, (_, id) => {
    if (!controls[id]) throw new Error(`Unknown guide control: ${id}`);
    return controls[id].label;
  });
  const snapshots = {};
  const ids = new Set();
  const topics = input.topics.map(topic => {
    if (ids.has(topic.id)) throw new Error(`Duplicate guide topic: ${topic.id}`);
    ids.add(topic.id);
    const files = sourceFiles(root, topic.sources);
    const hashes = Object.fromEntries(files.map(file => [file, digest(fs.readFileSync(path.resolve(root, file)))]));
    const imageDefinitions = input.screenImages?.[topic.id] || [];
    const images = imageDefinitions.map(image => {
      const sections = topic.sections.filter(section => section.title === image.section);
      if (sections.length !== 1 || !Number.isInteger(image.afterStep) || image.afterStep < 0 || image.afterStep > sections[0].steps.length) {
        throw new Error(`Guide image has an unknown section or invalid step: ${image.file}`);
      }
      const picture = readImage(root, image);
      hashes[image.file] = picture.hash;
      return { ...image, dataUrl: picture.dataUrl };
    });
    snapshots[topic.id] = { content: digest(JSON.stringify({ topic, screenImages: imageDefinitions })), files: hashes };
    const previous = reviewed[topic.id];
    const changed = new Set(Object.keys(hashes).filter(file => previous?.files?.[file] !== hashes[file]));
    for (const file of Object.keys(previous?.files || {})) if (!(file in hashes)) changed.add(file);
    if (previous?.content !== snapshots[topic.id].content) changed.add('Guide instructions');
    const sectionIds = topic.sections.map(section => section.id || section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    if (new Set(sectionIds).size !== sectionIds.length || sectionIds.some(id => !/^[a-z0-9][a-z0-9_-]{0,159}$/.test(id))) {
      throw new Error(`Duplicate or invalid guide section ID in ${topic.id}`);
    }
    return {
      id: topic.id, title: replace(topic.title), summary: replace(topic.summary),
      audience: topic.audience, icon: topic.icon, route: topic.route,
      needsReview: changed.size > 0, changedSources: [...changed],
      controls: topic.controlIds.map(id => {
        if (!controls[id]) throw new Error(`Unknown topic control ${id}`);
        return controls[id];
      }),
      sections: topic.sections.map(section => ({
        id: section.id || section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        title: replace(section.title), body: section.body.map(replace), steps: section.steps.map(replace),
        images: images.filter(image => image.section === section.title).map(image => ({
          afterStep: image.afterStep, dataUrl: image.dataUrl, alt: replace(image.alt), caption: replace(image.caption)
        }))
      }))
    };
  });
  for (const topicId of Object.keys(input.screenImages || {})) {
    if (!ids.has(topicId)) throw new Error(`Guide images refer to an unknown topic: ${topicId}`);
  }
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  const edition = digest(JSON.stringify({ topics, version, snapshots })).slice(0, 12);
  return { document: { version, edition, topics }, snapshots };
}

function generate(root, { review = false, check = false } = {}) {
  const reviewFile = path.join(root, 'docs/user-guides.reviewed.json');
  let reviewed = fs.existsSync(reviewFile) ? JSON.parse(fs.readFileSync(reviewFile, 'utf8')) : {};
  let result = compile(root, reviewed);
  if (review) {
    reviewed = result.snapshots;
    fs.writeFileSync(reviewFile, JSON.stringify(reviewed, null, 2) + '\n');
    result = compile(root, reviewed);
  }
  const output = `// Generated by scripts/generate-user-guides.cjs. Do not edit.\nimport { GuideDocument } from './guide.model';\nexport const USER_GUIDE: GuideDocument = ${JSON.stringify(result.document, null, 2)};\n`;
  const destination = path.join(root, 'src/app/help/generated-guide.ts');
  const pending = result.document.topics.filter(topic => topic.needsReview);
  if (check) {
    if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) throw new Error('Generated guide is stale. Run npm run guides:generate.');
    if (pending.length) throw new Error(`Guide review required: ${pending.map(topic => topic.id).join(', ')}`);
  } else if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, output);
  }
  console.log(`MAGE guides: ${result.document.topics.length} topics; edition ${result.document.edition}; ${pending.length} require review.`);
  return result;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  try {
    generate(root, { review: process.argv.includes('--review'), check: process.argv.includes('--check') });
    if (process.argv.includes('--watch')) {
      let timer;
      const schedule = (_, file) => {
        if (!file || String(file).includes('generated-guide.ts') || String(file).includes('user-guides.reviewed.json')) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          try { generate(root); } catch (error) { console.error(`MAGE guide update failed: ${error.message}`); }
        }, 250);
      };
      for (const dir of ['src', 'projects/core-lib', 'docs', '../service/src', '../plugins', '../instance']) {
        fs.watch(path.resolve(root, dir), { recursive: true }, schedule);
      }
      fs.watch(path.join(root, 'package.json'), schedule);
      console.log('Watching guide content and workflow sources. Review acknowledgements are never automatic.');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { compile, generate, readControl, sourceFiles };
