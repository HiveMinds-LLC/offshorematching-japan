import { AppTopbar } from "@/components/app/app-topbar";
import { AdminReviewPanel } from "@/components/admin/admin-review-panel";
import { listVendorApplications, listVendorProfilesForAdmin } from "@/lib/server/api-store";
import { getCurrentAdminSession } from "@/lib/server/admin-auth";

export default async function AppAdminPage() {
  const admin = await getCurrentAdminSession();
  const applications = admin ? await listVendorApplications() : [];
  const companies = admin ? await listVendorProfilesForAdmin() : [];

  return (
    <div>
      <AppTopbar title="管理者画面" titleEn="Admin" subtitle="開発会社の登録管理とモデレーション" subtitleEn="Vendor moderation and listing management" />
      <main>
        <AdminReviewPanel initialAdminEmail={admin?.email ?? null} initialApplications={applications} initialCompanies={companies} />
      </main>
    </div>
  );
}
