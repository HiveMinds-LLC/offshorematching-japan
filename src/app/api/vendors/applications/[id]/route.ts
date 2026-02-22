import { NextResponse } from "next/server";

import { reviewVendorApplication } from "@/lib/server/api-store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be approved or rejected." }, { status: 400 });
  }

  const { id } = await params;
  const updated = await reviewVendorApplication(id, decision);
  if (!updated) return NextResponse.json({ error: "対象申請が見つかりません。" }, { status: 404 });
  return NextResponse.json({ application: updated });
}
