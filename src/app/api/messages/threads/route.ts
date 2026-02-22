import { NextResponse } from "next/server";

import { createThreadForBuyer, listThreadsForBuyer } from "@/lib/server/api-store";
import { getMockSessionToken } from "@/lib/server/session";
import { getBuyerFromSessionToken } from "@/lib/server/api-store";

export async function GET() {
  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token);
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const threads = await listThreadsForBuyer(buyer.email);
  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token);
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const vendorCompanyId = String(body?.vendorCompanyId ?? "").trim();
  if (!vendorCompanyId) return NextResponse.json({ error: "vendorCompanyId is required." }, { status: 400 });

  const thread = await createThreadForBuyer(buyer.email, vendorCompanyId);
  return NextResponse.json({ thread });
}
