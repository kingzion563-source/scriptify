import { NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const upstream = await fetch(
      `${API_URL}/api/v1/scripts/${encodeURIComponent(id)}/raw`,
      { next: { revalidate: 30 } }
    );

    if (!upstream.ok) {
      return new NextResponse(
        upstream.status === 404
          ? "-- Script not found --"
          : "-- Error fetching script --",
        {
          status: upstream.status,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    const code = await upstream.text();

    return new NextResponse(code, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return new NextResponse("-- Error fetching script --", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
