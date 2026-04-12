import { NextResponse } from "next/server";

import { cancelVendorBillingDowngrade, getVendorBillingAccount, scheduleVendorBillingDowngrade, updateVendorBillingPlan, updateVendorBillingStatus } from "@/lib/server/api-store";

type Params = { params: Promise<{ companyId: string }> };
export const dynamic = "force-dynamic";

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
  const { companyId } = await params;
  let billingAccount = null;

  if (action === "upgrade_translation") {
    billingAccount = await updateVendorBillingPlan(companyId, "translation");
  } else if (action === "downgrade_basic") {
    billingAccount = await scheduleVendorBillingDowngrade(companyId);
  } else if (action === "cancel_downgrade") {
    billingAccount = await cancelVendorBillingDowngrade(companyId);
  } else if (action === "pause" || action === "resume" || action === "cancel") {
    billingAccount = await updateVendorBillingStatus(companyId, action);
  } else {
    return NextResponse.json({ error: "action must be pause, resume, cancel, upgrade_translation, downgrade_basic, or cancel_downgrade." }, { status: 400 });
  }

  if (!billingAccount) {
    return NextResponse.json({ error: "請求アカウントが見つかりません。" }, { status: 404 });
  }
  return NextResponse.json({ billingAccount });
}
