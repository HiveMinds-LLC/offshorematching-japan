import { NextResponse } from "next/server";

import { getVendorBillingAccount, updateVendorBillingStatus } from "@/lib/server/api-store";

type Params = { params: Promise<{ companyId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { companyId } = await params;
  const billingAccount = await getVendorBillingAccount(companyId);
  if (!billingAccount) {
    return NextResponse.json({ error: "請求アカウントが見つかりません。" }, { status: 404 });
  }
  return NextResponse.json({ billingAccount });
}

export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "pause" && action !== "resume" && action !== "cancel") {
    return NextResponse.json({ error: "action must be pause, resume, or cancel." }, { status: 400 });
  }

  const { companyId } = await params;
  const billingAccount = await updateVendorBillingStatus(companyId, action);
  if (!billingAccount) {
    return NextResponse.json({ error: "請求アカウントが見つかりません。" }, { status: 404 });
  }
  return NextResponse.json({ billingAccount });
}
