import { NextResponse } from "next/server";

import { getDealByThread, getVendorOwnedThreadByUserId, proposeDealStatusChange, resolveDealStatusProposal } from "@/lib/server/api-store";
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

  const deal = await getDealByThread(threadId);
  return NextResponse.json({ deal });
}

export async function PATCH(request: Request, { params }: Params) {
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  const { threadId } = await params;
  const thread = await getVendorOwnedThreadByUserId(threadId, vendor.id);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  if (action === "propose") {
    const status = body?.status;
    if (status !== "相談中" && status !== "進行中" && status !== "完了") {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const result = await proposeDealStatusChange(threadId, {
      status,
      updatedBy: "vendor",
      title: body?.title,
      senderUserId: vendor.id
    });
    if (!result.deal) return NextResponse.json({ error: result.error ?? "ステータス提案を保存できませんでした。" }, { status: 400 });
    return NextResponse.json({ deal: result.deal });
  }

  if (action === "accept" || action === "reject") {
    const result = await resolveDealStatusProposal(threadId, {
      action,
      updatedBy: "vendor",
      senderUserId: vendor.id
    });
    if (!result.deal) return NextResponse.json({ error: result.error ?? "ステータス提案を更新できませんでした。" }, { status: 400 });
    return NextResponse.json({ deal: result.deal });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
