import { NextResponse } from "next/server";

import { adminRenewVendorAccess } from "@/lib/server/api-store";
import { getCurrentAdminSession } from "@/lib/server/admin-auth";

type Params = { params: Promise<{ companyId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ error: "管理者ログインが必要です。" }, { status: 401 });

  const { companyId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const accessEndsAt = String(body.accessEndsAt ?? "").trim();
  const plan = body.plan === "translation" ? "translation" : body.plan === "basic" ? "basic" : undefined;

  if (!accessEndsAt || Number.isNaN(Date.parse(accessEndsAt))) {
    return NextResponse.json({ error: "有効な利用終了日を入力してください。" }, { status: 400 });
  }

  const result = await adminRenewVendorAccess(companyId, accessEndsAt, plan);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ billingAccount: result.billingAccount });
}
