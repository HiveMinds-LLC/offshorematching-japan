import { NextResponse } from "next/server";

import { loginBuyer } from "@/lib/server/api-store";
import { setMockSessionToken } from "@/lib/server/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "メールとパスワードを入力してください。" }, { status: 400 });
  }

  const result = await loginBuyer(email, password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  await setMockSessionToken(result.token);
  return NextResponse.json({ buyer: result.buyer });
}
