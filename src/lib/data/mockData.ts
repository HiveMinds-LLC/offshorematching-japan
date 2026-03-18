import type { BuyerOrganization, Company, PortfolioProject, ProjectHistoryRecord, VendorApplication } from "@/lib/domain/types";

function portfolioProject(id: string, project: Omit<PortfolioProject, "id">): PortfolioProject {
  return { id, ...project };
}

export const MOCK_COMPANIES: Company[] = [
  {
    id: "c1",
    name: "NexBridge Cebu",
    country: "Philippines",
    plan: "basic",
    preferredLanguage: "tl",
    websiteUrl: "https://nexbridge.example.com",
    publicContactEmail: "contact@nexbridge.example.com",
    publicContactPhone: "+63-2-555-0101",
    summary: "MVP開発に強いReact/Nodeチーム。業務Webと社内管理ツール開発にも対応。",
    services: ["React", "Node.js", "TypeScript", "社内業務ソフト"],
    portfolioProjects: [
      portfolioProject("pf-c1-1", { title: "営業支援ダッシュボード", projectType: "SaaS / 業務ツール", summary: "営業チーム向けのWeb管理画面を再構築。", durationLabel: "4ヶ月", budgetLabel: "300万〜500万円", technologies: ["React", "Node.js", "TypeScript"], businessImpact: "見積作成時間を短縮し、営業進捗の可視化を実現。" }),
      portfolioProject("pf-c1-2", { title: "社内申請ワークフロー", projectType: "社内システム / 業務改善", summary: "紙運用だった申請業務をオンライン化。", durationLabel: "3ヶ月", budgetLabel: "200万〜350万円", technologies: ["React", "Node.js"], businessImpact: "承認フローを標準化し、管理工数を削減。" })
    ],
    minRate: 24,
    maxRate: 32,
    teamSize: 18,
    english: "high",
    japaneseSupport: "basic"
  },
  {
    id: "c2",
    name: "Sakura Velocity Vietnam",
    country: "Vietnam",
    plan: "translation",
    preferredLanguage: "vi",
    websiteUrl: "https://sakuravelocity.example.com",
    publicContactEmail: "sales@sakuravelocity.example.com",
    publicContactPhone: "+84-24-555-0102",
    summary: "日英バイリンガルPM在籍。日本企業向け実績が豊富。",
    services: ["Vue", "Java", "AWS", "Mobile", "ERP/CRM"],
    portfolioProjects: [
      portfolioProject("pf-c2-1", { title: "販売管理とERP連携", projectType: "ERP / 基幹連携", summary: "既存基幹システムとWebフロントを接続。", durationLabel: "6ヶ月", budgetLabel: "800万〜1,200万円", technologies: ["Java", "AWS", "ERP/CRM"], businessImpact: "受注から請求までの入力二重化を解消。" }),
      portfolioProject("pf-c2-2", { title: "会員向けモバイルアプリ", projectType: "モバイルアプリ", summary: "顧客会員機能を備えたアプリを新規構築。", durationLabel: "5ヶ月", budgetLabel: "500万〜900万円", technologies: ["Mobile", "Vue"], businessImpact: "既存顧客の再利用率向上に貢献。" })
    ],
    minRate: 28,
    maxRate: 42,
    teamSize: 46,
    english: "high",
    japaneseSupport: "high"
  },
  {
    id: "c3",
    name: "DeltaWorks India",
    country: "India",
    plan: "translation",
    preferredLanguage: "hi",
    websiteUrl: "https://deltaworks.example.com",
    publicContactEmail: "biz@deltaworks.example.com",
    summary: "SaaS/Fintechのスケール開発に対応。Blockchain PoCにも対応。",
    services: ["React", "Node.js", "Python", "DevOps", "Blockchain"],
    portfolioProjects: [
      portfolioProject("pf-c3-1", { title: "金融向けSaaS基盤", projectType: "Webサービス", summary: "高負荷アクセスに耐える会員Web基盤を構築。", durationLabel: "8ヶ月", budgetLabel: "1,000万〜2,000万円", technologies: ["React", "Node.js", "Python"], businessImpact: "同時利用増加に対応し、運用障害を低減。" }),
      portfolioProject("pf-c3-2", { title: "ブロックチェーンPoC", projectType: "AI / データ活用", summary: "証跡管理のPoCを短期で実装。", durationLabel: "2ヶ月", budgetLabel: "200万〜400万円", technologies: ["Blockchain", "Python"], businessImpact: "新規事業検証を短期間で実施可能に。" })
    ],
    minRate: 30,
    maxRate: 55,
    teamSize: 120,
    english: "high",
    japaneseSupport: "medium"
  },
  {
    id: "c4",
    name: "Atlas Core Poland",
    country: "Poland",
    plan: "translation",
    preferredLanguage: "pl",
    websiteUrl: "https://atlascore.example.com",
    publicContactEmail: "contact@atlascore.example.com",
    summary: "大規模システム刷新や高セキュリティ案件に強い。",
    services: ["Java", "Cloud", "Security", "SRE", "Legacy Modernization"],
    portfolioProjects: [
      portfolioProject("pf-c4-1", { title: "基幹刷新プロジェクト", projectType: "ERP / 基幹連携", summary: "老朽化した社内基幹システムの刷新。", durationLabel: "12ヶ月", budgetLabel: "3,000万円以上", technologies: ["Java", "Security", "SRE"], businessImpact: "運用停止リスクを下げ、保守性を改善。" }),
      portfolioProject("pf-c4-2", { title: "クラウド移行と監視整備", projectType: "保守 / 運用改善", summary: "オンプレからクラウドへの段階移行を支援。", durationLabel: "9ヶ月", budgetLabel: "1,500万〜2,500万円", technologies: ["Cloud", "SRE"], businessImpact: "障害対応速度と拡張性を改善。" })
    ],
    minRate: 42,
    maxRate: 78,
    teamSize: 210,
    english: "high",
    japaneseSupport: "medium"
  },
  {
    id: "c5",
    name: "WaveForge Indonesia",
    country: "Indonesia",
    plan: "basic",
    preferredLanguage: "id",
    websiteUrl: "https://waveforge.example.com",
    publicContactEmail: "hello@waveforge.example.com",
    summary: "コスト重視の業務系Web開発を短納期で提供。",
    services: ["PHP", "Laravel", "MySQL", "UI/UX", "社内業務ソフト"],
    portfolioProjects: [
      portfolioProject("pf-c5-1", { title: "受発注管理システム", projectType: "社内システム / 業務改善", summary: "電話中心だった受発注業務をWeb化。", durationLabel: "3ヶ月", budgetLabel: "250万〜400万円", technologies: ["PHP", "Laravel", "MySQL"], businessImpact: "属人化を減らし、事務処理を標準化。" }),
      portfolioProject("pf-c5-2", { title: "B2B会員サイト改修", projectType: "Webサービス", summary: "会員導線と管理機能を再設計。", durationLabel: "2.5ヶ月", budgetLabel: "180万〜300万円", technologies: ["Laravel", "UI/UX"], businessImpact: "問い合わせ転換率の改善を支援。" })
    ],
    minRate: 18,
    maxRate: 27,
    teamSize: 24,
    english: "medium",
    japaneseSupport: "basic"
  },
  {
    id: "c6",
    name: "Harbor Byte Romania",
    country: "Romania",
    plan: "translation",
    preferredLanguage: "ro",
    websiteUrl: "https://harborbyte.example.com",
    publicContactEmail: "team@harborbyte.example.com",
    summary: "高難度バックエンドとクラウド基盤設計に強い。",
    services: ["Go", "Python", "AWS", "PostgreSQL", "Data Engineering"],
    portfolioProjects: [
      portfolioProject("pf-c6-1", { title: "データ集約基盤", projectType: "AI / データ活用", summary: "複数システムのデータ統合基盤を構築。", durationLabel: "7ヶ月", budgetLabel: "900万〜1,400万円", technologies: ["Python", "AWS", "Data Engineering"], businessImpact: "経営レポート作成時間を短縮。" }),
      portfolioProject("pf-c6-2", { title: "API基盤再設計", projectType: "Webサービス", summary: "既存APIの高負荷対策と再設計。", durationLabel: "5ヶ月", budgetLabel: "600万〜900万円", technologies: ["Go", "PostgreSQL"], businessImpact: "ピーク時の安定性を改善。" })
    ],
    minRate: 36,
    maxRate: 62,
    teamSize: 84,
    english: "high",
    japaneseSupport: "medium"
  },
  {
    id: "c7",
    name: "XR Frontier Korea",
    country: "Korea",
    plan: "translation",
    preferredLanguage: "ko",
    websiteUrl: "https://xrfrontier.example.com",
    publicContactEmail: "studio@xrfrontier.example.com",
    summary: "製造・教育向けVR/AR開発とUnity実装を提供。",
    services: ["VR/AR", "Unity", "Unreal", "Mobile"],
    portfolioProjects: [
      portfolioProject("pf-c7-1", { title: "工場向けAR支援", projectType: "VR / AR / 3D", summary: "保守手順をAR表示する業務支援ツール。", durationLabel: "4ヶ月", budgetLabel: "500万〜800万円", technologies: ["VR/AR", "Unity"], businessImpact: "新人教育と現場ミス低減を支援。" }),
      portfolioProject("pf-c7-2", { title: "展示会向け3D体験", projectType: "VR / AR / 3D", summary: "製品紹介のための3Dインタラクティブ体験を制作。", durationLabel: "2ヶ月", budgetLabel: "200万〜350万円", technologies: ["Unreal", "Mobile"], businessImpact: "営業提案の訴求力向上に活用。" })
    ],
    minRate: 40,
    maxRate: 70,
    teamSize: 36,
    english: "medium",
    japaneseSupport: "medium"
  },
  {
    id: "c8",
    name: "Nimbus Labs Thailand",
    country: "Thailand",
    plan: "basic",
    preferredLanguage: "th",
    websiteUrl: "https://nimbuslabs.example.com",
    publicContactEmail: "contact@nimbuslabs.example.com",
    summary: "ECサイトと社内管理システムの短期開発に対応。",
    services: ["Next.js", "Node.js", "PostgreSQL", "社内業務ソフト"],
    portfolioProjects: [
      portfolioProject("pf-c8-1", { title: "EC管理画面構築", projectType: "EC / マーケットプレイス", summary: "受注・在庫・配送を一元管理する画面を開発。", durationLabel: "4ヶ月", budgetLabel: "350万〜550万円", technologies: ["Next.js", "Node.js"], businessImpact: "運用部門の確認作業を集約。" }),
      portfolioProject("pf-c8-2", { title: "社内在庫管理システム", projectType: "社内システム / 業務改善", summary: "店舗在庫の可視化と更新作業をWeb化。", durationLabel: "3ヶ月", budgetLabel: "220万〜360万円", technologies: ["PostgreSQL", "Node.js"], businessImpact: "棚卸し作業の負担を軽減。" })
    ],
    minRate: 22,
    maxRate: 34,
    teamSize: 26,
    english: "medium",
    japaneseSupport: "basic"
  },
  {
    id: "c9",
    name: "Pacific Code Malaysia",
    country: "Malaysia",
    plan: "basic",
    preferredLanguage: "ms",
    websiteUrl: "https://pacificcode.example.com",
    publicContactEmail: "hello@pacificcode.example.com",
    summary: "SaaS運用改善と保守案件に強いフルスタックチーム。",
    services: ["React", "Node.js", "AWS", "QA"],
    portfolioProjects: [
      portfolioProject("pf-c9-1", { title: "SaaS運用改善支援", projectType: "保守 / 運用改善", summary: "既存サービスの不具合改善と機能追加を継続支援。", durationLabel: "6ヶ月", budgetLabel: "400万〜700万円", technologies: ["React", "Node.js", "QA"], businessImpact: "解約率低下と運用負荷軽減に寄与。" }),
      portfolioProject("pf-c9-2", { title: "顧客向けポータル刷新", projectType: "SaaS / 業務ツール", summary: "会員企業向けポータルサイトを再設計。", durationLabel: "4ヶ月", budgetLabel: "300万〜500万円", technologies: ["React", "AWS"], businessImpact: "顧客自己解決率を向上。" })
    ],
    minRate: 24,
    maxRate: 38,
    teamSize: 32,
    english: "high",
    japaneseSupport: "medium"
  },
  {
    id: "c10",
    name: "Kyiv Digital Forge",
    country: "Ukraine",
    plan: "translation",
    preferredLanguage: "uk",
    websiteUrl: "https://kyivforge.example.com",
    publicContactEmail: "sales@kyivforge.example.com",
    summary: "高負荷APIとデータ基盤の再設計を支援。",
    services: ["Go", "Kubernetes", "Data Engineering", "SRE"],
    portfolioProjects: [
      portfolioProject("pf-c10-1", { title: "物流API再構築", projectType: "Webサービス", summary: "物流連携APIの性能改善と拡張。", durationLabel: "5ヶ月", budgetLabel: "700万〜1,100万円", technologies: ["Go", "Kubernetes"], businessImpact: "処理遅延を改善しピーク対応を安定化。" }),
      portfolioProject("pf-c10-2", { title: "経営データ基盤整備", projectType: "AI / データ活用", summary: "販売・在庫・会員データの統合分析基盤を構築。", durationLabel: "6ヶ月", budgetLabel: "800万〜1,200万円", technologies: ["Data Engineering", "SRE"], businessImpact: "意思決定に必要なレポートを高速化。" })
    ],
    minRate: 35,
    maxRate: 60,
    teamSize: 74,
    english: "high",
    japaneseSupport: "medium"
  },
  {
    id: "c11",
    name: "Andes Software Chile",
    country: "Chile",
    plan: "basic",
    preferredLanguage: "es",
    websiteUrl: "https://andes-software.example.com",
    publicContactEmail: "team@andes-software.example.com",
    summary: "業務アプリとバックオフィス自動化に特化。",
    services: ["Python", "Django", "React", "RPA"],
    portfolioProjects: [
      portfolioProject("pf-c11-1", { title: "経費精算の自動化", projectType: "社内システム / 業務改善", summary: "経費申請から承認までをデジタル化。", durationLabel: "3ヶ月", budgetLabel: "250万〜380万円", technologies: ["Python", "Django", "RPA"], businessImpact: "経理部門の手入力削減に貢献。" }),
      portfolioProject("pf-c11-2", { title: "社内ポータル再構築", projectType: "SaaS / 業務ツール", summary: "従業員向け情報ポータルを刷新。", durationLabel: "4ヶ月", budgetLabel: "300万〜480万円", technologies: ["React", "Django"], businessImpact: "情報伝達の属人化を減らした。" })
    ],
    minRate: 26,
    maxRate: 40,
    teamSize: 28,
    english: "medium",
    japaneseSupport: "basic"
  },
  {
    id: "c12",
    name: "Baltic Vision Estonia",
    country: "Estonia",
    plan: "translation",
    preferredLanguage: "et",
    websiteUrl: "https://balticvision.example.com",
    publicContactEmail: "contact@balticvision.example.com",
    summary: "プロダクトUI刷新とモバイル展開を高速実装。",
    services: ["React Native", "Flutter", "UI/UX", "TypeScript"],
    portfolioProjects: [
      portfolioProject("pf-c12-1", { title: "営業支援モバイルアプリ", projectType: "モバイルアプリ", summary: "営業担当向けの現場入力アプリを構築。", durationLabel: "4ヶ月", budgetLabel: "400万〜650万円", technologies: ["React Native", "TypeScript"], businessImpact: "現場入力の即時反映を実現。" }),
      portfolioProject("pf-c12-2", { title: "プロダクトUI全面刷新", projectType: "Webサービス", summary: "既存SaaSのUI/UXを再設計し実装。", durationLabel: "3.5ヶ月", budgetLabel: "350万〜600万円", technologies: ["Flutter", "UI/UX"], businessImpact: "利用定着率の改善を支援。" })
    ],
    minRate: 29,
    maxRate: 48,
    teamSize: 41,
    english: "high",
    japaneseSupport: "medium"
  }
];

