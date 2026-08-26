type VercelRequestLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponseLike = {
  status(code: number): VercelResponseLike;
  json(body: unknown): void;
};

export default function handler(req: VercelRequestLike, res: VercelResponseLike) {
  res.status(200).json({
    method: req.method ?? null,
    contentType: req.headers?.["content-type"] ?? null,
    bodyType: typeof req.body,
    body: req.body ?? null,
  });
}
