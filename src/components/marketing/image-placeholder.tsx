import type { ReactNode } from "react";

type ImagePlaceholderProps = {
  label: string;
  hint?: string;
};

type PreviewVariant =
  | "hero"
  | "marketplace"
  | "buyer"
  | "vendor"
  | "pricing"
  | "matching"
  | "billing";

function resolveVariant(label: string): PreviewVariant {
  const normalized = label.toLowerCase();
  if (normalized.includes("pricing") || normalized.includes("料金")) return "pricing";
  if (normalized.includes("vendor") || normalized.includes("開発会社")) return "vendor";
  if (normalized.includes("buyer") || normalized.includes("発注企業")) return "buyer";
  if (normalized.includes("matching") || normalized.includes("案件マッチング")) return "matching";
  if (normalized.includes("billing") || normalized.includes("請求")) return "billing";
  if (normalized.includes("marketplace") || normalized.includes("一覧")) return "marketplace";
  return "hero";
}

function PreviewChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_16px_48px_rgba(15,23,42,0.12)]">
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "emerald" | "amber" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700"
  };

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function HeroPreview() {
  return (
    <PreviewChrome>
      <div className="grid h-full gap-3 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="h-3 w-20 rounded-full bg-blue-100" />
              <div className="mt-2 h-5 w-40 rounded-full bg-slate-200" />
            </div>
            <Pill tone="blue">Marketplace</Pill>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Nimbus Works", "Delta Forge", "Northstar Labs", "Lattice Studio"].map((name, index) => (
              <div key={name} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{index % 2 === 0 ? "Vietnam" : "Poland"} | {index < 2 ? "18" : "42"} team members</p>
                  </div>
                  <Pill tone={index % 2 === 0 ? "emerald" : "blue"}>{index % 2 === 0 ? "Translation" : "Basic"}</Pill>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["React", "Node.js", "ERP"].slice(0, index % 2 === 0 ? 3 : 2).map((tag) => <Pill key={`${name}-${tag}`}>{tag}</Pill>)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Project Matching</p>
              <Pill tone="blue">Live</Pill>
            </div>
            <div className="mt-3 space-y-2">
              <div className="ml-auto max-w-[85%] rounded-2xl bg-slate-900 px-3 py-2 text-xs text-white">Need a bilingual vendor for an internal workflow rebuild.</div>
              <div className="max-w-[90%] rounded-2xl bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">Budget, delivery model, and language requirements were extracted into a shortlist.</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Why they matched</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone="emerald">Budget fit</Pill>
              <Pill tone="blue">ERP experience</Pill>
              <Pill tone="amber">Japanese support</Pill>
            </div>
          </div>
        </div>
      </div>
    </PreviewChrome>
  );
}

