import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/server/admin-auth";
import { listVendorProfilesForAdmin } from "@/lib/server/api-store";

export async function GET() {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ error: "管理者ログインが必要です。" }, { status: 401 });

  const companies = await listVendorProfilesForAdmin();
  return NextResponse.json({ companies });
}
