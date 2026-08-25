import { NextResponse } from "next/server";

import { removeCompanyThumbnail, replaceCompanyThumbnail } from "@/lib/server/api-store";
import { getCurrentVendorSession } from "@/lib/server/vendor-auth";

type Params = { params: Promise<{ id: string }> };

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectImageMimeType(bytes: Uint8Array) {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpeg) return "image/jpeg";
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (isPng) return "image/png";
  const isWebp = bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isWebp) return "image/webp";
  return null;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });
  if (vendor.companyId !== id) return NextResponse.json({ error: "この会社画像を編集する権限がありません。" }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "画像ファイルを選択してください。" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "JPG、PNG、WebP形式の画像を選択してください。" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "画像は2MB以下にしてください。" }, { status: 400 });
  const actualMimeType = detectImageMimeType(new Uint8Array(await file.slice(0, 32).arrayBuffer()));
  if (!actualMimeType || actualMimeType !== file.type) return NextResponse.json({ error: "画像ファイルの形式を確認できません。JPG、PNG、WebP形式の画像を選択してください。" }, { status: 400 });

  try {
    const company = await replaceCompanyThumbnail(id, file);
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "画像のアップロードに失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const vendor = await getCurrentVendorSession();
  if (!vendor) return NextResponse.json({ error: "開発会社ログインが必要です。" }, { status: 401 });
  if (vendor.companyId !== id) return NextResponse.json({ error: "この会社画像を編集する権限がありません。" }, { status: 403 });

  try {
    const company = await removeCompanyThumbnail(id);
    if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "画像の削除に失敗しました。" }, { status: 500 });
  }
}
