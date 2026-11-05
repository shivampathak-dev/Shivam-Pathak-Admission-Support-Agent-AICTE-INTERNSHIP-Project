import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/hooks/useToast";

export const metadata: Metadata = {
  title: "College Admission Agent — IBM Granite RAG",
  description:
    "AI-powered college admission counsellor using IBM Granite and RAG. Get instant, document-grounded answers about eligibility, fees, deadlines, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-slate-950 text-white antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
