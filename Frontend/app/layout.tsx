import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexo ERP | Panel de control",
  description:
    "Panel de control del sistema predictivo de ventas e inventario Nexo ERP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
