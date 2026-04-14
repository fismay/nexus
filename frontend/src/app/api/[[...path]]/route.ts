import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function backendOrigin(): string {
  const a = process.env.BACKEND_ORIGIN?.trim().replace(/\/$/, "");
  if (a) return a;
  const internal = process.env.INTERNAL_API_URL?.trim().replace(/\/$/, "");
  if (internal) return internal.replace(/\/api$/, "") || internal;
  return "http://127.0.0.1:8000";
}

function buildDestination(req: NextRequest, segments: string[]): string {
  const path = segments.length ? segments.join("/") : "";
  const base = backendOrigin();
  const qs = new URL(req.url).search;
  return path ? `${base}/api/${path}${qs}` : `${base}/api/${qs}`;
}

function forwardHeaders(req: NextRequest): Headers {
  const h = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "host" || k === "connection") return;
    h.append(key, value);
  });
  return h;
}

async function proxy(req: NextRequest, segments: string[]): Promise<Response> {
  const dest = buildDestination(req, segments);
  const headers = forwardHeaders(req);

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
    init.body = req.body;
    init.duplex = "half";
  }

  const res = await fetch(dest, init);
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: new Headers(res.headers),
  });
}

type Ctx = { params: Promise<{ path?: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? []);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
