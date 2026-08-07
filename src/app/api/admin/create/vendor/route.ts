import { NextResponse } from "next/server";

import { adminCreateVendorAccount } from "@/lib/server/api-store";
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
  const plan = body.plan === "translation" ? "translation" : "basic";
  const country = String(body.country ?? "").trim();
  const accessEndsAt = String(body.accessEndsAt ?? "").trim();

  if (!companyName || !contactName || !email || password.length < 8) {
    return NextResponse.json({ error: "会社名・担当者名・メール・8文字以上のパスワードを入力してください。" }, { status: 400 });
  }
  if (!accessEndsAt || Number.isNaN(Date.parse(accessEndsAt))) {
    return NextResponse.json({ error: "有効な利用終了日を入力してください。" }, { status: 400 });
  }

  const result = await adminCreateVendorAccount({ companyName, contactName, email, password, plan, country, accessEndsAt });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ companyId: result.companyId });
}
