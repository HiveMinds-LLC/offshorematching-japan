import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Billing activation is handled by Stripe webhooks." },
    { status: 410 }
  );
}
