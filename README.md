# NFT Alpha Scanner

An ERC-8257 OpenSea Agent Tool that evaluates an NFT collection using observable marketplace signals and returns a transparent heuristic score.

## What it does

The tool accepts an OpenSea collection slug and an optional ETH budget. It fetches collection statistics and recent sale activity, then produces:

- `BUY`, `WATCH`, or `AVOID` signal
- 0–100 opportunity score
- confidence estimate
- low/medium/high risk level
- floor price and 7-day floor momentum
- 7-day volume momentum
- 7-day sales and holder count
- recent 24-hour sales count
- optional budget-fit result
- human-readable reasons and risks

The score is a heuristic over observable marketplace data. It is not financial advice and does not predict future prices.

## Local setup

```bash
npm install
npm test
npm run build
```

If Windows Node runs out of heap during TypeScript compilation, the build script already allocates a 4 GB Node heap. You can also set `NODE_OPTIONS=--max-old-space-size=4096` in your shell.

Copy `.env.example` to `.env` and set `OPENSEA_API_KEY` for live API calls. Never commit `.env`.

## Deployment

Deploy the project to Vercel. Set these environment variables in Vercel:

- `OPENSEA_API_KEY`
- `TOOL_ENDPOINT`
- `CREATOR_ADDRESS`
- `TOOL_METADATA_URL`

The manifest is served at:

`/.well-known/ai-tool/nft-alpha-scanner.json`

The tool endpoint is:

`/api`

The manifest and endpoint must use the same public origin.

## Registration

After deployment and manifest verification, use the OpenSea Tool SDK to register on Base:

```bash
npm run register
```

Set `TOOL_METADATA_URL` and the wallet/RPC environment variables required by the SDK before registering. Never expose or commit a wallet private key.

## CI

GitHub Actions runs the tests and TypeScript build on pushes and pull requests.
