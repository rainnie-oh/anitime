import sharp from 'sharp';
import {readdir, mkdir, writeFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const source = 'public/covers', destination = 'public/covers/optimized';
await mkdir(destination, {recursive:true});
const manifest = {};
let originalBytes = 0, thumbnailBytes = 0;
for (const file of await readdir(source)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const input = path.join(source, file);
  const hash = createHash('sha256').update(await (await import('node:fs/promises')).readFile(input)).digest('hex').slice(0,12);
  const stem = path.parse(file).name + '-' + hash;
  const preview = await sharp(input).rotate().resize({width:24,withoutEnlargement:true}).webp({quality:35}).toBuffer();
  const variants = [];
  for (const width of [80,164,328,656]) {
    const name = `${stem}-${width}.webp`;
    const result = await sharp(input).rotate().resize({width,withoutEnlargement:true}).webp({quality:90}).toFile(path.join(destination,name));
    variants.push({src:`/covers/optimized/${name}`,width:result.width});
    if (width === 328) thumbnailBytes += result.size;
  }
  manifest[`/covers/${file}`] = {preview:`data:image/webp;base64,${preview.toString('base64')}`, variants};
  originalBytes += (await stat(input)).size;
}
await writeFile('src/cover-images.json', JSON.stringify(manifest));
console.log(`${Object.keys(manifest).length} covers: ${(originalBytes/1024/1024).toFixed(2)} MB originals → ${(thumbnailBytes/1024/1024).toFixed(2)} MB at 328px`);
