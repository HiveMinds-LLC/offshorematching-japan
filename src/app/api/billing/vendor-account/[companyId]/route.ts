import { NextResponse } from "next/server";

import { cancelVendorBillingDowngrade, getVendorBillingAccount, scheduleVendorBillingDowngrade, updateVendorBillingPlan, updateVendorBillingStatus } from "@/lib/server/api-store";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

type Params = { params: Promise<{ companyId: string }> };
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const { companyId } = await params;
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });
  if (vendor.companyId !== companyId) return NextResponse.json({ error: "この請求情報にアクセスする権限がありません。" }, { status: 403 });

  const billingAccount = await getVendorBillingAccount(companyId);
  if (!billingAccount) {
    return NextResponse.json({ error: "請求アカウントが見つかりません。" }, { status: 404 });
  }
  return NextResponse.json({ billingAccount });
}

export async function PATCH(request: Request, { params }: Params) {
  const { companyId } = await params;
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });
  if (vendor.companyId !== companyId) return NextResponse.json({ error: "この請求情報を変更する権限がありません。" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const action = body?.action;
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
