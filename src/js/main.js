import register from './register.data.js';
import { byId, isStated } from './lib/register.js';
import { $ } from './util.js';
import { initCopy, initTabs, initBrief, initVerifier, initScroll } from './ui.js';
import { mountRain } from './rain.js';
import { mountLattice } from './lattice.js';
import { mountTape } from './tape.js';
import { startLive } from './live.js';

initScroll();
initCopy();
initBrief();
initVerifier();
mountRain($('[data-rain]'));

const zoomV = $('[data-zoom-v]');
const lattice = mountLattice($('[data-lattice]'), { onZoom: (z) => (zoomV.textContent = `${Math.round(z * 100)}%`) });
initTabs((i) => lattice.setChapter(i));
document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => lattice.zoomBy(Number(b.dataset.zoom))));

const rpc = byId(register, 'rpc');
if (isStated(rpc)) startLive({ rpcUrl: rpc.value, tape: mountTape($('[data-tape]')) });
