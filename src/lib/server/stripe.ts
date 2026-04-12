import Stripe from "stripe";

type StripeCheckoutInput = {
  applicationId: string;
  companyId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  stripeCustomerId?: string;
  plan: "basic" | "translation";
  origin: string;
};

type StripePortalInput = {
  customerId: string;
  origin: string;
};

type StripeCancelAtPeriodEndInput = {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
};

type StripeChangePlanInput = {
  subscriptionId: string;
  plan: "basic" | "translation";
  applicationId?: string;
  companyId?: string;
  companyName?: string;
};

type StripeSchedulePlanChangeInput = {
  subscriptionId: string;
  nextPlan: "basic" | "translation";
};

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function stripePriceIdForPlan(plan: "basic" | "translation") {
  return plan === "translation"
    ? process.env.STRIPE_VENDOR_TRANSLATION_MONTHLY_PRICE_ID
    : process.env.STRIPE_VENDOR_MONTHLY_PRICE_ID;
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? "";
}

export function getStripeClient() {
  return getStripe();
}

async function ensureStripeCustomer(input: Pick<StripeCheckoutInput, "companyName" | "contactName" | "contactEmail" | "stripeCustomerId">) {
  const stripe = getStripe();
  if (!stripe) return null;

  const customerName = input.contactName.trim() || input.companyName.trim();

  if (input.stripeCustomerId) {
    return stripe.customers.update(input.stripeCustomerId, {
      email: input.contactEmail,
      name: customerName
    });
  }

  return stripe.customers.create({
    email: input.contactEmail,
    name: customerName
  });
}

export async function createStripeVendorCheckoutSession(input: StripeCheckoutInput) {
  const stripe = getStripe();
  const priceId =
    input.plan === "translation"
      ? process.env.STRIPE_VENDOR_TRANSLATION_MONTHLY_PRICE_ID
      : process.env.STRIPE_VENDOR_MONTHLY_PRICE_ID;

  if (!stripe || !priceId) return null;

  const customer = await ensureStripeCustomer(input);
  if (!customer) return null;

  return stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${input.origin}/app/register/vendor/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/app/register/vendor/checkout-cancel`,
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      application_id: input.applicationId,
      company_id: input.companyId,
      company_name: input.companyName,
      plan: input.plan
    },
    subscription_data: {
      metadata: {
        application_id: input.applicationId,
        company_id: input.companyId,
        company_name: input.companyName,
        plan: input.plan
      }
    }
  });
}

export async function createStripeBillingPortalSession(input: StripePortalInput) {
  const stripe = getStripe();
  if (!stripe) return null;

  return stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: `${input.origin}/app?section=vendor-billing&billing_return=1`
  });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return null;

  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"]
  });
}

export async function updateStripeSubscriptionCancelAtPeriodEnd(input: StripeCancelAtPeriodEndInput) {
  const stripe = getStripe();
  if (!stripe) return null;

  return stripe.subscriptions.update(input.subscriptionId, {
    cancel_at_period_end: input.cancelAtPeriodEnd
  });
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  if (!stripe) return null;

  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function retrieveStripeSubscriptionSchedule(scheduleId: string) {
  const stripe = getStripe();
  if (!stripe) return null;

  return stripe.subscriptionSchedules.retrieve(scheduleId);
}

export async function changeStripeSubscriptionPlan(input: StripeChangePlanInput) {
  const stripe = getStripe();
  const priceId = stripePriceIdForPlan(input.plan);
  if (!stripe || !priceId) return null;

  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return null;

  return stripe.subscriptions.update(input.subscriptionId, {
    cancel_at_period_end: false,
    proration_behavior: "always_invoice",
    items: [{ id: itemId, price: priceId }],
    metadata: {
      ...(input.applicationId ? { application_id: input.applicationId } : {}),
      ...(input.companyId ? { company_id: input.companyId } : {}),
      ...(input.companyName ? { company_name: input.companyName } : {}),
      plan: input.plan
    }
  });
}

export async function scheduleStripeSubscriptionPlanChangeAtPeriodEnd(input: StripeSchedulePlanChangeInput) {
  const stripe = getStripe();
  const nextPriceId = stripePriceIdForPlan(input.nextPlan);
  if (!stripe || !nextPriceId) return null;

  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
  const currentItem = subscription.items.data[0];
  const currentPriceId = currentItem?.price?.id;
  if (!currentItem?.id || !currentPriceId || !currentItem?.current_period_start || !currentItem?.current_period_end) return null;

  const existingScheduleId =
    typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule?.id;

  const schedule = existingScheduleId
    ? await stripe.subscriptionSchedules.retrieve(existingScheduleId)
    : await stripe.subscriptionSchedules.create({ from_subscription: subscription.id });

  return stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        start_date: currentItem.current_period_start,
        end_date: currentItem.current_period_end,
        items: [{ price: currentPriceId, quantity: currentItem.quantity ?? 1 }],
        proration_behavior: "none"
      },
      {
        items: [{ price: nextPriceId, quantity: currentItem.quantity ?? 1 }],
        proration_behavior: "none"
      }
    ]
  });
}

export async function releaseStripeSubscriptionSchedule(scheduleId: string) {
  const stripe = getStripe();
  if (!stripe) return null;

  return stripe.subscriptionSchedules.release(scheduleId);
}
