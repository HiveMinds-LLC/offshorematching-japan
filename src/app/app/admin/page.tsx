import { AppTopbar } from "@/components/app/app-topbar";
import { AdminReviewPanel } from "@/components/admin/admin-review-panel";
import { getAdminDashboardSummary, listBuyerOrganizationsForAdmin, listVendorApplications, listVendorProfilesForAdmin } from "@/lib/server/api-store";
import { getCurrentAdminSession } from "@/lib/server/admin-auth";

export default async function AppAdminPage() {
  const admin = await getCurrentAdminSession();
  const [applications, companies, buyers, summary] = admin
    ? await Promise.all([
        listVendorApplications(),
        listVendorProfilesForAdmin(),
        listBuyerOrganizationsForAdmin(),
        getAdminDashboardSummary()
      ])
    : [[], [], [], {
        buyerCount: 0,
        vendorCount: 0,
        listedVendorCount: 0,
        activeBillingCount: 0,
        completedJobCount: 0,
        activeMatchCount: 0
      }];

  return (
    <div>
      <AppTopbar title="管理者画面" titleEn="Admin" subtitle="開発会社の登録管理とモデレーション" subtitleEn="Vendor moderation and listing management" />
      <main>
        <AdminReviewPanel
          initialAdminEmail={admin?.email ?? null}
          initialApplications={applications}
          initialCompanies={companies}
          initialBuyers={buyers}
          initialSummary={summary}
        />
      </main>
    </div>
  );
}
