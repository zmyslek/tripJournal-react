import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const galleryRoot = path.resolve('public', 'temporary-gallery');
const outputPath = path.join(galleryRoot, 'manifest.json');
const githubFileSizeLimitBytes = 95 * 1024 * 1024;
const mediaExtensions = new Set([
  '.avi',
  '.avif',
  '.bmp',
  '.flv',
  '.gif',
  '.heic',
  '.jpeg',
  '.jpg',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp4',
  '.mpeg',
  '.png',
  '.svg',
  '.tif',
  '.tiff',
  '.webm',
  '.wmv'
]);

async function collectMediaFiles(directory, baseDirectory = directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectMediaFiles(absolutePath, baseDirectory);
      }

      if (!entry.isFile() || entry.name === 'manifest.json') {
        return [];
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!mediaExtensions.has(extension)) {
        return [];
      }

      const fileStats = await stat(absolutePath);
      if (fileStats.size > githubFileSizeLimitBytes) {
        return [];
      }

      return [path.relative(baseDirectory, absolutePath).split(path.sep).join('/')];
    })
  );

  return files.flat().sort((pathA, pathB) => pathA.localeCompare(pathB));
}

const manifest = await collectMediaFiles(galleryRoot);
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
