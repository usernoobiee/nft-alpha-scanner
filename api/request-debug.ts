import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const body = req.body as unknown;
  return res.status(200).json({
    method: req.method,
    contentType: req.headers["content-type"] ?? null,
    contentLength: req.headers["content-length"] ?? null,
    bodyType: body === null ? "null" : Array.isArray(body) ? "array" : typeof body,
    bodyIsUndefined: body === undefined,
    bodyIsBuffer: Buffer.isBuffer(body),
    bodyValue: typeof body === "string" ? body.slice(0, 500) : body ?? null,
  });
}
