import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistente nutricional personal",
  description: "Tu asistente nutricional personal que te ayuda a mantener una dieta saludable",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
