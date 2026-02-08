"use client";

import { useMemo, useState } from "react";
import { buildInviteIcs, getInviteFileName } from "@/lib/calendar/invite-ics";

const NO_POSITIONS = [
  { x: 0, y: 0 },
  { x: 58, y: -18 },
  { x: -54, y: 22 },
  { x: 70, y: 26 },
  { x: -64, y: -20 },
  { x: 40, y: 34 },
  { x: -38, y: -30 },
];

function downloadBlob(content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = getInviteFileName();
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(blobUrl);
}

export default function InvitePage() {
  const [noClicks, setNoClicks] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isIOS =
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(window.navigator.userAgent);

  const yesScale = useMemo(() => Math.min(1 + noClicks * 0.22, 3), [noClicks]);
  const noOffset = useMemo(
    () => NO_POSITIONS[noClicks % NO_POSITIONS.length],
    [noClicks],
  );

  const handleNoClick = () => {
    setNoClicks((count) => count + 1);
    setFeedback("The correct answer is getting bigger :)");
  };

  const handleYesClick = async () => {
    setIsDownloading(true);
    setFeedback(null);

    if (isIOS) {
      // iOS handles calendar invites better when opening the .ics route directly.
      window.location.href = "/api/invite.ics?mode=open";
      setIsDownloading(false);
      return;
    }

    try {
      const response = await fetch("/api/invite.ics?mode=download", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch calendar invite");
      }

      const content = await response.text();
      downloadBlob(content);
      setFeedback("Calendar invite downloaded. Nos vemos el sábadooo :)");
    } catch {
      // Fallback for clients that cannot fetch or download from route response.
      downloadBlob(buildInviteIcs());
      setFeedback("Backup invite downloaded. See you on Saturday, February 14, 2026.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-svh bg-gradient-to-br from-rose-50 via-amber-50 to-pink-100 p-6 flex items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-rose-200/70 bg-white/85 backdrop-blur-sm p-6 md:p-8 shadow-xl animate-fade-in">
        <header className="text-center animate-slide-up">
          <p className="text-sm uppercase tracking-[0.25em] text-rose-500 font-semibold mb-2">
            One Question
          </p>
          <h1 className="text-4xl md:text-5xl text-rose-900 text-display">
            Will you be my Valentine?
          </h1>
          <p className="mt-3 text-rose-700">
            Dinner, movies y vinito 🍷
          </p>
        </header>

        <div className="mt-6 rounded-xl overflow-hidden border border-rose-100 shadow-md animate-slide-up stagger-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://media1.tenor.com/m/kutFNFXxSIsAAAAd/minion-minion-loves.gif"
            alt="Minion showing love"
            className="w-full h-auto object-cover"
            loading="eager"
          />
        </div>

        <div className="mt-8 relative h-40 animate-slide-up stagger-2">
          <button
            type="button"
            onClick={handleYesClick}
            disabled={isDownloading}
            className="absolute left-1/2 top-1/2 -translate-x-[120%] -translate-y-1/2 rounded-full bg-rose-600 text-white font-semibold px-8 py-3 shadow-lg hover:bg-rose-700 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ transform: `translate(-120%, -50%) scale(${yesScale})` }}
          >
            {isDownloading ? "Creating invite..." : "Yes"}
          </button>

          <button
            type="button"
            onClick={handleNoClick}
            className="absolute left-1/2 top-1/2 rounded-full border border-rose-300 bg-white text-rose-700 font-semibold px-8 py-3 shadow hover:bg-rose-50 transition-all duration-300"
            style={{
              transform: `translate(calc(20% + ${noOffset.x}px), calc(-50% + ${noOffset.y}px))`,
            }}
          >
            No
          </button>
        </div>

        {feedback && (
          <p className="mt-2 text-center text-sm text-rose-600 animate-fade-in">{feedback}</p>
        )}
      </section>
    </main>
  );
}
