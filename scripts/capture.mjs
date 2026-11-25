import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] || 'http://127.0.0.1:4173/jevlab/';
await mkdir(resolve(root, 'screenshots'), { recursive: true });

const steps = [
  ['open', base], ['resize', '1440', '900'],
  ['screenshot', '--filename=screenshots/home-desktop.png'],
  ['resize', '390', '844'], ['goto', base], ['screenshot', '--filename=screenshots/home-mobile.png'],
  ['resize', '1440', '900'], ['goto', `${base}articles/judgment-vs-decision/`], ['screenshot', '--filename=screenshots/article-desktop.png'],
  ['goto', `${base}playground/`], ['screenshot', '--filename=screenshots/choice-playground.png'],
  ['eval', "document.getElementById('builder').scrollIntoView({block:'start'})"], ['screenshot', '--filename=screenshots/judgment-builder.png'],
  ['eval', "document.getElementById('calibration').scrollIntoView({block:'start'})"], ['screenshot', '--filename=screenshots/calibration-lab.png'],
  ['goto', `${base}learning-path/`], ['screenshot', '--filename=screenshots/learning-path.png'],
];

for (const args of steps) {
  const result = spawnSync('playwright-cli', args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) throw new Error(`playwright-cli ${args.join(' ')} 失败`);
}
console.log('截图完成，已写入 screenshots/。');
