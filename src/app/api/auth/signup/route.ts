import { NextResponse } from "next/server";

import { createBuyerSignup } from "@/lib/server/api-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const companyName = String(body.companyName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const contactName = String(body.contactName ?? "").trim();
  const industry = String(body.industry ?? "").trim();

  if (!companyName || !email || password.length < 6) {
    return NextResponse.json({ error: "会社名・メール・6文字以上のパスワードを入力してください。" }, { status: 400 });
  }

  const result = await createBuyerSignup({ companyName, email, password, contactName, industry });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ buyer: result.buyer });
}
