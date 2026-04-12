import { NextResponse } from "next/server";

import { addMessageToThread, getVendorOwnedThreadByUserId, listMessagesByThread } from "@/lib/server/api-store";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const { threadId } = await params;
  const thread = await getVendorOwnedThreadByUserId(threadId, vendor.id);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const messages = await listMessagesByThread(threadId);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: Params) {
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "body is required." }, { status: 400 });

  const { threadId } = await params;
  const thread = await getVendorOwnedThreadByUserId(threadId, vendor.id);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const message = await addMessageToThread(threadId, "vendor", text, vendor.id);
  if (!message) return NextResponse.json({ error: "メッセージ送信に失敗しました。" }, { status: 400 });
  return NextResponse.json({ message });
}
