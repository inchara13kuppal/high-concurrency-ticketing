---
name: Ticket confirmation route IDs
description: The separator used to pass multiple booking IDs through Seatline's ticket confirmation route.
---

Keep the tilde (`~`) delimiter in both checkout navigation and ticket route parsing.

**Why:** Comma-separated UUIDs in one dynamic path segment arrived as a single invalid route parameter in the Replit-hosted Next.js app, producing a streamed not-found response after successful checkouts. Tilde-delimited IDs round-tripped and rendered the ticket page.

**How to apply:** If the checkout URL or ticket route changes, preserve the matching tilde join/split format and verify it through the proxied preview with multiple seats.