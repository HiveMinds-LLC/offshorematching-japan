type VendorNewChatEmailInput = {
  vendorEmail: string;
  vendorCompanyName: string;
  buyerCompanyName: string;
  threadId: string;
};

type SendGridEmailInput = {
  toEmail: string;
  subject: string;
  text: string;
  html: string;
  category?: string;
  customArgs?: Record<string, string>;
};

function sendGridApiKey() {
  return process.env.SENDGRID_API_KEY;
}

function sendGridFromEmail() {
  return process.env.SENDGRID_FROM_EMAIL;
}

function sendGridFromName() {
  return process.env.SENDGRID_FROM_NAME || "OffshoreDevelopment.com";
}

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://offshoredevelopment.com";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendSendGridEmail(input: SendGridEmailInput) {
  const apiKey = sendGridApiKey();
  const fromEmail = sendGridFromEmail();
  const fromName = sendGridFromName();

  if (!apiKey || !fromEmail || !input.toEmail) {
    console.warn("[email] SendGrid skipped: missing configuration or recipient", {
      hasApiKey: Boolean(apiKey),
      hasFromEmail: Boolean(fromEmail),
      hasRecipient: Boolean(input.toEmail),
      category: input.category ?? null
    });
    return { ok: false, skipped: true, status: null as number | null, messageId: null as string | null };
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: input.toEmail }],
            subject: input.subject
          }
        ],
        from: {
          email: fromEmail,
          name: fromName
        },
        categories: input.category ? [input.category] : undefined,
        custom_args: input.customArgs,
        content: [
          {
            type: "text/plain",
            value: input.text
          },
          {
            type: "text/html",
            value: input.html
          }
        ]
      })
    });

    const messageId = response.headers.get("x-message-id");
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("[email] SendGrid request failed", {
        status: response.status,
        messageId,
        category: input.category ?? null,
        toEmail: input.toEmail,
        body: errorBody.slice(0, 1000)
      });
      return { ok: false, skipped: false, status: response.status, messageId };
    }

    console.info("[email] SendGrid email sent", {
      status: response.status,
      messageId,
      category: input.category ?? null,
      toEmail: input.toEmail
    });
    return { ok: true, skipped: false, status: response.status, messageId };
  } catch (error) {
    console.error("[email] SendGrid request threw", {
      category: input.category ?? null,
      toEmail: input.toEmail,
      error: error instanceof Error ? error.message : String(error)
    });
    return { ok: false, skipped: false, status: null as number | null, messageId: null as string | null };
  }
}

export async function sendVendorNewChatEmail(input: VendorNewChatEmailInput) {
  const safeVendorCompanyName = escapeHtml(input.vendorCompanyName || "Vendor");
  const safeBuyerCompanyName = escapeHtml(input.buyerCompanyName);
  const inboxUrl = `${appBaseUrl().replace(/\/$/, "")}/app?section=vendor-messages&thread=${encodeURIComponent(input.threadId)}`;
  const safeInboxUrl = escapeHtml(inboxUrl);
  const subject = `New project inquiry from ${input.buyerCompanyName}`;
  const text = [
    `You received a new project inquiry on OffshoreDevelopment.com.`,
    `Buyer: ${input.buyerCompanyName}`,
    `Company: ${input.vendorCompanyName || "Vendor"}`,
    "",
    "Open your vendor inbox to review the conversation:",
    inboxUrl,
    "",
    "You are receiving this email because your company account is active on OffshoreDevelopment.com."
  ].join("\n");
  const html = [
    `<div style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#0f172a;">`,
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">`,
    `<div style="padding:20px 24px;background:#1d4ed8 !important;color:#ffffff !important;border-bottom:1px solid #1e40af;">`,
    `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#dbeafe !important;-webkit-text-fill-color:#dbeafe;">OffshoreDevelopment.com</p>`,
    `<h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff !important;-webkit-text-fill-color:#ffffff;">New project inquiry</h1>`,
    `</div>`,
    `<div style="padding:24px;">`,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hello ${safeVendorCompanyName}, you received a new inquiry from <strong>${safeBuyerCompanyName}</strong>.</p>`,
    `<div style="margin:0 0 20px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">`,
    `<p style="margin:0;font-size:14px;"><strong>Buyer:</strong> ${safeBuyerCompanyName}</p>`,
    `</div>`,
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#475569;">Open your vendor inbox to review the conversation and reply.</p>`,
    `<p style="margin:0 0 24px;"><a href="${safeInboxUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">Open Vendor Inbox</a></p>`,
    `<p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">You are receiving this email because your company account is active on OffshoreDevelopment.com.</p>`,
    `</div>`,
    `</div>`,
    `</div>`
  ].join("");

  const result = await sendSendGridEmail({
    toEmail: input.vendorEmail,
    subject,
    text,
    html,
    category: "vendor_new_chat",
    customArgs: {
      event_type: "vendor_new_chat",
      thread_id: input.threadId
    }
  });
  return result.ok;
}
