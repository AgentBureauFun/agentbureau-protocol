# Contributing to Bureau

## Ground rules

1. **One record per external fact.** Names, addresses, URLs and endpoints live in `src/register.json` with a state of `stated`, `absent` or `unconfirmed`. Never hard-code them elsewhere.
2. **No link without a statement.** Store the full URL and derive the handle. A record that is not `stated` must not produce an `href`.
3. **Never over-reject addresses.** The contract gate accepts any base58 string of 32 to 44 characters and nothing else is checked.
4. **Achromatic palette.** Colour literals belong in `src/tokens.mjs` only, with chroma exactly 0.
5. **Respect motion preferences.** Every animation needs a `prefers-reduced-motion` path.

## Workflow

```bash
npm run build
npm run gates
```

Both must exit 0 before a change is proposed. Keep changes small and describe what they alter for a reader of the site.

## Style

Plain modules, no build-time dependencies, no inline styles or scripts (the content security policy blocks them). Copy is original; do not paste text from other sites.
