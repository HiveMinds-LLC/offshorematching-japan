import { NextResponse } from "next/server";

import { createPendingBillingAccount, getVendorApplicationByUserId, getVendorCompanyByUserId } from "@/lib/server/api-store";
import { createStripeVendorCheckoutSession } from "@/lib/server/stripe";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

function safeOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function POST(request: Request) {
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const selectedPlan = body?.plan === "translation" ? "translation" : body?.plan === "basic" ? "basic" : null;

  const [application, company] = await Promise.all([
    getVendorApplicationByUserId(vendor.id),
    getVendorCompanyByUserId(vendor.id)
  ]);
  if (!application?.id || !application.company?.id || !application.company?.name || !application.contactEmail) {
    return NextResponse.json({ error: "請求対象の申請情報が見つかりません。" }, { status: 400 });
  }

  const resolvedApplication = company
    ? {
        ...application,
        company: {
          ...application.company,
          id: company.id,
          name: company.name
        }
      }
    : application;
  const checkoutPlan = selectedPlan ?? (application.company.plan === "translation" ? "translation" : "basic");
  const billingAccount = await createPendingBillingAccount(resolvedApplication, checkoutPlan);
  if (!billingAccount) {
    return NextResponse.json({ error: "請求情報の準備に失敗しました。Stripe セッションを開始できませんでした。" }, { status: 500 });
  }

  try {
    const stripeSession = await createStripeVendorCheckoutSession({
      applicationId: String(resolvedApplication.id),
      companyId: String(resolvedApplication.company.id),
      companyName: String(resolvedApplication.company.name),
      contactName: String(resolvedApplication.contactName ?? resolvedApplication.company.contactName ?? resolvedApplication.company.name),
      contactEmail: String(resolvedApplication.contactEmail),
      stripeCustomerId: billingAccount.stripeCustomerId,
      plan: checkoutPlan,
      origin: safeOrigin(request)
    });

    if (stripeSession?.url) {
      return NextResponse.json({ url: stripeSession.url, provider: "stripe" });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe セッションの生成に失敗しました。" },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: "Stripe 設定が不足しています。" }, { status: 500 });
}
