// The only file that holds colour literals.
//
// Provenance: sampled from brand/LOGO  BUREAU PNG.png (2000x2000, RGBA colour type 6, fully opaque).
// Method: k-means (k=8, seed 7, 60k random pixels) on the logo; every centroid was then snapped to the
// nearest real pixel, and that pixel's coordinate is recorded below. The eye white is the brightest real
// pixel inside the left eye window. Nothing here is hand-picked; gates re-read each coordinate from the PNG.
// Derived steps (k1, k3, k4, k5, k11) are mixes of two sampled colours and carry no literal of their own.
export const samples = [
  { id: 'k0', hex: '#0d0b0b', x: 1255, y: 1068, note: 'pupil black' },
  { id: 'k2', hex: '#2a1c40', x: 0, y: 0, note: 'background plum, 83% of the image' },
  { id: 'k6', hex: '#7e5158', x: 1069, y: 995, note: 'deep fold shadow' },
  { id: 'k7', hex: '#a6797e', x: 1361, y: 862, note: 'fold shade' },
  { id: 'k8', hex: '#bd9195', x: 1273, y: 635, note: 'mid pink' },
  { id: 'k9', hex: '#d2a6a9', x: 1116, y: 618, note: 'body pink' },
  { id: 'k10', hex: '#e8c0c2', x: 1073, y: 591, note: 'light pink' },
  { id: 'k12', hex: '#f3dfde', x: 667, y: 1006, note: 'highlight blush' },
  { id: 'k13', hex: '#ffffff', x: 763, y: 944, note: 'eye white' }
];

// [id, first, second, percent of first]
export const mixes = [
  ['k1', 'k0', 'k2', 55],
  ['k3', 'k2', 'k6', 82],
  ['k4', 'k2', 'k6', 62],
  ['k5', 'k2', 'k6', 42],
  ['k11', 'k10', 'k12', 50]
];

export const sampleHex = Object.fromEntries(samples.map((s) => [s.id, s.hex]));
export const paletteHexes = samples.map((s) => s.hex);

export function tokensCss() {
  const lines = [
    ...samples.map((s) => `  --${s.id}: ${s.hex};`),
    ...mixes.map(([id, a, b, p]) => `  --${id}: color-mix(in oklch, var(--${a}) ${p}%, var(--${b}));`)
  ];
  lines.sort((a, b) => Number(a.match(/--k(\d+)/)[1]) - Number(b.match(/--k(\d+)/)[1]));
  return `:root {\n${lines.join('\n')}\n  color-scheme: dark;\n}\n`;
}
