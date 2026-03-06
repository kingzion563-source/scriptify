import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Scriptify Script Preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchScript(slug: string) {
  const res = await fetch(`${API_URL}/api/v1/scripts/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    title: string;
    status: string;
    coverUrl: string | null;
    game: { name: string } | null;
  }>;
}

async function loadSpaceGrotesk() {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap"
  ).then((r) => r.text());
  const match = css.match(/src: url\(([^)]+)\) format\('(woff2|woff|truetype)'\)/);
  if (!match?.[1]) return null;
  return fetch(match[1]).then((r) => r.arrayBuffer());
}

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const script = await fetchScript(params.slug);
  const fontData = await loadSpaceGrotesk().catch(() => null);
  const gameName = script?.game?.name ?? "Roblox";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "black",
          color: "white",
          fontFamily: "Space Grotesk",
          padding: 40,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 500,
            height: "100%",
            display: "flex",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid gray",
            background: "black",
          }}
        >
          {script?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={script.coverUrl} alt="" width={500} height={550} style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "gray" }}>
              Scriptify
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 40, flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", marginBottom: 14 }}>
            <span
              style={{
                fontSize: 20,
                textTransform: "uppercase",
                fontWeight: 700,
                borderRadius: 6,
                border: "1px solid #3a3a3a",
                padding: "6px 10px",
                color: "gainsboro",
              }}
            >
              {script?.status?.toUpperCase?.() ?? "TESTING"}
            </span>
          </div>
          <div style={{ fontSize: 58, lineHeight: 1.1, fontWeight: 700, maxWidth: 560 }}>
            {script?.title ?? "Script"}
          </div>
          <div style={{ fontSize: 32, color: "darkgray", marginTop: 18 }}>{gameName}</div>
        </div>
        <div style={{ position: "absolute", right: 28, bottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18, color: "white", fontWeight: 700 }}>Scriptify</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/logo.png`} alt="" width={34} height={34} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Space Grotesk",
              data: fontData,
              style: "normal",
              weight: 700,
            },
          ]
        : [],
    }
  );
}

