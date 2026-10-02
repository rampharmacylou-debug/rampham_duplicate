import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "@/lib/roleContext";

export const metadata: Metadata = {
  title: "Manifest",
  description: "Operations record for products, diary, transport, and clients.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
