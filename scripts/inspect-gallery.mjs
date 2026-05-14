import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('./src/assets/temporary-gallery');
const videoExt = new Set(['.mp4','.mov','.webm','.m4v','.avi','.mkv','.wmv','.flv','.3gp','.mpeg']);
const imageExt = new Set(['.jpeg','.jpg','.png','.webp','.gif','.avif','.tif','.tiff','.bmp','.svg','.heic','.heif']);

async function walk(dir) {
  const res = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const ent of res) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...await walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

(async function main(){
  try{
    const files = await walk(root);
    const sections = new Map();
    const loose = [];
    for (const f of files) {
      const rel = path.relative(root, f).replaceAll('\\\\','/');
      const seg = rel.split('/');
      const ext = path.extname(f).toLowerCase();
      const kind = videoExt.has(ext) ? 'video' : imageExt.has(ext) ? 'image' : 'other';
      if (seg.length === 1) loose.push({rel,kind,f});
      else if (seg.length === 3) {
        const label = `${seg[0]}/${seg[1]}`;
        const arr = sections.get(label) ?? [];
        arr.push({rel,kind,f});
        sections.set(label, arr);
      }
    }

    console.log('Loose files:', loose.length);
    console.log('Sections count:', sections.size);

    const sampleLabels = ['Spain/Valencia'];
    for (const [label, arr] of sections.entries()) {
      const images = arr.filter(a=>a.kind==='image').length;
      const videos = arr.filter(a=>a.kind==='video').length;
      if (sampleLabels.includes(label)) {
        console.log(`\nSection ${label}: images=${images} videos=${videos} total=${arr.length}`);
        console.log('Example files:', arr.slice(0,10).map(a=>a.rel));
      }
    }

    console.log('\nTop 10 sections by total items:');
    const sorted = [...sections.entries()].sort((a,b)=>b[1].length - a[1].length).slice(0,10);
    for (const [label, arr] of sorted) {
      console.log(`${label}: ${arr.length} (images:${arr.filter(a=>a.kind==='image').length} videos:${arr.filter(a=>a.kind==='video').length})`);
    }
  } catch (err) {
    console.error(err);
  }
})();
