import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
export const runtime = "nodejs";

export function OPTIONS() {
  return NextResponse.json({});
}