function BuyerPreview() {
  return (
    <PreviewChrome>
      <div className="grid h-full gap-3 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Project Matching</p>
          <div className="mt-3 space-y-2">
            <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-700">We need a mobile booking app with Japanese support and launch in 3 months.</div>
            <div className="ml-auto rounded-2xl bg-slate-900 px-3 py-2 text-xs text-white">Budget is around ¥5M to ¥8M.</div>
            <div className="rounded-2xl bg-blue-50 px-3 py-2 text-xs text-slate-700">Criteria extracted: mobile, team 4-8, short timeline, JP support.</div>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Matched Vendors</p>
              <Pill tone="blue">3 results</Pill>
            </div>
            <div className="mt-3 space-y-2">
              {[
                ["Northstar Labs", "React Native", "JP support"],
                ["Delta Forge", "Flutter", "Budget fit"],
                ["Nimbus Works", "Mobile UX", "Fast delivery"]
              ].map(([name, a, b]) => (
                <div key={name} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{name}</p>
                    <Pill tone="emerald">92</Pill>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Pill>{a}</Pill>
                    <Pill tone="blue">{b}</Pill>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PreviewChrome>
  );
}

function VendorPreview() {
  return (
    <PreviewChrome>
      <div className="grid h-full gap-3 lg:grid-cols-[0.95fr,1.05fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Inbox</p>
            <Pill tone="amber">2 unread</Pill>
          </div>
          <div className="mt-3 space-y-2">
            {["Aoba Retail", "Mira Logistics", "Koe Studio"].map((name, index) => (
              <div key={name} className={`rounded-2xl border px-3 py-3 ${index === 0 ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                  <Pill tone={index === 0 ? "amber" : "slate"}>{index === 0 ? "New chat" : "Consulting"}</Pill>
                </div>
                <p className="mt-1 text-xs text-slate-500">{index === 0 ? "Buyer asked to move to In Progress" : "Recent inquiry thread"}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Translated Chat</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl bg-blue-50 px-3 py-2 text-xs text-slate-800">Can you support launch by July?</div>
              <div className="rounded-xl bg-white px-3 py-2 text-[11px] text-slate-500 shadow-sm">7月までのリリース対応は可能ですか？</div>
              <div className="ml-auto rounded-2xl bg-slate-900 px-3 py-2 text-xs text-white">Yes, we can support the July timeline.</div>
              <div className="ml-auto rounded-xl bg-slate-800/90 px-3 py-2 text-[11px] text-slate-200">はい、7月のスケジュールに対応できます。</div>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Billing</p>
              <Pill tone="emerald">Active</Pill>
            </div>
            <p className="mt-2 text-xs text-slate-600">Translation plan active. Next renewal: Apr 30.</p>
          </div>
        </div>
      </div>
    </PreviewChrome>
  );
}

function PricingPreview() {
  return (
    <PreviewChrome>
      <div className="grid h-full gap-3">
      <div className="grid gap-3 lg:grid-cols-3">
        {[
          ["Buyers", "Free", "Directory, matching, messaging", "blue"],
          ["Standard", "¥5,000", "Listing + inbox + billing", "slate"],
          ["Translation", "¥10,000", "Everything + translated chat", "emerald"]
        ].map(([name, price, text, tone]) => (
          <div key={name} className={`rounded-2xl border p-4 ${tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "blue" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-sm font-semibold text-slate-900">{name}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{price}</p>
            <p className="mt-2 text-xs leading-6 text-slate-600">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Signup Flow</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone="blue">Account</Pill>
          <Pill tone="slate">Plan</Pill>
          <Pill tone="emerald">Checkout</Pill>
          <Pill tone="amber">Profile completion</Pill>
          <Pill tone="blue">Go live</Pill>
        </div>
      </div>
      </div>
    </PreviewChrome>
  );
}

function MarketplacePreview() {
  return (
    <PreviewChrome>
      <div className="grid h-full gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="h-10 rounded-xl bg-white" />
            <div className="h-10 rounded-xl bg-white" />
            <div className="h-10 rounded-xl bg-white" />
            <div className="h-10 rounded-xl bg-white" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {["Nimbus Works", "Delta Forge", "Blue Harbor"].map((name, index) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{name}</p>
                <Pill tone={index === 2 ? "emerald" : "blue"}>{index === 2 ? "Translation" : "Basic"}</Pill>
              </div>
              <p className="mt-2 text-xs text-slate-500">{index === 0 ? "Vietnam" : index === 1 ? "Indonesia" : "Poland"} | ¥3,000-¥6,000/hr</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill>React</Pill>
                <Pill>Node.js</Pill>
                <Pill tone="amber">ERP</Pill>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PreviewChrome>
  );
}

function MatchingPreview() {
  return <BuyerPreview />;
}

function BillingPreview() {
  return (
    <PreviewChrome>
      <div className="grid h-full gap-3 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Current Plan</p>
            <Pill tone="emerald">Active</Pill>
          </div>
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-lg font-semibold text-slate-900">Translation Plan</p>
            <p className="mt-1 text-sm text-slate-600">¥10,000 / month</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Available Actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="blue">Upgrade</Pill>
              <Pill tone="amber">Downgrade next cycle</Pill>
              <Pill tone="slate">Resume</Pill>
              <Pill tone="slate">Cancel</Pill>
            </div>
          </div>
        </div>
      </div>
    </PreviewChrome>
  );
}

export function ImagePlaceholder({ label, hint }: ImagePlaceholderProps) {
  const variant = resolveVariant(label);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[22px]">
        {variant === "hero" ? <HeroPreview /> : null}
        {variant === "marketplace" ? <MarketplacePreview /> : null}
        {variant === "buyer" ? <BuyerPreview /> : null}
        {variant === "vendor" ? <VendorPreview /> : null}
        {variant === "pricing" ? <PricingPreview /> : null}
        {variant === "matching" ? <MatchingPreview /> : null}
        {variant === "billing" ? <BillingPreview /> : null}
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint ? <p className="mt-1 text-xs leading-6 text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}
