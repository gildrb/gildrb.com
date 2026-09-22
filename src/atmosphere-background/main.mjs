import './background.css';
import * as vgpu from 'vgpu';
import * as atmosphere from '@gildrb/atmosphere-example/renderer';
import { PRESETS, DEFAULT_PRESET } from '@gildrb/atmosphere-example/tuning';
import copy from './copy.wgsl';
import rain from './rain.wgsl';
import lens from './lens.wgsl';
import { createBackgroundStart } from './runtime.mjs';

let owner;
let canvas;
let generation = 0;
function unmount() {
  generation += 1;
  owner?.dispose();
  owner = undefined;
  canvas?.remove();
  canvas = undefined;
}
function mount() {
  if (canvas || !navigator.gpu || !window.isSecureContext) return;
  const attempt = ++generation;
  const element = document.createElement('canvas');
  element.id = 'gildrb-atmosphere-background';
  element.setAttribute('aria-hidden', 'true');
  element.tabIndex = -1;
  // Existing site DOM, controls, event handlers and theme remain untouched.
  document.body.prepend(element);
  canvas = element;
  const reportFailure = error => {
    if (attempt !== generation) return;
    console.warn('Atmosphere unavailable; retaining the original site background.', error);
    unmount();
  };
  const start = createBackgroundStart({
    vgpu, atmosphere, preset: PRESETS[DEFAULT_PRESET], shaders: { copy, rain, lens },
    onFailure: reportFailure,
    onReady: () => { element.dataset.ready = 'true'; },
  });
  // Reuse the upstream lifetime serializer, including its late-initialization cleanup.
  owner = atmosphere.createRenderer({ canvas: element }, start);
  owner.ready.catch(reportFailure);
}
window.addEventListener('pagehide', unmount);
window.addEventListener('pageshow', mount);
mount();
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('pagehide', unmount);
    window.removeEventListener('pageshow', mount);
    unmount();
  });
}
