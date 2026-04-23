import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';

const LEVELS = [
  {
    level: 1, name: 'Understanding Gaps', xp: 10,
    questions: [
      { q: "Should you always explain a gap on your CV?", options: ["No, recruiters won't notice", "Yes, briefly and positively", "Only if it's over 2 years", "Only if asked"], correct: 1 },
      { q: "What is a career gap?", options: ["Any time between jobs", "A period of unemployment or non-employment lasting weeks+", "A job you didn't like", "Time in an unrelated industry"], correct: 1 },
      { q: "Do career gaps automatically disqualify candidates?", options: ["Yes, always", "No — how you explain it matters most", "Only for graduate roles", "Yes for finance jobs"], correct: 1 },
    ]
  },
  {
    level: 2, name: 'Common Gaps', xp: 13,
    questions: [
      { q: "How should you frame a gap for travel?", options: ["Leave it blank", "State: travelled, gained independence, cultural awareness, language skills", "Lie about freelancing", "Don't mention it"], correct: 1 },
      { q: "How do you list a gap for mental health reasons?", options: ["'I had a breakdown'", "'Personal health — fully recovered and ready to contribute'", "Leave it blank", "List it as freelance"], correct: 1 },
      { q: "How should you frame a gap for caring responsibilities?", options: ["Don't mention it", "Career break: family care responsibilities — highlight skills gained", "Say you were unemployed", "Make up a job"], correct: 1 },
    ]
  },
  {
    level: 3, name: 'Framing', xp: 17,
    questions: [
      { q: "What is the best approach to address a gap in a cover letter?", options: ["Ignore it entirely", "Address it briefly, focus on what you did and how it prepared you", "Apologise for it", "Write a full paragraph of explanation"], correct: 1 },
      { q: "What phrase best frames a gap for studying?", options: ["I couldn't find work, so I studied", "Dedicated to full-time learning: completed [X] qualification", "I took time off to think", "Career pause — upskilling"], correct: 1 },
      { q: "What's the worst way to handle a gap question?", options: ["Be honest and direct", "Make it sound productive", "Become defensive or dishonest", "Show you learned something"], correct: 2 },
    ]
  },
  {
    level: 4, name: 'During the Gap', xp: 22,
    questions: [
      { q: "What should you do during a gap to strengthen your CV?", options: ["Nothing — rest is fine", "Volunteer, freelance, upskill or take courses", "Apply to any job available", "Network on LinkedIn only"], correct: 1 },
      { q: "Which is the MOST valuable thing to show during a gap?", options: ["You rested", "Intentional skill-building or meaningful activity", "You applied to hundreds of jobs", "You stayed up to date on TV shows"], correct: 1 },
      { q: "Can short freelance projects fill a gap on your CV?", options: ["No — recruiters see through it", "Yes — if genuine, it shows initiative and skills", "Only if paid", "Only if long-term"], correct: 1 },
    ]
  },
  {
    level: 5, name: 'Interviews', xp: 27,
    questions: [
      { q: "When asked about a gap in an interview, you should…", options: ["Change the subject", "Give a brief, honest, confident answer then pivot to the future", "Over-explain everything", "Say it's personal"], correct: 1 },
      { q: "Which answer to 'Why do you have a gap?' is best?", options: ["I just didn't want to work", "I took time to [activity] which strengthened my [skill]. I'm now ready to...", "I was unable to find work", "I don't really know"], correct: 1 },
      { q: "How long should your gap explanation take in an interview?", options: ["5+ minutes", "Under 30 seconds — then move forward", "2–3 minutes", "As long as it takes"], correct: 1 },
    ]
  },
  {
    level: 6, name: 'Stigma', xp: 33,
    questions: [
      { q: "How has attitudes to career gaps changed post-COVID?", options: ["Employers are stricter", "Employers are more understanding and open", "No change at all", "Gaps are now required"], correct: 1 },
      { q: "Are multiple career gaps a dealbreaker?", options: ["Yes — always", "No — context and growth matter more", "Only for corporate jobs", "Only if recent"], correct: 1 },
      { q: "What industry is MOST understanding of career gaps?", options: ["Finance only", "Tech & startups", "Law firms", "Investment banking"], correct: 1 },
    ]
  },
  {
    level: 7, name: 'Long Gaps', xp: 40,
    questions: [
      { q: "How do you handle a 2+ year gap on a CV?", options: ["Remove the dates", "Acknowledge it clearly — show what you did and your readiness now", "Lie about the dates", "Only apply to companies that don't care"], correct: 1 },
      { q: "What's the best thing to do before re-entering the market after a long gap?", options: ["Apply everywhere immediately", "Update skills, refresh network, tailor CV to current market", "Lower salary expectations", "Only apply to old contacts"], correct: 1 },
      { q: "Should you use a functional CV format for a long gap?", options: ["Always", "It can help by leading with skills rather than timeline", "Never — always chronological", "Only for career changers"], correct: 1 },
    ]
  },
  {
    level: 8, name: 'Returnship', xp: 48,
    questions: [
      { q: "What is a 'returnship'?", options: ["A return flight", "A structured re-entry programme for professionals returning after a break", "A recruitment agency", "A part-time job scheme"], correct: 1 },
      { q: "Which companies commonly offer returnship programmes?", options: ["Only small companies", "Goldman Sachs, Amazon, Microsoft, KPMG and many others", "Only tech startups", "Only NHS"], correct: 1 },
      { q: "What is the main benefit of a returnship?", options: ["High pay", "A structured path back into work with support and training", "Guaranteed full-time contract", "Only 1 hour per day"], correct: 1 },
    ]
  },
  {
    level: 9, name: 'Mindset', xp: 58,
    questions: [
      { q: "The biggest barrier when returning after a gap is often…", options: ["The job market", "Your own confidence — impostor syndrome", "Lack of qualifications", "Too many applicants"], correct: 1 },
      { q: "What mindset best serves someone returning to work?", options: ["Apologetic and cautious", "Confident — your gap gave you unique perspective and growth", "Desperate to take any role", "Aggressive — demand senior roles"], correct: 1 },
      { q: "What phrase should you AVOID when explaining a gap?", options: ["'I used the time to...'", "'I was going through a really difficult time and...' (oversharing)", "'I focused on...'", "'During this period I...'"], correct: 1 },
    ]
  },
  {
    level: 10, name: 'Master', xp: 70,
    questions: [
      { q: "What is the most powerful way to close a gap explanation?", options: ["End with an apology", "End with enthusiasm and what you bring now: 'I'm excited to apply X to this role'", "Trail off naturally", "Say 'anyway, that's all'"], correct: 1 },
      { q: "What do the best gap-returners have in common?", options: ["They hid the gap", "They owned it, showed growth, and came back with clarity", "They had shorter gaps", "They had better degrees"], correct: 1 },
      { q: "A 6-month gap with volunteer work, courses, and freelancing is…", options: ["Still a weakness to hide", "A strength — it shows self-direction and resilience", "Suspicious to recruiters", "Only valuable if paid"], correct: 1 },
    ]
  },
];

