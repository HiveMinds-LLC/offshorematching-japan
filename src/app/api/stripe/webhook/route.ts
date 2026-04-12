import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { syncVendorBillingAccountFromStripe } from "@/lib/server/api-store";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/server/stripe";

function getSubscriptionPlan(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId && priceId === process.env.STRIPE_VENDOR_TRANSLATION_MONTHLY_PRICE_ID) return "translation" as const;
  return "basic" as const;
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncVendorBillingAccountFromStripe({
          applicationId: session.metadata?.application_id ?? null,
          companyId: session.metadata?.company_id ?? null,
          customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
          plan: session.metadata?.plan === "translation" ? "translation" : "basic",
          subscriptionStatus: session.payment_status === "paid" ? "active" : "incomplete"
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncVendorBillingAccountFromStripe({
          applicationId: subscription.metadata?.application_id ?? null,
          companyId: subscription.metadata?.company_id ?? null,
          customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
          subscriptionId: subscription.id,
          plan: getSubscriptionPlan(subscription),
          subscriptionStatus: subscription.status,
          currentPeriodEnd: subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
        });
        break;
      }
      case "subscription_schedule.created":
      case "subscription_schedule.updated":
      case "subscription_schedule.released":
      case "subscription_schedule.canceled":
      case "subscription_schedule.completed": {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const subscriptionId =
          typeof schedule.subscription === "string"
            ? schedule.subscription
            : schedule.subscription?.id ?? null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncVendorBillingAccountFromStripe({
            applicationId: subscription.metadata?.application_id ?? null,
            companyId: subscription.metadata?.company_id ?? null,
            customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
            subscriptionId: subscription.id,
            plan: getSubscriptionPlan(subscription),
            subscriptionStatus: subscription.status,
            currentPeriodEnd: subscription.items.data[0]?.current_period_end
              ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
              : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook handling failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
