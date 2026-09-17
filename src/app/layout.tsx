import type { Metadata, Viewport } from "next";
import { Cairo, Playfair_Display } from "next/font/google";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: { default: "عيادة المغازي — نظام إدارة العيادة", template: "%s | عيادة المغازي" },
  description: "نظام إدارة عيادة المغازي للجلدية والتجميل",
};
export const viewport: Viewport = { themeColor: "#146c43" };

const themeInit = `try{var e=document.documentElement;e.dataset.theme=localStorage.getItem("mc-theme")||"emerald";if(localStorage.getItem("mc-dark")==="1")e.dataset.mode="dark";}catch(_){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body className={`${cairo.variable} ${playfair.variable} bg-bg font-sans text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
