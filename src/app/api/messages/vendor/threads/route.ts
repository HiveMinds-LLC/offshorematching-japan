import { NextResponse } from "next/server";

import { listThreadsForVendorByUserId } from "@/lib/server/api-store";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

export async function GET() {
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const threads = await listThreadsForVendorByUserId(vendor.id);
  return NextResponse.json({ threads });
}
