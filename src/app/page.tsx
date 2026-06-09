import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Activity, Award, Star, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center overflow-hidden pb-20">
      
      {/* Hero Section */}
      <section className="relative w-full max-w-6xl mx-auto px-4 pt-32 pb-20 md:pt-48 md:pb-32 flex flex-col items-center text-center">
        {/* Advanced Glow Effects */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[600px] h-[40vh] bg-primary-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[30%] left-1/4 w-[40vw] max-w-[400px] h-[30vh] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <Star className="w-4 h-4 text-warning-500 fill-warning-500 animate-pulse" />
          <span className="text-sm font-bold text-slate-300 tracking-wide">The #1 Premium TGAT Simulator</span>
        </div>

        {/* Headline */}
        <h1 className="heading-xl text-5xl md:text-7xl mb-6 relative z-10">
          Master Your <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-purple-400 to-pink-500 drop-shadow-sm">
            University Admission
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          แพลตฟอร์มจำลองสอบ TGAT ที่เหมือนจริงที่สุด พร้อมระบบวิเคราะห์จุดอ่อน แนะนำการอ่านหนังสือ และคลังข้อสอบมากกว่า 1,000 ข้อ
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto z-10">
          <Link href="/dashboard" className="group px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-lg hover:bg-primary-500 transition-all hover:-translate-y-1 active:translate-y-0 shadow-[0_0_30px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2">
            เข้าสู่ระบบ Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#features" className="group px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-warning-500 group-hover:scale-110 transition-transform" /> ดูฟีเจอร์ทั้งหมด
          </Link>
        </div>
      </section>

      {/* Feature Exams */}
      <section id="features" className="section-container w-full max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="heading-lg text-white mb-4">Complete TGAT Ecosystem</h2>
          <p className="text-slate-400">ครอบคลุมทุกวิชา พร้อมระบบ AI ช่วยวิเคราะห์</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TGAT1 */}
          <Link href="/tgat1" className="group saas-card saas-card-hover relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-300">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="heading-md text-white mb-2 group-hover:text-cyan-300 transition-colors">TGAT1</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">English Communication ฝึกลุยโจทย์บทสนทนา Reading และ Vocabulary</p>
            <div className="text-cyan-400 font-bold flex items-center gap-2 text-sm mt-auto">
              เริ่มสอบเลย <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* TGAT2 */}
          <Link href="/tgat2" className="group saas-card saas-card-hover relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-14 h-14 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center mb-6 text-pink-400 group-hover:scale-110 group-hover:bg-pink-500/20 transition-all duration-300">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="heading-md text-white mb-2 group-hover:text-pink-300 transition-colors">TGAT2</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">Logical & Critical Thinking ลับสมองประลองตรรกะ ตัวเลข และมิติสัมพันธ์</p>
            <div className="text-pink-400 font-bold flex items-center gap-2 text-sm mt-auto">
              เริ่มสอบเลย <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* TGAT3 */}
          <Link href="/tgat3" className="group saas-card saas-card-hover relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-warning-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-14 h-14 bg-warning-500/10 border border-warning-500/20 rounded-2xl flex items-center justify-center mb-6 text-warning-400 group-hover:scale-110 group-hover:bg-warning-500/20 transition-all duration-300">
              <Award className="w-7 h-7" />
            </div>
            <h3 className="heading-md text-white mb-2 group-hover:text-warning-400 transition-colors">TGAT3</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">Future Workforce Competencies ทักษะการทำงานในอนาคต</p>
            <div className="text-warning-400 font-bold flex items-center gap-2 text-sm mt-auto">
              เริ่มสอบเลย <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

    </main>
  );
}