import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

const LEVELS = [
  {
    level: 1, name: 'Starter', xp: 8,
    rounds: [
      { term: "KPI", options: ["Key Performance Indicator", "Knowledge Platform Index", "Key Product Integration", "Known Process Issue"], correct: 0 },
      { term: "ROI", options: ["Rate of Interest", "Return on Investment", "Revenue Optimisation Index", "Risk of Involvement"], correct: 1 },
      { term: "B2B", options: ["Back to Basics", "Budget to Budget", "Business to Business", "Brand to Brand"], correct: 2 },
    ]
  },
  {
    level: 2, name: 'Basic', xp: 10,
    rounds: [
      { term: "MVP", options: ["Most Valued Professional", "Minimum Viable Product", "Maximum Value Point", "Market Validation Phase"], correct: 1 },
      { term: "P&L", options: ["Process & Logistics", "People & Leadership", "Profit & Loss", "Planning & Launch"], correct: 2 },
      { term: "OKR", options: ["Operational Key Result", "Objectives and Key Results", "Outcome Kickoff Review", "Output Knowledge Rate"], correct: 1 },
    ]
  },
  {
    level: 3, name: 'Finance', xp: 13,
    rounds: [
      { term: "VC", options: ["Value Creation", "Venture Capital", "Visual Content", "Variable Cost"], correct: 1 },
      { term: "IPO", options: ["Internal Project Order", "Initial Public Offering", "International Partnership Outline", "Investment Portfolio Option"], correct: 1 },
      { term: "EBITDA", options: ["Earnings Before Interest, Tax, Depreciation & Amortisation", "Estimated Budget for Investment and Trade Development Analysis", "External Business Income Tax Deduction Allowance", "Enterprise Budget Impact and Total Depreciation Analysis"], correct: 0 },
    ]
  },
  {
    level: 4, name: 'Strategy', xp: 17,
    rounds: [
      { term: "USP", options: ["Universal Sales Point", "Unique Selling Proposition", "User Segmentation Plan", "Unified Strategy Process"], correct: 1 },
      { term: "B2C", options: ["Business to Contractor", "Brand to Consumer", "Business to Consumer", "Budget to Cost"], correct: 2 },
      { term: "SWOT", options: ["Sales, Work, Operations, Talent", "Strengths, Weaknesses, Opportunities, Threats", "Strategy, Workflow, Output, Targets", "Skills, Work, Outcomes, Timelines"], correct: 1 },
    ]
  },
  {
    level: 5, name: 'Tech', xp: 22,
    rounds: [
      { term: "SaaS", options: ["Service as a Startup", "Software as a Service", "Sales and Service", "Scalable as a Solution"], correct: 1 },
      { term: "API", options: ["Application Programming Interface", "Automated Process Integration", "Advanced Product Interface", "Annual Performance Index"], correct: 0 },
      { term: "CRM", options: ["Customer Relationship Management", "Cost Reduction Model", "Client Revenue Metrics", "Corporate Risk Management"], correct: 0 },
    ]
  },
  {
    level: 6, name: 'HR & People', xp: 27,
    rounds: [
      { term: "DEI", options: ["Data Engineering Index", "Diversity, Equity & Inclusion", "Digital Employee Integration", "Direct Employment Initiative"], correct: 1 },
      { term: "L&D", options: ["Leadership & Development", "Learning & Development", "Labour & Delivery", "Legal & Documentation"], correct: 1 },
      { term: "EVP", options: ["Employee Value Proposition", "External Venture Platform", "Engagement & Value Programme", "Executive Vision Plan"], correct: 0 },
    ]
  },
  {
    level: 7, name: 'Marketing', xp: 33,
    rounds: [
      { term: "CAC", options: ["Client Acquisition Cost", "Customer Acquisition Cost", "Campaign Assessment Criteria", "Cost Allocation Calculation"], correct: 1 },
      { term: "LTV", options: ["Long-Term Value", "Lifetime Value", "Lead-to-Value", "Loyal Target Volume"], correct: 1 },
      { term: "SEO", options: ["Sales & Engagement Output", "Search Engine Optimisation", "Structured Email Operations", "Service Enhancement Overview"], correct: 1 },
    ]
  },
  {
    level: 8, name: 'Operations', xp: 40,
    rounds: [
      { term: "SLA", options: ["Sales Level Agreement", "Service Level Agreement", "Standard Launch Assessment", "Structured Lead Analysis"], correct: 1 },
      { term: "NPS", options: ["Net Promoter Score", "New Product Strategy", "Network Performance Scale", "National Pricing Standard"], correct: 0 },
      { term: "COO", options: ["Chief Operations Officer", "Commercial Output Optimiser", "Client Onboarding Owner", "Corporate Oversight Officer"], correct: 0 },
    ]
  },
  {
    level: 9, name: 'Advanced', xp: 48,
    rounds: [
      { term: "ARR", options: ["Annual Recurring Revenue", "Average Return Rate", "Asset Risk Ratio", "Automated Revenue Report"], correct: 0 },
      { term: "M&A", options: ["Marketing & Analytics", "Mergers & Acquisitions", "Management & Accounting", "Metrics & Assessment"], correct: 1 },
      { term: "GTM", options: ["Global Trade Matrix", "Go-to-Market (strategy)", "Growth Target Model", "General Task Management"], correct: 1 },
    ]
  },
  {
    level: 10, name: 'Expert', xp: 60,
    rounds: [
      { term: "CAGR", options: ["Compound Annual Growth Rate", "Current Asset to Growth Ratio", "Client Acquisition Goal Rate", "Corporate Annual Goal Report"], correct: 0 },
      { term: "PE", options: ["Personal Equity", "Public Entity", "Private Equity", "Performance Evaluation"], correct: 2 },
      { term: "TAM", options: ["Total Addressable Market", "Target Audience Metrics", "Trade Analysis Model", "Team Allocation Management"], correct: 0 },
    ]
  },
];

