import { NextResponse } from "next/server";

import { listThreadsForVendor } from "@/lib/server/api-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorCompanyId = String(searchParams.get("vendorCompanyId") ?? "").trim();
  if (!vendorCompanyId) {
    return NextResponse.json({ error: "vendorCompanyId is required." }, { status: 400 });
  }

  const threads = await listThreadsForVendor(vendorCompanyId);
  return NextResponse.json({ threads });
}
