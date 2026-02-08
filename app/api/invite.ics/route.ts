import { NextResponse } from "next/server";
import { buildInviteIcs, getInviteFileName } from "@/lib/calendar/invite-ics";

export function GET(request: Request) {
  const icsContent = buildInviteIcs();
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const disposition =
    mode === "open"
      ? `inline; filename="${getInviteFileName()}"`
      : `attachment; filename="${getInviteFileName()}"`;

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
