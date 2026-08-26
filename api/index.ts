import { toolHandler } from "../src/handler.js";

// Vercel's default body parser can leave req.body unavailable for some
// deployments. Disable it and pass the raw request body to the OpenSea SDK
// as a standard Web Request. This keeps the SDK's POST/JSON validation intact.
export const config = {
  api: {
    bodyParser: false,
  },
};

type VercelRequestLike = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: "data" | "end" | "error", listener: (...args: any[]) => void): void;
};

type VercelResponseLike = {
  status(code: number): VercelResponseLike;
  setHeader(name: string, value: string): VercelResponseLike;
  send(body: string): void;
  end(): void;
};

function readRawBody(req: VercelRequestLike): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  try {
    const protocol =
      typeof req.headers["x-forwarded-proto"] === "string"
        ? req.headers["x-forwarded-proto"]
        : "https";
    const host =
      typeof req.headers.host === "string" ? req.headers.host : "localhost";
    const url = `${protocol}://${host}${req.url ?? "/"}`;
    const method = req.method ?? "GET";

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }

    const body = method === "GET" || method === "HEAD" ? undefined : await readRawBody(req);
    const webRequest = new Request(url, {
      method,
      headers,
      body,
    });

    const webResponse = await toolHandler(webRequest);

    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(await webResponse.text());
  } catch (error) {
    console.error("Tool endpoint error:", error);
    res.status(500).setHeader("content-type", "application/json");
    res.send(JSON.stringify({ error: "Internal tool error" }));
  }
}
