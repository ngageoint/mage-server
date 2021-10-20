import fs from 'fs-extra';

/**
 * Return an array of module paths located under the given directory.  The
 * result will not contain the index file or any source map or TypeScript
 * declaration files.  The returned paths are relative to the given parent
 * directory.
 * @param dir path to a directory containing JS or TS module files
 */
export function modulesPathsInDir(dir: string): string[] {
  return fs.readdirSync(dir).filter(file => {
    return !(
      file[0] === '.' ||
      !/\.(ts|js|json)$/.test(file) ||
      /^index\./.test(file) ||
      /\.d\.ts/.test(file) ||
      /\.map$/.test(file)
    )
  });
}