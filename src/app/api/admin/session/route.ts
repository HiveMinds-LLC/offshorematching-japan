import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/server/admin-auth";

export async function GET() {
  const admin = await getCurrentAdminSession();
  return NextResponse.json({ admin });
}
