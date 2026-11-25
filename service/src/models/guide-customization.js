'use strict';

const Setting = require('./setting');
const MAX_BYTES = 256 * 1024;
const failure = (status, message) => Object.assign(new Error(message), { status });

function validateState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Number.isSafeInteger(input.revision) || input.revision < 0 || input.revision >= Number.MAX_SAFE_INTEGER ||
      !input.overrides || typeof input.overrides !== 'object' || Array.isArray(input.overrides)) {
    throw failure(400, 'Expected a revision and a guide overrides object.');
  }
  if (Buffer.byteLength(JSON.stringify(input)) > MAX_BYTES || Object.keys(input.overrides).length > 1000) {
    throw failure(413, 'Guide customizations exceed the allowed size.');
  }
  const overrides = Object.create(null);
  let imageCount = 0;
  const safePart = part => /^[a-z0-9][a-z0-9_-]{0,159}$/.test(part) &&
    !['__proto__', 'constructor', 'prototype'].includes(part);
  for (const [key, value] of Object.entries(input.overrides)) {
    if (key.split('/').length > 2 || !key.split('/').every(safePart) ||
        !value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(k => !['hidden', 'title', 'body', 'steps', 'source', 'images'].includes(k))) {
      throw failure(400, 'Invalid guide customization key or properties.');
    }
    const edit = {};
    if ('hidden' in value) {
      if (typeof value.hidden !== 'boolean') throw failure(400, 'Guide visibility must be true or false.');
      edit.hidden = value.hidden;
    }
    for (const field of ['title', 'source']) {
      if (field in value) {
        if (typeof value[field] !== 'string' || value[field].length > (field === 'source' ? 40000 : 300)) {
          throw failure(400, 'Invalid guide text.');
        }
        edit[field] = value[field];
      }
    }
    for (const field of ['body', 'steps']) {
      if (field in value) {
        if (!Array.isArray(value[field]) || value[field].length > 150 ||
            value[field].some(t => typeof t !== 'string' || t.length > 10000)) {
          throw failure(400, 'Guide paragraphs and steps must be bounded plain text arrays.');
        }
        edit[field] = [...value[field]];
      }
    }
    if ('images' in value) {
      if (!key.includes('/') || !Array.isArray(value.images) || value.images.length > 20) {
        throw failure(400, 'A guide section can contain up to 20 screenshots.');
      }
      imageCount += value.images.length;
      if (imageCount > 100) throw failure(413, 'A guide can contain up to 100 customized screenshots.');
      edit.images = value.images.map(image => {
        if (!image || typeof image !== 'object' ||
            Object.keys(image).some(k => !['assetId', 'generatedIndex', 'alt', 'caption', 'afterStep', 'afterParagraph'].includes(k)) ||
            (typeof image.assetId === 'string') === Number.isSafeInteger(image.generatedIndex) ||
            (image.assetId !== undefined && !/^[a-f0-9]{32}$/.test(image.assetId)) ||
            (image.generatedIndex !== undefined && (!Number.isSafeInteger(image.generatedIndex) || image.generatedIndex < 0 || image.generatedIndex > 100)) ||
            !Number.isSafeInteger(image.afterStep) || image.afterStep < 0 || image.afterStep > 150 ||
            (image.afterParagraph !== undefined && (!Number.isSafeInteger(image.afterParagraph) || image.afterParagraph < 0 || image.afterParagraph > 150)) ||
            typeof image.alt !== 'string' || !image.alt.trim() || image.alt.length > 500 ||
            typeof image.caption !== 'string' || image.caption.length > 2000) {
          throw failure(400, 'Invalid screenshot reference, description or placement.');
        }
        return { ...image };
      });
    }
    overrides[key] = edit;
  }
  return { revision: input.revision, overrides };
}

function repository(model = Setting.Model) {
  return {
    async get(type) {
      const setting = await model.findOne({ type }).lean().exec();
      return setting?.settings || { revision: 0, overrides: {} };
    },
    async save(type, input) {
      const state = validateState(input);
      const settings = { revision: state.revision + 1, overrides: state.overrides };
      const saved = await model.findOneAndUpdate(
        { type, 'settings.revision': state.revision }, { $set: { settings } }, { new: true }
      ).lean().exec();
      if (saved) return saved.settings;
      if (state.revision === 0) {
        try { await model.create({ type, settings }); return settings; }
        catch (err) { if (err.code !== 11000) throw err; }
      }
      throw failure(409, 'The guide was changed by another administrator. Reload before saving again.');
    }
  };
}
module.exports = { validateState, repository };
