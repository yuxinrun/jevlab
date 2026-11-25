import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), 'content');
for (const file of await readdir(dir)) {
  if (!file.endsWith('.mjs')) continue;
  const path = resolve(dir, file);
  const lines = (await readFile(path, 'utf8')).split('\n');
  let inBody = false;
  let fixed = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBody && line.includes('body: `')) { inBody = true; continue; }
    if (inBody && /`\s*$/.test(line) && (lines[i + 1] || '').trim() === '},') { inBody = false; continue; }
    if (inBody && /(?<!\\)`/.test(line)) {
      lines[i] = line.replace(/(?<!\\)`/g, '\\`');
      fixed++;
    }
  }
  if (fixed) {
    await writeFile(path, lines.join('\n'), 'utf8');
    console.log(`${file}: 修复 ${fixed} 行`);
  }
}
