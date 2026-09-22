import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const API = ['createRenderer', 'createGraph', 'applyState', 'renderGraph', 'resizeGraph', 'destroyGraph'];
async function filesBelow(directory, files = []) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name === 'node_modules' || item.name === '.git') continue;
    const file = path.join(directory, item.name);
    if (item.isSymbolicLink()) throw new Error(`Unexpected symlink in the pulled example: ${file}`);
    if (item.isDirectory()) await filesBelow(file, files);
    else if (item.isFile()) files.push(file);
    if (files.length > 5000) throw new Error('Example unexpectedly exceeds 5,000 files.');
  }
  return files;
}
async function exists(file) {
  try { return (await stat(file)).isFile(); } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

/** Discover the CLI's layout instead of guessing its exported folder structure. */
export async function discoverAtmosphere(root) {
  const directory = path.resolve(root, 'atmosphere');
  let files;
  try { files = await filesBelow(directory); } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('The official example is missing. Restore the vendored atmosphere directory from this branch; no substitute is generated.');
    }
    throw error;
  }
  const candidates = [];
  for (const file of files.filter(file => path.basename(file) === 'renderer.ts')) {
    const source = await readFile(file, 'utf8');
    if (API.every(name => new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(source))) candidates.push(file);
  }
  if (candidates.length !== 1) throw new Error('The downloaded Atmosphere example API differs from the inspected version. Review its renderer before integrating; no substitute is generated.');
  const renderer = candidates[0];
  const tuning = path.join(path.dirname(renderer), 'tuning.ts');
  if (!await exists(tuning)) throw new Error('Atmosphere tuning.ts is missing.');
  const all = new Set(files);
  const visited = new Set();
  const bareImports = new Set();
  async function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const text = await readFile(file, 'utf8');
    const imports = [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g)].map(match => match[1]);
    for (const specifier of imports) {
      if (!specifier.startsWith('.')) { bareImports.add(specifier); continue; }
      const base = path.resolve(path.dirname(file), specifier);
      if (!base.startsWith(directory + path.sep)) throw new Error(`Import escapes the downloaded example: ${specifier}`);
      const resolved = [base, ...['.ts', '.tsx', '.js', '.mjs', '.wgsl'].map(ext => base + ext), path.join(base, 'index.ts')].find(file => all.has(file));
      if (!resolved) throw new Error(`Incomplete download: ${path.relative(directory, file)} imports missing ${specifier}`);
      await visit(resolved);
    }
  }
  await visit(renderer);
  await visit(tuning);
  return { directory, renderer, tuning, files: files.length, closure: visited.size, bareImports: [...bareImports].sort() };
}
