import { NextResponse } from "next/server";

import { getDealByThread, getThreadById, updateDealByThread } from "@/lib/server/api-store";
import { getMockSessionToken } from "@/lib/server/session";
import { getBuyerFromSessionToken } from "@/lib/server/api-store";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token);
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const { threadId } = await params;
  const thread = getThreadById(threadId);
  if (!thread || thread.buyerEmail !== buyer.email) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const deal = await getDealByThread(threadId);
  return NextResponse.json({ deal });
}

export async function PATCH(request: Request, { params }: Params) {
  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token);
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (status !== "相談中" && status !== "進行中" && status !== "完了") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { threadId } = await params;
  const thread = getThreadById(threadId);
  if (!thread || thread.buyerEmail !== buyer.email) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const deal = await updateDealByThread(threadId, { status, updatedBy: "buyer", title: body?.title });
  return NextResponse.json({ deal });
}
