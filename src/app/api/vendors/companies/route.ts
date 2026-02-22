import { NextResponse } from "next/server";

import { listCompaniesForMarketplace } from "@/lib/server/api-store";

export async function GET() {
  const companies = await listCompaniesForMarketplace();
  return NextResponse.json({ companies });
}
