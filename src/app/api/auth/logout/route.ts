import { NextResponse } from "next/server";

import { mockDb } from "@/lib/server/mock-db";
import { clearMockSessionToken, getMockSessionToken } from "@/lib/server/session";

export async function POST() {
  const token = await getMockSessionToken();
  mockDb.logout(token);
  await clearMockSessionToken();
  return NextResponse.json({ ok: true });
}
