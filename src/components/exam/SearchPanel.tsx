"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchFilters, Difficulty, Frequency } from "@/types/exam";

interface SearchPanelProps {
  availableTopics: string[];
  onSearch: (filters: SearchFilters) => void;
  resultCount?: number;
}

export default function SearchPanel({ availableTopics, onSearch, resultCount }: SearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
    topic: undefined,
    difficulty: undefined,
    frequency: undefined,
  });

  // Trigger search on filter change
  useEffect(() => {
    onSearch(filters);
  }, [filters, onSearch]);

  const handleClear = () => {
    setFilters({
      keyword: "",
      topic: undefined,
      difficulty: undefined,
      frequency: undefined,
    });
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      {/* Search Header Bar */}
      <div className="p-4 flex flex-wrap items-center gap-4 border-b border-white/5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาข้อสอบจากคีย์เวิร์ด..."
            value={filters.keyword || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            className="w-full bg-slate-950/50 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
          />
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            isOpen || Object.values(filters).some(v => v && v !== "")
              ? "bg-neon-blue/20 border-neon-blue text-neon-blue"
              : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
          }`}
        >
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/5 bg-slate-900/30"
          >
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Topic Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topic</label>
                <select
                  value={filters.topic || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, topic: e.target.value || undefined }))}
                  className="w-full bg-slate-950/80 border border-white/10 text-white p-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:border-neon-blue transition-all"
                >
                  <option value="">ทั้งหมด (All Topics)</option>
                  {availableTopics.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Difficulty</label>
                <select
                  value={filters.difficulty || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, difficulty: (e.target.value as Difficulty) || undefined }))}
                  className="w-full bg-slate-950/80 border border-white/10 text-white p-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:border-neon-blue transition-all"
                >
                  <option value="">ทุกระดับความยาก</option>
                  <option value="Easy">Easy (ง่าย)</option>
                  <option value="Medium">Medium (ปานกลาง)</option>
                  <option value="Hard">Hard (ยาก)</option>
                  <option value="Elite">Elite (โหดหิน)</option>
                </select>
              </div>

              {/* Frequency Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Frequency (สถิติออกสอบ)</label>
                <select
                  value={filters.frequency || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, frequency: (e.target.value as Frequency) || undefined }))}
                  className="w-full bg-slate-950/80 border border-white/10 text-white p-2.5 rounded-xl text-sm appearance-none focus:outline-none focus:border-neon-blue transition-all"
                >
                  <option value="">ความถี่ทั้งหมด</option>
                  <option value="Very High">Very High (ออกบ่อยมาก)</option>
                  <option value="High">High (ออกบ่อย)</option>
                  <option value="Medium">Medium (ปานกลาง)</option>
                  <option value="Low">Low (ออกน้อย)</option>
                </select>
              </div>
            </div>

            {/* Clear Filters & Count */}
            <div className="p-4 flex items-center justify-between border-t border-white/5 bg-slate-950/50">
              <span className="text-xs text-slate-400 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/10">
                พบข้อสอบ {resultCount ?? 0} ข้อ
              </span>
              
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 font-bold transition-colors"
              >
                <X className="w-3.5 h-3.5" /> ล้างฟิลเตอร์ทั้งหมด
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
