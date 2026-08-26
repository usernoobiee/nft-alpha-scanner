import type { VercelRequest, VercelResponse } from "@opensea/tool-sdk";
import { toolHandler } from "../src/handler.js";

/**
 * Normalize Vercel's possible request-body representations into the Web
 * Request format expected by the OpenSea Tool SDK. Depending on runtime and
 * parser configuration, Vercel can expose JSON as an object, string, Buffer,
 * Uint8Array, or rawBody.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto ?? "https";
  const hostHeader = req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader ?? "localhost";
  const url = `${protocol}://${host}${req.url ?? "/"}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let body: string | undefined;

  if (hasBody) {
    const candidate = req.body as unknown;

    if (typeof candidate === "string") {
      body = candidate;
    } else if (Buffer.isBuffer(candidate)) {
      body = candidate.toString("utf8");
    } else if (candidate instanceof Uint8Array) {
      body = Buffer.from(candidate).toString("utf8");
    } else if (candidate !== undefined && candidate !== null) {
      body = JSON.stringify(candidate);
    } else if (req.rawBody) {
      body = Buffer.from(req.rawBody).toString("utf8");
    }
  }

  const webRequest = new Request(url, {
    method: req.method,
    headers,
    body,
  });

  const webResponse = await toolHandler(webRequest);

  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.send(await webResponse.text());
}
