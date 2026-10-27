import nodemailer from "nodemailer";
import { formatINR } from "@/lib/format";

type ConfirmationEmail = {
  to: string;
  recipientName: string;
  eventTitle: string;
  seatNumbers: string[];
  totalAmount: number;
};

let transporterPromise: ReturnType<typeof createTestTransporter> | undefined;

function createTestTransporter() {
  return nodemailer.createTestAccount().then((account) =>
    nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: account.user, pass: account.pass },
    }),
  );
}

export async function sendConfirmationEmail({
  to,
  recipientName,
  eventTitle,
  seatNumbers,
  totalAmount,
}: ConfirmationEmail) {
  transporterPromise ??= createTestTransporter().catch((error) => {
    transporterPromise = undefined;
    throw error;
  });
  const transporter = await transporterPromise;
  const info = await transporter.sendMail({
    from: '"Seatline Tickets" <tickets@seatline.test>',
    to,
    subject: `Your tickets for ${eventTitle} are confirmed`,
    text: [
      `Hi ${recipientName || "there"},`,
      "",
      `Your tickets for ${eventTitle} are confirmed.`,
      `Seats: ${seatNumbers.join(", ")}`,
      `Total paid: ${formatINR(totalAmount)}`,
      "",
      "This is a simulated checkout confirmation from Seatline.",
    ].join("\n"),
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`[Seatline] Ethereal email preview: ${previewUrl}`);
  return previewUrl ? String(previewUrl) : undefined;
}