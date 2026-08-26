import type { VercelRequest, VercelResponse } from "@opensea/tool-sdk";
import { toolHandler } from "../src/handler.js";

/**
 * Vercel's Node runtime may expose the request payload as `body`, `rawBody`,
 * or (depending on parser configuration) a string/object. Normalize all of
 * those forms into the Web Request expected by the OpenSea Tool SDK.
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
    if (typeof req.body === "string") {
      body = req.body;
    } else if (req.body !== undefined) {
      body = JSON.stringify(req.body);
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
