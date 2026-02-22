import { AppTopbar } from "@/components/app/app-topbar";
import { AdminReviewPanel } from "@/components/admin/admin-review-panel";

export default function AppAdminPage() {
  return (
    <div>
      <AppTopbar title="管理者画面" subtitle="開発会社の申請審査" />
      <main>
        <AdminReviewPanel />
      </main>
    </div>
  );
}
