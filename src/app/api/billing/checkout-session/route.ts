import { NextResponse } from "next/server";

import { createPendingBillingAccount } from "@/lib/server/api-store";
import { createStripeVendorCheckoutSession } from "@/lib/server/stripe";

function safeOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const application = body.application;
  if (!application?.id || !application?.company?.id || !application?.company?.name || !application?.contactEmail) {
    return NextResponse.json({ error: "申請情報が不足しています。" }, { status: 400 });
  }

  await createPendingBillingAccount(application);

  try {
    const stripeSession = await createStripeVendorCheckoutSession({
      applicationId: String(application.id),
      companyId: String(application.company.id),
      companyName: String(application.company.name),
      contactEmail: String(application.contactEmail),
      plan: application.company.plan === "translation" ? "translation" : "basic",
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

  const fallbackUrl = `${safeOrigin(request)}/app/register/vendor/checkout-success?applicationId=${encodeURIComponent(String(application.id))}&mock=1`;
  return NextResponse.json({ url: fallbackUrl, provider: "mock" });
}
