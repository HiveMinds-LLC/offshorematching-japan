import { NextResponse } from "next/server";

import { getBuyerFromSessionToken } from "@/lib/server/api-store";
import { getMockSessionToken } from "@/lib/server/session";

export async function GET() {
  const token = await getMockSessionToken();
  const buyer = getBuyerFromSessionToken(token) ?? null;
  return NextResponse.json({ buyer });
}