export default function CareerGapsQuiz({ onComplete }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [levelDone, setLevelDone] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const level = LEVELS[levelIdx];
  const totalQ = LEVELS.reduce((a, l) => a + l.questions.length, 0);
  const answered = LEVELS.slice(0, levelIdx).reduce((a, l) => a + l.questions.length, 0) + current;
  const q = level.questions[current];

  const advance = (idx) => {
    if (selected !== null) return;
    const correct = idx === q.correct;
    const newScore = correct ? score + 1 : score;
    setSelected(idx);
    setTimeout(() => {
      if (current + 1 >= level.questions.length) {
        if (levelIdx + 1 >= LEVELS.length) {
          setAllDone(true);
          onComplete(Math.round((newScore / totalQ) * 110));
        } else {
          setScore(newScore);
          setLevelDone(true);
        }
      } else {
        setScore(newScore);
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 700);
  };

  const nextLevel = () => { setLevelIdx(l => l + 1); setCurrent(0); setSelected(null); setLevelDone(false); };

  if (allDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-5xl">{score >= totalQ * 0.8 ? '🏆' : '🎯'}</div>
      <h3 className="text-2xl font-black text-slate-800">{score}/{totalQ} correct!</h3>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 inline-flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-black text-amber-700">+{Math.round((score / totalQ) * 110)} XP earned!</span>
      </div>
    </motion.div>
  );

  if (levelDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-4xl">⬆️</div>
      <h3 className="text-xl font-black text-slate-800">Level {levelIdx + 1} Complete!</h3>
      <p className="text-slate-400 text-sm">+{LEVELS[levelIdx].xp} XP · Ready for <strong>{LEVELS[levelIdx + 1]?.name}</strong>?</p>
      <div className="flex gap-1.5 justify-center flex-wrap">
        {LEVELS.map((l, i) => (<div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= levelIdx ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</div>))}
      </div>
      <button onClick={nextLevel} className="flex items-center gap-2 mx-auto bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-2xl transition-colors">
        Level {levelIdx + 2} <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {LEVELS.map((l, i) => (<span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${i === levelIdx ? 'bg-orange-500 text-white' : i < levelIdx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</span>))}
        </div>
        <span className="text-sm font-bold text-slate-500">{answered + 1}/{totalQ} · {level.name}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <motion.div className="h-1.5 bg-orange-500 rounded-full" animate={{ width: `${((answered + 1) / totalQ) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${levelIdx}-${current}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-lg font-black text-slate-800 mb-4">{q.q}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let cls = 'border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50 text-slate-700';
              if (selected !== null) {
                if (i === q.correct) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700';
                else if (i === selected) cls = 'border-red-400 bg-red-50 text-red-600';
                else cls = 'border-slate-100 bg-slate-50 text-slate-400';
              }
              return (<button key={i} onClick={() => advance(i)} className={`w-full text-left p-3 rounded-xl border-2 text-sm font-medium transition-all ${cls}`}>{opt}</button>);
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}