export default function JobJargonGame({ onComplete }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [current, setCurrent] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [levelDone, setLevelDone] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const level = LEVELS[levelIdx];
  const q = level.rounds[current];
  const totalQ = LEVELS.reduce((a, l) => a + l.rounds.length, 0);

  useEffect(() => {
    if (allDone || levelDone || selected !== null) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { advance(null); return 15; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [current, levelIdx, selected, levelDone, allDone]);

  const advance = (idx) => {
    if (selected !== null) return;
    const isCorrect = idx === q.correct;
    const newScore = isCorrect ? totalScore + 1 : totalScore;
    setSelected(idx);
    setTimeout(() => {
      if (current + 1 >= level.rounds.length) {
        if (levelIdx + 1 >= LEVELS.length) {
          setAllDone(true);
          const xp = Math.round((newScore / totalQ) * 100);
          onComplete(xp);
        } else {
          setTotalScore(newScore);
          setLevelDone(true);
        }
      } else {
        setTotalScore(newScore);
        setCurrent(c => c + 1);
        setSelected(null);
        setTimeLeft(15);
      }
    }, 700);
  };

  const nextLevel = () => {
    setLevelIdx(l => l + 1);
    setCurrent(0);
    setSelected(null);
    setTimeLeft(15);
    setLevelDone(false);
  };

  if (allDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-5xl">{totalScore >= totalQ * 0.8 ? '🏆' : totalScore >= totalQ * 0.5 ? '🥈' : '📚'}</div>
      <h3 className="text-2xl font-black text-slate-800">{totalScore}/{totalQ} correct!</h3>
      <p className="text-slate-500">{totalScore >= totalQ * 0.8 ? 'Jargon Master!' : totalScore >= totalQ * 0.5 ? 'Solid business vocab!' : 'Keep learning!'}</p>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 inline-flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-black text-amber-700">+{Math.round((totalScore / totalQ) * 100)} XP earned!</span>
      </div>
    </motion.div>
  );

  if (levelDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-4xl">⬆️</div>
      <h3 className="text-xl font-black text-slate-800">Level {levelIdx + 1} Complete!</h3>
      <p className="text-slate-500 text-sm">+{LEVELS[levelIdx].xp} XP · Ready for <strong>{LEVELS[levelIdx + 1]?.name}</strong>?</p>
      <div className="flex gap-1.5 justify-center flex-wrap">
        {LEVELS.map((l, i) => (
          <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= levelIdx ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</div>
        ))}
      </div>
      <button onClick={nextLevel} className="flex items-center gap-2 mx-auto bg-[#5BA4C4] hover:bg-[#3D87AA] text-white font-bold px-6 py-3 rounded-2xl transition-colors">
        Level {levelIdx + 2} →
      </button>
    </motion.div>
  );

  const timerPct = (timeLeft / 15) * 100;
  const answered = LEVELS.slice(0, levelIdx).reduce((a, l) => a + l.rounds.length, 0) + current;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Lv{levelIdx + 1} {level.name}</span>
          <div className="flex gap-1">
            {LEVELS.map((l, i) => (
              <div key={i} className={`w-4 h-4 rounded-full text-xs flex items-center justify-center ${i === levelIdx ? 'bg-[#5BA4C4]' : i < levelIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
        <span className={`font-black text-lg ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#5BA4C4]'}`}>{timeLeft}s</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <motion.div className={`h-1.5 rounded-full ${timeLeft <= 5 ? 'bg-red-400' : 'bg-[#5BA4C4]'}`}
          animate={{ width: `${timerPct}%` }} transition={{ duration: 0.3 }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${levelIdx}-${current}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center py-6">
            <div className="inline-block bg-gradient-to-r from-[#5BA4C4] to-[#3D87AA] text-white font-black text-4xl px-8 py-4 rounded-3xl shadow-lg mb-4">{q.term}</div>
            <p className="text-slate-400 text-sm">What does this mean?</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, i) => {
              let cls = 'border-slate-200 bg-white hover:border-[#5BA4C4] hover:bg-[#EAF5FB] text-slate-700';
              if (selected !== null) {
                if (i === q.correct) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700';
                else if (i === selected) cls = 'border-red-400 bg-red-50 text-red-600';
                else cls = 'border-slate-100 bg-slate-50 text-slate-400';
              }
              return (
                <button key={i} onClick={() => selected === null && advance(i)}
                  className={`w-full text-left p-4 rounded-2xl border-2 font-medium transition-all ${cls}`}>
                  {opt}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}