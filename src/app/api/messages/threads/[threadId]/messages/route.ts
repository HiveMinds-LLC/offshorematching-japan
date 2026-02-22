import { NextResponse } from "next/server";

import { addMessageToThread, listMessagesByThread } from "@/lib/server/api-store";
import { getMockSessionToken } from "@/lib/server/session";
import { getBuyerFromSessionToken } from "@/lib/server/api-store";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token);
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const { threadId } = await params;
  const messages = await listMessagesByThread(threadId);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: Params) {
  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token);
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "body is required." }, { status: 400 });

  const { threadId } = await params;
  const message = await addMessageToThread(threadId, "buyer", text);
  return NextResponse.json({ message });
}
