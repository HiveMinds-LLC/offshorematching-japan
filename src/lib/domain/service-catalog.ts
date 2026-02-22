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
