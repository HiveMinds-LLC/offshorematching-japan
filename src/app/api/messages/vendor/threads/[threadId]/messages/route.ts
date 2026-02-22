import { NextResponse } from "next/server";

import { addMessageToThread, getThreadById, listMessagesByThread } from "@/lib/server/api-store";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { threadId } = await params;
  const { searchParams } = new URL(request.url);
  const vendorCompanyId = String(searchParams.get("vendorCompanyId") ?? "").trim();
  if (!vendorCompanyId) return NextResponse.json({ error: "vendorCompanyId is required." }, { status: 400 });

  const thread = getThreadById(threadId);
  if (!thread || thread.vendorCompanyId !== vendorCompanyId) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const messages = await listMessagesByThread(threadId);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  const vendorCompanyId = String(body?.vendorCompanyId ?? "").trim();
  if (!text) return NextResponse.json({ error: "body is required." }, { status: 400 });
  if (!vendorCompanyId) return NextResponse.json({ error: "vendorCompanyId is required." }, { status: 400 });

  const { threadId } = await params;
  const thread = getThreadById(threadId);
  if (!thread || thread.vendorCompanyId !== vendorCompanyId) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const message = await addMessageToThread(threadId, "vendor", text);
  return NextResponse.json({ message });
}
