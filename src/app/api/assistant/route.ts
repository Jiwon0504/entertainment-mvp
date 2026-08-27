import { NextRequest, NextResponse } from "next/server";
import { answerQuery } from "@/lib/ai/assistantEngine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const skuId = typeof body?.skuId === "string" ? body.skuId : undefined;
  const locale = body?.locale === "en" ? "en" : "ko";

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const answer = answerQuery(query, { skuId }, locale);
  return NextResponse.json(answer);
}
