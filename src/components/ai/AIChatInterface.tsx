"use client";

import React, { useState, useEffect, useRef } from "react";
import type { AIChatMessage } from "@/types/ai";
import { Bot, Send, Sparkles, BookOpen, Key, ShieldCheck } from "lucide-react";
import { SafeHtml } from "@/components/SafeHtml";

interface AIChatInterfaceProps {
  messages: AIChatMessage[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
}

export default function AIChatInterface({ messages, isTyping, onSendMessage }: AIChatInterfaceProps) {
  const [inputVal, setInputVal] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    onSendMessage(inputVal);
    setInputVal("");
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col h-[500px] justify-between relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-[45px] pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
        <div className="p-2.5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
            AI Tutor Conversational Panel <Sparkles className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          </h3>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            Interactive Diagnostic Consultant
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 max-h-[300px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed border ${
                msg.sender === "user"
                  ? "bg-gradient-to-r from-neon-blue/20 to-neon-blue/30 border-neon-blue text-white shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-tr-none"
                  : "bg-slate-950/80 border-white/5 text-slate-200 rounded-tl-none shadow-lg"
              }`}
            >
              <SafeHtml content={msg.text} />
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-950/80 border border-white/5 rounded-2xl rounded-tl-none p-4 shadow-lg text-slate-400 text-[10px] flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              AI Coach กำลังวินิจฉัยข้อมูลวิชาชีพ...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex gap-2 overflow-x-auto py-2 border-t border-white/5 bg-slate-900/10">
        <button
          onClick={() => onSendMessage("ขอรายงานวิเคราะห์จุดอ่อนสะสมที่วิกฤตที่สุดของฉัน")}
          className="flex-shrink-0 text-[10px] font-extrabold px-3.5 py-2 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-slate-500 rounded-xl transition-all text-slate-300 flex items-center gap-1.5"
        >
          <AlertCircleIcon className="w-3.5 h-3.5 text-red-400" /> วิเคราะห์จุดอ่อนสะสม
        </button>
        <button
          onClick={() => onSendMessage("แนะนำแผนอ่านหนังสือติวสอบหน่อย")}
          className="flex-shrink-0 text-[10px] font-extrabold px-3.5 py-2 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-slate-500 rounded-xl transition-all text-slate-300 flex items-center gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> แนะนำแผนทบทวน
        </button>
      </div>

      {/* Input controls */}
      <div className="bg-slate-950 border border-white/5 p-3 rounded-2xl flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="ถาม AI Tutor เพิ่มเติมเรื่องแผนวิชาการหรือกลลวงโจทย์..."
          className="flex-1 bg-white/5 border border-white/5 focus:border-neon-blue rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-neon-blue hover:bg-cyan-400 text-black font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Inline fallback icon for robust build
function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
