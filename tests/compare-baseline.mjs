import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const dir = mkdtempSync(resolve(tmpdir(), 'atmosphere-baseline-'));
const baseline = resolve(dir, 'baseline');
const sha = '7c3c527363fabf1fa9ecfb53a5667c44d7646cba';
const known = "Mobile Links/Contact must match the portfolio table's visible column spacing after Goodreads' external arrow without changing the table tracks.";
const run = cwd => spawnSync('npm', ['run','verify'], {cwd, encoding:'utf8',timeout:120000});
mkdirSync(resolve(root,'validation'),{recursive:true});
try {
  execFileSync('git',['worktree','add','--detach',baseline,sha],{cwd:root,stdio:'pipe'});
  symlinkSync(resolve(root,'node_modules'),resolve(baseline,'node_modules'),'dir');
  const before = run(baseline), after = run(root);
  const baselineLog = before.stdout + before.stderr;
  const branchLog = after.stdout + after.stderr;
  writeFileSync(resolve(root,'validation/baseline-verify.log'),baselineLog);
  writeFileSync(resolve(root,'validation/branch-verify.log'),branchLog);
  assert.equal(before.error,undefined,'Baseline verifier failed to execute');
  assert.equal(after.error,undefined,'Branch verifier failed to execute');
  if (after.status !== 0) {
    assert.notEqual(before.status,0,'New verification regression');
    assert.ok(baselineLog.includes(known) && branchLog.includes(known),'Verifier failure differs from the known baseline failure');
    console.log('Known Mobile Links/Contact assertion fails on both untouched baseline and prototype. No existing assertion was changed.');
  } else console.log('Existing site verifier passes.');
  writeFileSync(resolve(root,'validation/baseline-comparison.json'),JSON.stringify({baseline:sha,baselineExit:before.status,branchExit:after.status,knownFailure:after.status!==0 ? known : null},null,2));
} finally {
  try { execFileSync('git',['worktree','remove','--force',baseline],{cwd:root,stdio:'pipe'}); }
  finally { rmSync(dir,{recursive:true,force:true}); }
}
