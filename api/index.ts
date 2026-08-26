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

async function diagnoseOpenSea(collectionSlug: string) {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENSEA_API_KEY is not configured" };
  }

  const headers = { accept: "application/json", "x-api-key": apiKey };
  const statsUrl = `https://api.opensea.io/api/v2/collections/${encodeURIComponent(collectionSlug)}/stats`;
  const eventsUrl = `https://api.opensea.io/api/v2/events/collection/${encodeURIComponent(collectionSlug)}?event_type=sale&limit=10`;

  const [statsResult, eventsResult] = await Promise.allSettled([
    fetch(statsUrl, { headers, cache: "no-store" }),
    fetch(eventsUrl, { headers, cache: "no-store" }),
  ]);

  const summarize = async (result: PromiseSettledResult<Response>) => {
    if (result.status === "rejected") {
      return { ok: false, error: result.reason instanceof Error ? result.reason.message : String(result.reason) };
    }
    const text = await result.value.text();
    return {
      ok: result.value.ok,
      status: result.value.status,
      body: text.slice(0, 500),
    };
  };

  return {
    ok: statsResult.status === "fulfilled" && statsResult.value.ok && eventsResult.status === "fulfilled" && eventsResult.value.ok,
    collectionSlug,
    apiKeyConfigured: true,
    stats: await summarize(statsResult),
    events: await summarize(eventsResult),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET is intentionally a diagnostic endpoint; the registered ERC-8257 tool remains POST-only.
  if (req.method === "GET") {
    try {
      const collectionSlug = typeof req.query?.collectionSlug === "string" ? req.query.collectionSlug : "boredapeyachtclub";
      return res.status(200).json(await diagnoseOpenSea(collectionSlug));
    } catch (error) {
      console.error("[diagnostic] error:", error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = normalizeBody(req);
    if (!body) {
      return res.status(400).json({
        error: "Missing request body",
        method: req.method,
        contentType: req.headers["content-type"] ?? null,
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
