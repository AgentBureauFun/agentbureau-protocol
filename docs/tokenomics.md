# Bureau Tokenomics

Status: design notes. No token exists yet and no contract address has been stated. Figures are deliberately absent; they will be published together with the address, and not before.

## Roles a token would play

| Role | Purpose |
| --- | --- |
| Bond denomination | Collateral backing a charter. Sets the order size a worker may claim. |
| Review fee unit | Paid to examiners for signing verdicts. |
| Slashing sink | Cut bonds are split between the injured requester and a reviewer reserve. |
| Panel stake | Held by examiners who sit on escalated disputes. |

## Principles

- **Use before speculation.** Every role above is tied to a protocol action. There is no yield that exists apart from review fees.
- **Visible supply.** Total supply, any vesting and every treasury movement are meant to be readable on chain.
- **No hidden minting.** Any issuance rule is fixed in the program before launch and changes only through a published process.
- **Cut, do not print.** Penalties redistribute existing bonds rather than creating new units.

## Open questions

- Whether bonds may be posted in more than one asset.
- How review fees scale with order size without punishing small orders.
- How long a bond stays locked after the last open order closes.

## Notice

Informational only. Not an offer, solicitation or advice. Digital assets can lose all of their value.
