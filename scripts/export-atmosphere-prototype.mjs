import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite';
import { discoverAtmosphere } from './atmosphere-source.mjs';

const root = resolve(import.meta.dirname, '..');
const example = await discoverAtmosphere(root);
const tmp = resolve(root,'.prototype-build');
await build({configFile:false,root,publicDir:false,plugins:[wgslVitePlugin()],resolve:{alias:{'@gildrb/atmosphere-example/renderer':example.renderer,'@gildrb/atmosphere-example/tuning':example.tuning}},build:{outDir:tmp,emptyOutDir:true,lib:{entry:resolve(root,'src/atmosphere-background/main.mjs'),name:'GildrbAtmosphere',formats:['iife'],fileName:()=> 'background.js',cssFileName:'background'},rollupOptions:{output:{inlineDynamicImports:true}}}});
let html = await readFile(resolve(root,'public/index.html'),'utf8');
const js = await readFile(resolve(tmp,'background.js'),'utf8');
const css = await readFile(resolve(tmp,'background.css'),'utf8');
// The original site remains the foreground; only asset packaging changes.
// Existing remote fonts and portfolio media are referenced, not redistributed.
html = html.replace('<head>','<head>\n        <base href="https://gildrb.com/" />');
html = html.replace(/<link rel="stylesheet" href="\/atmosphere-background.css" data-atmosphere-background \/>/,()=>`<style data-atmosphere-background>${css}</style>`);
html = html.replace(/<script type="module" src="\/atmosphere-background.js" data-atmosphere-background><\/script>/,()=>`<script data-atmosphere-background>${js.replaceAll('</script','<\\/script')}</script>`);
const licenses = [];
for (const file of ['atmosphere/LICENSE','node_modules/vgpu/LICENSE','node_modules/@vgpu/core/LICENSE','node_modules/@vgpu/wgsl/LICENSE','node_modules/@vgpu/wgsl-std/LICENSE','node_modules/lil-gui/LICENSE.md']) {
  try { licenses.push(file + '\n' + await readFile(resolve(root,file),'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
html = html.replace('</html>',`<!-- Third-party notices\n${licenses.join('\n\n').replaceAll('--','- -')}\n-->\n</html>`);
await mkdir(resolve(root,'prototype'),{recursive:true});
await writeFile(resolve(root,'prototype/gildrb-rain.html'),html);
await rm(tmp,{recursive:true,force:true});
console.log('Exported prototype/gildrb-rain.html');
