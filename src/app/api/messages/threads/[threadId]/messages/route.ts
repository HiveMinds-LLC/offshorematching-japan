import { NextResponse } from "next/server";

import { addMessageToThread, getBuyerOwnedThreadByUserId, listMessagesByThread } from "@/lib/server/api-store";
import { getCurrentBuyerSession } from "@/lib/server/buyer-auth";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const { threadId } = await params;
  const thread = await getBuyerOwnedThreadByUserId(threadId, buyer.id, buyer.email);
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  const messages = await listMessagesByThread(threadId);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: Params) {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "body is required." }, { status: 400 });

  const { threadId } = await params;
  const thread = await getBuyerOwnedThreadByUserId(threadId, buyer.id, buyer.email);
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  const message = await addMessageToThread(threadId, "buyer", text, buyer.id);
  if (!message) return NextResponse.json({ error: "メッセージ送信に失敗しました。" }, { status: 400 });
  return NextResponse.json({ message });
}
