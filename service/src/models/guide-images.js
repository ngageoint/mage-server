'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const failure = (status, message) => Object.assign(new Error(message), { status });

/** Keep guide media in MAGE's backed-up resource volume, not in database settings. */
function imageStore(root) {
  function filename(scope, id) {
    if (!/^(global|event-[0-9]+)$/.test(scope) || !/^[a-f0-9]{32}$/.test(id)) {
      throw failure(400, 'Invalid guide image reference.');
    }
    return path.join(root, scope, `${id}.png`);
  }
  return {
    async upload(scope, dataUrl) {
      if (typeof dataUrl !== 'string' || dataUrl.length > 1500000 ||
          !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(dataUrl)) {
        throw failure(400, 'Use a PNG, JPEG or WebP screenshot no larger than 1 MiB.');
      }
      const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
      if (bytes.length > 1024 * 1024) throw failure(413, 'Screenshot exceeds 1 MiB.');
      const kind = dataUrl.slice(11, dataUrl.indexOf(';'));
      const matches = kind === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : kind === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (!matches) throw failure(400, 'Screenshot content must match its PNG, JPEG or WebP format.');
      const { loadImage, Canvas } = require('skia-canvas');
      let png;
      try {
        const image = await loadImage(bytes);
        if (image.width > 4096 || image.height > 4096 || image.width * image.height > 8000000) {
          throw new Error('Image dimensions exceed the allowed size.');
        }
        const canvas = new Canvas(image.width, image.height);
        canvas.getContext('2d').drawImage(image, 0, 0);
        png = await canvas.toBuffer('png');
      } catch (_) { throw failure(400, 'Screenshot could not be decoded or is too large.'); }
      if (png.length > 1024 * 1024) throw failure(413, 'Processed screenshot exceeds 1 MiB.');
      const id = crypto.randomBytes(16).toString('hex');
      const file = filename(scope, id);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, png, { flag: 'wx', mode: 0o600 });
      return { assetId: id, dataUrl: `data:image/png;base64,${png.toString('base64')}` };
    },
    async read(scope, id) {
      try { return await fs.readFile(filename(scope, id)); }
      catch (err) {
        if (err.code === 'ENOENT') throw failure(404, 'Guide screenshot was not found.');
        throw err;
      }
    }
  };
}
module.exports = { imageStore };
