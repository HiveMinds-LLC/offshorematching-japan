import { NextResponse } from "next/server";

import { listSavedCompanyIdsByBuyerUserId, removeSavedCompanyForBuyerUserId, saveCompanyForBuyerUserId } from "@/lib/server/api-store";
import { getCurrentBuyerSession } from "@/lib/server/buyer-auth";

export async function GET() {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const companyIds = await listSavedCompanyIdsByBuyerUserId(buyer.id);
  return NextResponse.json({ companyIds });
}

export async function POST(request: Request) {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const companyId = String(body?.companyId ?? "").trim();
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });

  const result = await saveCompanyForBuyerUserId(buyer.id, companyId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const companyId = String(body?.companyId ?? "").trim();
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });

  const result = await removeSavedCompanyForBuyerUserId(buyer.id, companyId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
