import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faque.dev — Montreal SWE French & Franglais Companion",
  description:
    "Learn authentic Montreal Québécois workplace French & software engineering Franglais with Firebase AI Logic, Cloud Firestore SRS flashcards, and fr-CA audio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b1020] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
