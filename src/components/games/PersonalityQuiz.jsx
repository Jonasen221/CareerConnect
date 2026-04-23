import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

const QUESTIONS = [
  {
    q: "Your team hits a major deadline in 1 week. You…",
    options: [
      { text: "Make a detailed plan immediately 📋", trait: "analytical" },
      { text: "Rally the team and keep energy high 🔥", trait: "leader" },
      { text: "Quietly grind until it's done 🎯", trait: "executor" },
      { text: "Find creative shortcuts 💡", trait: "creative" },
    ]
  },
  {
    q: "Your ideal work day looks like…",
    options: [
      { text: "Deep focus, headphones on, flow state 🎧", trait: "executor" },
      { text: "Lots of meetings, energy from people 🤝", trait: "leader" },
      { text: "Analysing data and spotting patterns 📊", trait: "analytical" },
      { text: "Brainstorming wild new ideas 🚀", trait: "creative" },
    ]
  },
  {
    q: "A project goes wrong. Your first move is…",
    options: [
      { text: "Root cause analysis, fix the system 🔍", trait: "analytical" },
      { text: "Reassure the team, problem-solve together 💬", trait: "leader" },
      { text: "Just fix it, no drama 🛠️", trait: "executor" },
      { text: "Pivot to something better 🔄", trait: "creative" },
    ]
  },
  {
    q: "Colleagues describe you as…",
    options: [
      { text: "The one with all the facts 📚", trait: "analytical" },
      { text: "The glue that holds the team together 🌟", trait: "leader" },
      { text: "The one who just gets things done ✅", trait: "executor" },
      { text: "The ideas person 💭", trait: "creative" },
    ]
  },
  {
    q: "You learn best by…",
    options: [
      { text: "Reading docs and research papers 📖", trait: "analytical" },
      { text: "Discussing with others and debating 🗣️", trait: "leader" },
      { text: "Doing it, trial and error 🔧", trait: "executor" },
      { text: "Experimenting freely 🎨", trait: "creative" },
    ]
  },
];

const TYPES = {
  analytical: { title: "The Analyst 🔍", desc: "You thrive with data, logic, and structure. Roles: Strategy, Finance, Data Science.", color: "from-blue-500 to-blue-600", xp: 120 },
  leader: { title: "The Connector 🌟", desc: "You energise teams and build bridges. Roles: PM, Consulting, BD.", color: "from-amber-400 to-orange-500", xp: 120 },
  executor: { title: "The Builder 🛠️", desc: "You ship things fast and get stuff done. Roles: Engineering, Ops, Sales.", color: "from-emerald-500 to-emerald-600", xp: 120 },
  creative: { title: "The Visionary 💡", desc: "You see what others miss and innovate. Roles: Marketing, Design, Product.", color: "from-purple-500 to-purple-600", xp: 120 },
};

export default function PersonalityQuiz({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);

  const pick = (option) => {
    setSelected(option.trait);
    setTimeout(() => {
      const next = [...answers, option.trait];
      if (current + 1 < QUESTIONS.length) {
        setAnswers(next);
        setCurrent(c => c + 1);
        setSelected(null);
      } else {
        const tally = next.reduce((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {});
        const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
        setResult(TYPES[top]);
        onComplete(TYPES[top].xp, top);
      }
    }, 400);
  };

  const progress = ((current) / QUESTIONS.length) * 100;

  if (result) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-5xl">🎉</div>
      <div className={`inline-block bg-gradient-to-r ${result.color} text-white px-6 py-3 rounded-2xl font-black text-xl`}>{result.title}</div>
      <p className="text-slate-600 max-w-sm mx-auto">{result.desc}</p>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 inline-flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-black text-amber-700">+{result.xp} XP earned!</span>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Question {current + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}% done</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <motion.div className="h-2 bg-gradient-to-r from-[#5BA4C4] to-[#3D87AA] rounded-full"
            animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          <h3 className="text-xl font-black text-slate-800 mb-5 text-center">{QUESTIONS[current].q}</h3>
          <div className="space-y-3">
            {QUESTIONS[current].options.map((opt, i) => (
              <button key={i} onClick={() => pick(opt)}
                className={`w-full text-left p-4 rounded-2xl border-2 font-medium transition-all ${selected === opt.trait ? 'border-[#5BA4C4] bg-[#EAF5FB] text-[#3D87AA]' : 'border-slate-200 bg-white hover:border-[#5BA4C4] hover:bg-[#EAF5FB] text-slate-700'}`}>
                {opt.text}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}