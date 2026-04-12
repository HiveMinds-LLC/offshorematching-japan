import { NextResponse } from "next/server";

import { getMarketplaceStats, listCompaniesForMarketplace } from "@/lib/server/api-store";

export async function GET() {
  const [companies, stats] = await Promise.all([listCompaniesForMarketplace(), getMarketplaceStats()]);
  return NextResponse.json(
    { companies, stats },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
