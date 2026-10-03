---
name: Next.js preview origins
description: Replit proxy host configuration for Next.js development hot reload.
---

For Next.js development in Replit, include the exact `REPLIT_DEV_DOMAIN` host in `allowedDevOrigins`, along with the local preview hosts. A wildcard `"*"` alone did not clear Next.js 16's blocked-origin/HMR warning.

**Why:** the proxied preview uses a host different from the local dev server, and Next.js did not treat the wildcard as an allow-all entry.

**How to apply:** keep the workspace's current dev domain in the dev-only allowlist and confirm the browser log reports `[HMR] connected` after restarting. Do not use this development host as a production URL.