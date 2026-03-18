export const SERVICE_CATEGORIES = [
  {
    title: "Web / モバイル開発",
    services: ["React", "Node.js", "Java", "Python", "Mobile", "Flutter"]
  },
  {
    title: "先端領域",
    services: ["VR/AR", "Unity", "Unreal", "Blockchain", "Smart Contract"]
  },
  {
    title: "業務システム",
    services: ["基幹システム", "社内業務ソフト", "ERP/CRM", "Legacy Modernization"]
  },
  {
    title: "インフラ / データ",
    services: ["AWS", "DevOps", "Data Engineering", "Security", "SRE"]
  }
] as const;

export const TECH_FILTER_OPTIONS = [
  "react",
  "node",
  "java",
  "python",
  "aws",
  "mobile",
  "vr/ar",
  "blockchain",
  "社内業務ソフト"
] as const;

export const PROJECT_FILTER_OPTIONS = [
  "Webサービス",
  "EC / マーケットプレイス",
  "社内システム / 業務改善",
  "モバイルアプリ",
  "SaaS / 業務ツール",
  "ERP / 基幹連携",
  "AI / データ活用",
  "VR / AR / 3D",
  "保守 / 運用改善"
] as const;
