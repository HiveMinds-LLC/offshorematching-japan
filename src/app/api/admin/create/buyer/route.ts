import { NextResponse } from "next/server";

import { adminCreateBuyerAccount } from "@/lib/server/api-store";
import { getCurrentAdminSession } from "@/lib/server/admin-auth";

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ error: "管理者ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const companyName = String(body.companyName ?? "").trim();
  const contactName = String(body.contactName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const industry = String(body.industry ?? "").trim();

  if (!companyName || !contactName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return NextResponse.json({ error: "会社名・担当者名・メール・8文字以上のパスワードを入力してください。" }, { status: 400 });
  }

  const result = await adminCreateBuyerAccount({ companyName, contactName, email, password, industry });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ buyer: result.buyer });
}
