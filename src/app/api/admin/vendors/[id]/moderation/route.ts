import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/server/admin-auth";
import { moderateVendorProfile } from "@/lib/server/api-store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ error: "管理者ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (action !== "deactivate" && action !== "reactivate" && action !== "flag" && action !== "remove") {
    return NextResponse.json({ error: "Invalid moderation action." }, { status: 400 });
  }

  const { id } = await params;
  const company = await moderateVendorProfile(id, action, reason || undefined);
  if (!company) return NextResponse.json({ error: "対象会社が見つかりません。" }, { status: 404 });

  return NextResponse.json({ company });
}
