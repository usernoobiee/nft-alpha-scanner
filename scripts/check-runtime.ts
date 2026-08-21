// Keep the Vercel entry points loadable without asking TypeScript to expand the
// OpenSea SDK's full declaration graph during deployment.
await import("../api/index.ts");
await import("../api/well-known/[slug].ts");
