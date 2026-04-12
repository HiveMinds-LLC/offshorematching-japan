import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getVendorBillingAccount, syncVendorBillingAccountFromStripe } from "@/lib/server/api-store";
import { retrieveStripeCheckoutSession } from "@/lib/server/stripe";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

function getSubscriptionPlan(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId && priceId === process.env.STRIPE_VENDOR_TRANSLATION_MONTHLY_PRICE_ID) return "translation" as const;
  return "basic" as const;
}

export async function POST(request: Request) {
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = await retrieveStripeCheckoutSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "決済セッションを確認できませんでした。" }, { status: 500 });
  }

  const applicationId = session.metadata?.application_id ?? null;
  const companyId = session.metadata?.company_id ?? null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subscription = session.subscription && typeof session.subscription !== "string" ? session.subscription : null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  const subscriptionPeriodEnd =
    subscription && "current_period_end" in subscription && typeof subscription.current_period_end === "number"
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  await syncVendorBillingAccountFromStripe({
    applicationId,
    companyId,
    customerId,
    subscriptionId,
    plan: session.metadata?.plan === "translation" ? "translation" : "basic",
    subscriptionStatus: subscription?.status ?? (session.payment_status === "paid" ? "active" : "incomplete"),
    currentPeriodEnd: subscriptionPeriodEnd
  });

  if (!companyId) {
    return NextResponse.json({ error: "請求対象の会社情報が見つかりません。" }, { status: 400 });
  }

  const billingAccount = await getVendorBillingAccount(companyId);
  if (!billingAccount) {
    return NextResponse.json({ error: "請求状態の反映に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ billingAccount });
}
