import { NextResponse } from "next/server";

import { getDealByThread, getThreadById, updateDealByThread } from "@/lib/server/api-store";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { searchParams } = new URL(request.url);
  const vendorCompanyId = String(searchParams.get("vendorCompanyId") ?? "").trim();
  if (!vendorCompanyId) return NextResponse.json({ error: "vendorCompanyId is required." }, { status: 400 });

  const { threadId } = await params;
  const thread = getThreadById(threadId);
  if (!thread || thread.vendorCompanyId !== vendorCompanyId) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const deal = await getDealByThread(threadId);
  return NextResponse.json({ deal });
}

export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  const status = body?.status;
  const vendorCompanyId = String(body?.vendorCompanyId ?? "").trim();
  if (!vendorCompanyId) return NextResponse.json({ error: "vendorCompanyId is required." }, { status: 400 });
  if (status !== "相談中" && status !== "進行中" && status !== "完了") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { threadId } = await params;
  const thread = getThreadById(threadId);
  if (!thread || thread.vendorCompanyId !== vendorCompanyId) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const deal = await updateDealByThread(threadId, { status, updatedBy: "vendor", title: body?.title });
  return NextResponse.json({ deal });
}
