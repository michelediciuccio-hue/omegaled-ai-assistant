import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmegaBot | OmegaLed",
  description: "Assistente AI OmegaLed per Ledwall, Led, LCD e Digital Signage.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
