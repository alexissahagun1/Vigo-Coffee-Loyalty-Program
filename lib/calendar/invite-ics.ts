const EVENT_DATE_START = "20260214";
const EVENT_DATE_END = "20260215";
const INVITEE_EMAIL = "alexis.sahagun@hotmail.com";
const INVITEE_NAME = "Alexis Sahagun";

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatUtcTimestamp(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export function buildInviteIcs(): string {
  const uid = `invite-72419-${Date.now()}@vigo-coffee`;
  const dtstamp = formatUtcTimestamp(new Date());
  const summary = escapeIcsText("Date Night");
  const description = escapeIcsText("Dinner, movies, and wine.");
  const organizer = escapeIcsText(INVITEE_NAME);
  const attendee = escapeIcsText(INVITEE_NAME);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vigo Coffee//Private Invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${EVENT_DATE_START}`,
    `DTEND;VALUE=DATE:${EVENT_DATE_END}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    `ORGANIZER;CN=${organizer}:mailto:${INVITEE_EMAIL}`,
    `ATTENDEE;CN=${attendee};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${INVITEE_EMAIL}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export function getInviteFileName(): string {
  return "date-plan.ics";
}
