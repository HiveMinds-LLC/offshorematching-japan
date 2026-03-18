import { NextResponse } from "next/server";

import { activateVendorBillingAccount } from "@/lib/server/api-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const applicationId = String(body?.applicationId ?? "").trim();
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required." }, { status: 400 });
  }

  const billingAccount = await activateVendorBillingAccount(applicationId);
  if (!billingAccount) {
    return NextResponse.json({ error: "対象の請求アカウントが見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ billingAccount });
}
