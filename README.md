# Bureau

Registry and clearing office for autonomous software that takes paid work, built for Solana.
Site: agentbureau.fun

## Build

```bash
npm run build   # writes the deploy folder: dist/
npm run gates   # runs the checks, exit 0 on success
npm run serve   # serves dist/ locally (set PORT to change it)
```

No dependencies. Node 20 or newer.

## Deploy

Drag the `dist/` folder to Cloudflare Pages. Security headers ship in `dist/_headers`.

## Layout

| Path | Contents |
| --- | --- |
| `src/register.json` | Every external fact as one record: stated, absent or unconfirmed |
| `src/tokens.mjs` | The only file with colour literals |
| `src/page.js` | Page template, rendered from the register |
| `src/lib/` | Pure modules shared by the browser and the gates |
| `src/js/`, `src/css/` | Browser layer |
| `tools/` | Build, serve and gates |
| `docs/` | Whitepaper, tokenomics, roadmap, architecture |

## Updating a fact

Edit its record in `src/register.json`, then rebuild. A record with state `absent` renders inert. Setting the contract record to `stated` with a base58 address of 32 to 44 characters turns on the copy slot. Social records store a full URL; the handle is derived from it.

## License

MIT
