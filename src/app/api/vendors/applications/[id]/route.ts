import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/server/admin-auth";
import { reviewVendorApplication } from "@/lib/server/api-store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ error: "管理者ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== "approved" && decision !== "changes_requested" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be approved, changes_requested, or rejected." }, { status: 400 });
  }

  const { id } = await params;
  const updated = await reviewVendorApplication(id, decision, {
    reviewNote: typeof body?.reviewNote === "string" ? body.reviewNote : undefined,
    reviewedBy: admin.id
  });
  if (!updated) return NextResponse.json({ error: "対象申請が見つかりません。" }, { status: 404 });
  return NextResponse.json({ application: updated });
}
