import { NextResponse } from "next/server";

import { runMatching } from "@/lib/server/api-store";
import { getMockSessionToken } from "@/lib/server/session";
import { getBuyerFromSessionToken } from "@/lib/server/api-store";

export async function POST(request: Request) {
  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token);
  if (!buyer) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = String(body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text is required." }, { status: 400 });

  const result = await runMatching(text, 6);
  return NextResponse.json(result);
}
