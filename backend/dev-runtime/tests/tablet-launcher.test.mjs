import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

test('tablet launcher stops the owned runtime before starting it again',()=>{
  const launcher=readFileSync(resolve('iniciar-eval-tablets.bat'),'utf8');
  const stop=launcher.indexOf('manage-dev.ps1" -Command stop');
  const start=launcher.indexOf('start-tablet-mode.ps1"');
  assert.notEqual(stop,-1,'launcher must stop the existing EVAL runtime');
  assert.ok(stop<start,'launcher must stop EVAL before starting tablet mode');
});
