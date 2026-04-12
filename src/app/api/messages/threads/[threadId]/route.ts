import { NextResponse } from "next/server";

import { deleteBuyerThreadByUserId, getBuyerOwnedThreadByUserId } from "@/lib/server/api-store";
import { getCurrentBuyerSession } from "@/lib/server/buyer-auth";

type Params = { params: Promise<{ threadId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const { threadId } = await params;
  const thread = await getBuyerOwnedThreadByUserId(threadId, buyer.id, buyer.email);
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const deleted = await deleteBuyerThreadByUserId(threadId, buyer.id, buyer.email);
  if (!deleted) return NextResponse.json({ error: "チャットの削除に失敗しました。" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
