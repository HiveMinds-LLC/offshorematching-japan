type StripeCheckoutInput = {
  applicationId: string;
  companyId: string;
  companyName: string;
  contactEmail: string;
  plan: "basic" | "translation";
  origin: string;
};

type StripePortalInput = {
  customerId: string;
  origin: string;
  companyId: string;
};

async function postToStripe(body: URLSearchParams) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Stripe checkout session creation failed: ${text || response.statusText}`);
  }

  return response.json() as Promise<{ id: string; url?: string | null }>;
}

export async function createStripeVendorCheckoutSession(input: StripeCheckoutInput) {
  const priceId =
    input.plan === "translation"
      ? process.env.STRIPE_VENDOR_TRANSLATION_MONTHLY_PRICE_ID
      : process.env.STRIPE_VENDOR_MONTHLY_PRICE_ID;
  if (!process.env.STRIPE_SECRET_KEY || !priceId) return null;

  const successUrl = `${input.origin}/app/register/vendor/checkout-success?applicationId=${encodeURIComponent(input.applicationId)}`;
  const cancelUrl = `${input.origin}/app/register/vendor/checkout-cancel?applicationId=${encodeURIComponent(input.applicationId)}`;

  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("customer_email", input.contactEmail);
  body.set("line_items[0][price]", priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("metadata[application_id]", input.applicationId);
  body.set("metadata[company_id]", input.companyId);
  body.set("metadata[company_name]", input.companyName);
  body.set("metadata[plan]", input.plan);

  return postToStripe(body);
}

export async function createStripeBillingPortalSession(input: StripePortalInput) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  const body = new URLSearchParams();
  body.set("customer", input.customerId);
  body.set("return_url", `${input.origin}/app`);

  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Stripe billing portal creation failed: ${text || response.statusText}`);
  }

  return response.json() as Promise<{ id: string; url?: string | null }>;
}
