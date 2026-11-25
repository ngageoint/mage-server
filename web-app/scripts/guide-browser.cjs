const fs = require('node:fs');
const path = require('node:path');

// No host-specific service or browser download. Maintainers can provide their
// installed Chrome/Chromium, or put it on PATH on any supported build host.
function findGuideBrowser(env = process.env, platform = process.platform) {
  function executable(file) {
    try {
      fs.accessSync(file, platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK);
      return fs.statSync(file).isFile();
    } catch { return false; }
  }
  if (env.CHROME_BIN) {
    if (!executable(env.CHROME_BIN)) throw new Error('CHROME_BIN must point to an executable Chrome or Chromium file.');
    return env.CHROME_BIN;
  }
  const names = platform === 'win32' ? ['chrome.exe', 'chromium.exe'] :
    ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  const candidates = (env.PATH || env.Path || '').split(platform === 'win32' ? ';' : path.delimiter)
    .filter(Boolean).flatMap(dir => names.map(name => path.join(dir, name)));
  if (platform === 'darwin') candidates.push(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium');
  if (platform === 'win32') {
    for (const dir of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean)) {
      candidates.push(path.join(dir, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(dir, 'Chromium', 'Application', 'chrome.exe'));
    }
  }
  const browser = candidates.find(executable);
  if (!browser) throw new Error('Install Chrome/Chromium on the build host or set CHROME_BIN to its executable. Current packaged captures do not require a browser.');
  return browser;
}
module.exports = { findGuideBrowser };
