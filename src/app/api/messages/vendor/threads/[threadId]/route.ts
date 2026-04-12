import { NextResponse } from "next/server";

import { deleteVendorThreadByUserId, getVendorOwnedThreadByUserId } from "@/lib/server/api-store";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

type Params = { params: Promise<{ threadId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const { threadId } = await params;
  const thread = await getVendorOwnedThreadByUserId(threadId, vendor.id);
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const deleted = await deleteVendorThreadByUserId(threadId, vendor.id);
  if (!deleted) return NextResponse.json({ error: "チャットの削除に失敗しました。" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
