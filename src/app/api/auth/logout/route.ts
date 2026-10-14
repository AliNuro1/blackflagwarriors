import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/session";

export async function POST(request: Request) {
  await clearAuthCookies();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
