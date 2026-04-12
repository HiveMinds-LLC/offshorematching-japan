import { NextResponse } from "next/server";

import { createThreadForBuyerByUserId, listThreadsForBuyerByUserId } from "@/lib/server/api-store";
import { getCurrentBuyerSession } from "@/lib/server/buyer-auth";

export async function GET() {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const threads = await listThreadsForBuyerByUserId(buyer.id, buyer.email);
  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const vendorCompanyId = String(body?.vendorCompanyId ?? "").trim();
  if (!vendorCompanyId) return NextResponse.json({ error: "vendorCompanyId is required." }, { status: 400 });

  const thread = await createThreadForBuyerByUserId(buyer.id, buyer.email, vendorCompanyId);
  if (!thread) return NextResponse.json({ error: "スレッドを作成できませんでした。" }, { status: 400 });
  return NextResponse.json({ thread });
}
