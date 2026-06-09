import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

// ฟอนต์หลักของระบบ (LINE Seed)
const lineSeed = localFont({
  src: "../../public/fonts/LINESeedSansTH.woff2",
  variable: "--font-line-seed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TGAT Sim | Premium TGAT Simulator",
  description: "แพลตฟอร์มจำลองสอบ TGAT ที่เหมือนจริงที่สุด พร้อมระบบ AI วิเคราะห์จุดอ่อน เพื่อเด็ก TCAS ทุกคน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ใส่ dark (บังคับโหมดมืด) และ scroll-smooth สำหรับการเลื่อนหน้าแบบนุ่มนวล
    <html lang="th" className={`dark scroll-smooth ${lineSeed.variable}`}>
      <head />
      <body className="font-sans antialiased bg-background text-foreground pt-16 min-h-screen flex flex-col">
        <Navbar />
        {/* flex-grow ช่วยดัน Footer (ถ้ามีในอนาคต) ให้อยู่ล่างสุดเสมอ */}
        <div className="flex-grow flex flex-col relative">
          {children}
        </div>
      </body>
    </html>
  );
}