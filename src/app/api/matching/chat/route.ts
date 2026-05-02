import { NextResponse } from "next/server";

import { runMatching } from "@/lib/server/api-store";
import { getCurrentBuyerSession } from "@/lib/server/buyer-auth";

export async function POST(request: Request) {
  const buyer = await getCurrentBuyerSession();
  if (!buyer) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const criteria = body?.criteria;
  if (!criteria || typeof criteria !== "object") {
    return NextResponse.json({ error: "criteria is required." }, { status: 400 });
  }

  const result = await runMatching(criteria, 6);
  return NextResponse.json(result);
}