export const SEED_BUYER_ORGANIZATIONS: BuyerOrganization[] = [
  {
    id: "b1",
    companyName: "Tokyo SaaS Holdings",
    industry: "SaaS",
    contactName: "A. Tanaka",
    email: "buyer@example.jp",
    password: "demo1234"
  }
];

export const SEED_VENDOR_APPLICATIONS: VendorApplication[] = MOCK_COMPANIES.map((company) => ({
  id: `app-${company.id}`,
  company,
  contactName: `${company.name} Admin`,
  contactEmail: `${company.id}@vendor.example.com`,
  status: "approved",
  submittedAt: new Date("2026-02-10T09:00:00Z").toISOString(),
  reviewNote: "初期データ",
  termsAcceptedAt: new Date("2026-02-09T09:00:00Z").toISOString(),
  termsVersion: "2026-02"
}));

export const SEED_PROJECT_HISTORY: ProjectHistoryRecord[] = [
  {
    id: "p1",
    buyerOrgId: "b1",
    buyerOrgName: "Tokyo SaaS Holdings",
    vendorCompanyId: "c1",
    vendorCompanyName: "NexBridge Cebu",
    title: "営業支援SaaS 管理画面再構築",
    summary: "React/Node.jsで営業部門向けの社内業務基盤を刷新。",
    technologies: ["React", "Node.js", "TypeScript"],
    status: "completed",
    deliveredAt: "2025-11-20"
  },
  {
    id: "p2",
    buyerOrgId: "b1",
    buyerOrgName: "Tokyo SaaS Holdings",
    vendorCompanyId: "c2",
    vendorCompanyName: "Sakura Velocity Vietnam",
    title: "基幹連携バッチとERP拡張",
    summary: "既存ERPとのデータ連携と追加画面をJava/AWSで構築。",
    technologies: ["Java", "AWS", "ERP/CRM"],
    status: "completed",
    deliveredAt: "2025-08-15"
  },
  {
    id: "p3",
    buyerOrgId: "b1",
    buyerOrgName: "Tokyo SaaS Holdings",
    vendorCompanyId: "c12",
    vendorCompanyName: "Baltic Vision Estonia",
    title: "モバイルアプリPoC",
    summary: "React Nativeで営業支援アプリの短期PoCを実装。",
    technologies: ["React Native", "TypeScript"],
    status: "active",
    deliveredAt: "2026-03-01"
  },
  {
    id: "p4",
    buyerOrgId: "b2",
    buyerOrgName: "Kansai Retail Group",
    vendorCompanyId: "c1",
    vendorCompanyName: "NexBridge Cebu",
    title: "店舗在庫管理システム",
    summary: "既存在庫システムのWeb化と運用移管。",
    technologies: ["React", "Node.js"],
    status: "completed",
    deliveredAt: "2025-06-10"
  }
];
