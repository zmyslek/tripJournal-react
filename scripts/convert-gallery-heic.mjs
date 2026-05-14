import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const publicRoot = path.resolve('./public/temporary-gallery');
const manifestPath = path.join(publicRoot, 'manifest.json');
const heicExts = new Set(['.heic', '.heif']);
const minimumValidJpegSize = 1000;

async function walk(dir) {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  const out = [];

  for (const ent of ents) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...await walk(full));
    } else {
      out.push(full);
    }
  }

  return out;
}

async function isValidJpeg(jpegPath, heicPath) {
  try {
    const jpegStat = await fs.stat(jpegPath);
    if (jpegStat.size < minimumValidJpegSize) {
      return false;
    }

    const heicStat = await fs.stat(heicPath);
    if (jpegStat.mtime <= heicStat.mtime) {
      return false;
    }

    await sharp(jpegPath).metadata();
    return true;
  } catch {
    return false;
  }
}

async function decodeHeicToJpegBuffer(heicPath) {
  const inputBuffer = await fs.readFile(heicPath);
  const heicConvertModule = await import('heic-convert');
  const heicConvert = heicConvertModule.default ?? heicConvertModule;
  const converted = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.92
  });

  return Buffer.isBuffer(converted) ? converted : Buffer.from(converted);
}

async function findHeicFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findHeicFiles(fullPath));
    } else if (heicExts.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function findAllJpegFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findAllJpegFiles(fullPath));
    } else if (/\.jpe?g$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function convertHeicToJpeg(heicPath) {
  const jpegPath = heicPath.replace(/\.(heic|heif)$/i, '.jpg');
  await fs.mkdir(path.dirname(jpegPath), { recursive: true });

  if (await isValidJpeg(jpegPath, heicPath)) {
    console.log(`✓ Valid JPEG exists: ${path.relative(publicRoot, jpegPath)} (${(await fs.stat(jpegPath)).size} bytes)`);
    return jpegPath;
  }

  await fs.rm(jpegPath, { force: true });

  try {
    const inputStat = await fs.stat(heicPath);
    console.log(`🔄 Converting: ${path.relative(publicRoot, heicPath)} (${inputStat.size} bytes)`);

    const inputBuffer = await fs.readFile(heicPath);
    const inputMetadata = await sharp(inputBuffer).metadata();
    console.log(`   Original: ${inputMetadata.width}x${inputMetadata.height}, format: ${inputMetadata.format}`);

    const jpegBuffer = await decodeHeicToJpegBuffer(heicPath);
    await fs.writeFile(jpegPath, jpegBuffer);

    const outputStat = await fs.stat(jpegPath);
    if (outputStat.size < minimumValidJpegSize) {
      throw new Error(`Output file too small: ${outputStat.size} bytes`);
    }

    await sharp(jpegPath).metadata();
    console.log(`✅ Converted to: ${path.relative(publicRoot, jpegPath)} (${outputStat.size} bytes)`);
    return jpegPath;
  } catch (err) {
    console.error(`❌ Failed to convert ${path.relative(publicRoot, heicPath)}:`, err.message || err);
    await fs.rm(jpegPath, { force: true });
    return null;
  }
}

async function updateManifest() {
  console.log('\n📝 Updating manifest.json...');

  const jpegFiles = await findAllJpegFiles(publicRoot);
  const relativePaths = jpegFiles
    .map(filePath => path.relative(publicRoot, filePath).replaceAll('\\', '/'))
    .sort();

  if (relativePaths.length === 0) {
    console.warn('⚠️ No JPEG files found!');
    return;
  }

  await fs.writeFile(manifestPath, JSON.stringify(relativePaths, null, 2), 'utf-8');
  console.log(`✅ Manifest updated with ${relativePaths.length} JPEG files`);
  console.log('📋 First 5 manifest entries:');
  relativePaths.slice(0, 5).forEach(entry => console.log(`   - ${entry}`));

  const heicEntries = relativePaths.filter(entry => /\.heic/i.test(entry));
  if (heicEntries.length > 0) {
    console.error(`❌ Found ${heicEntries.length} HEIC entries still in manifest!`);
  }
}

async function main() {
  console.log('🚀 Starting HEIC to JPEG conversion\n');

  const exists = await fs.stat(publicRoot).then(() => true).catch(() => false);
  if (!exists) {
    console.error('public/temporary-gallery not found. Run from project root.');
    process.exit(1);
  }

  const heicFiles = await findHeicFiles(publicRoot);
  console.log(`📁 Found ${heicFiles.length} HEIC/HEIF files\n`);

  let converted = 0;
  for (const heicPath of heicFiles) {
    const jpegPath = await convertHeicToJpeg(heicPath);
    if (jpegPath) {
      converted += 1;
    }
  }

  console.log(`\n✅ Converted/verified: ${converted}/${heicFiles.length} files`);
  await updateManifest();

  console.log('\n✨ Gallery conversion complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});