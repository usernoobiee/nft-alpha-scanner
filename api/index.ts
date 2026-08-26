import type { VercelRequest, VercelResponse } from "@opensea/tool-sdk";
import { toolHandler } from "../src/handler.js";

function normalizeBody(req: VercelRequest): string | undefined {
  const body = req.body as unknown;
  if (typeof body === "string") return body;
  if (body !== undefined && body !== null) {
    if (Buffer.isBuffer(body)) return body.toString("utf8");
    if (body instanceof Uint8Array) return Buffer.from(body).toString("utf8");
    return JSON.stringify(body);
  }

  const rawBody = (req as VercelRequest & { rawBody?: Buffer | Uint8Array | string }).rawBody;
  if (typeof rawBody === "string") return rawBody;
  if (rawBody) return Buffer.from(rawBody).toString("utf8");
  return undefined;
}

function queryBody(req: VercelRequest): string | undefined {
  const collectionSlug = typeof req.query?.collectionSlug === "string" ? req.query.collectionSlug : undefined;
  if (!collectionSlug) return undefined;
  const maxPriceRaw = typeof req.query?.maxPriceEth === "string" ? req.query.maxPriceEth : undefined;
  const maxPriceEth = maxPriceRaw === undefined ? undefined : Number(maxPriceRaw);
  return JSON.stringify({
    collectionSlug,
    ...(maxPriceEth !== undefined && Number.isFinite(maxPriceEth) ? { maxPriceEth } : {}),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = normalizeBody(req) ?? queryBody(req);

    if (!body) {
      return res.status(400).json({
        error: "Missing request body",
        method: req.method,
        contentType: req.headers["content-type"] ?? null,
        hint: "POST JSON or use ?collectionSlug=boredapeyachtclub for a diagnostic GET",
      });
    }

    try {
      JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body", bodyPreview: body.slice(0, 200) });
    }

    const protocolHeader = req.headers["x-forwarded-proto"];
    const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader ?? "https";
    const hostHeader = req.headers.host;
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader ?? "localhost";
    const url = `${protocol}://${host}${req.url ?? "/api"}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const webRequest = new Request(url, {
      method: "POST",
      headers,
      body,
    });

    const webResponse = await toolHandler(webRequest);
    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => res.setHeader(key, value));
    return res.send(await webResponse.text());
  } catch (error) {
    console.error("[vercel-adapter] unhandled error:", error);
    return res.status(500).json({
      error: "Endpoint adapter error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
