import type { Metadata } from "next";
import "@/app/globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: {
    default: "Seatline — Good nights start here",
    template: "%s · Seatline",
  },
  description: "Find your next live moment. Book seats for concerts, festivals, and one-night-only events.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}