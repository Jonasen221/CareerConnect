import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';

const LEVELS = [
  {
    level: 1, name: 'Basics', xp: 10,
    questions: [
      { q: "Should you always negotiate your salary?", options: ["No — accept the first offer", "Yes — most employers expect it", "Only for senior roles", "Only if underpaid by 50%+"], correct: 1 },
      { q: "When is the best time to negotiate?", options: ["Before the interview", "After you have a job offer in hand", "During the first interview", "After 3 months in the role"], correct: 1 },
      { q: "What is a BATNA?", options: ["Best Alternative To a Negotiated Agreement", "Budget Allocation for Total Net Adjustment", "Basic Annual Tax Net Amount", "Benefits and Total Net Award"], correct: 0 },
    ]
  },
  {
    level: 2, name: 'Research', xp: 13,
    questions: [
      { q: "What's the most important thing to do BEFORE negotiating?", options: ["Decide your minimum number", "Research market rate for the role, location and experience", "Ask a friend what they earn", "Look at the company's Glassdoor rating"], correct: 1 },
      { q: "Where can you find salary benchmarks?", options: ["Glassdoor, LinkedIn Salary, Reed, Totaljobs", "Ask on social media", "Only ask the recruiter", "Guess based on the job title"], correct: 0 },
      { q: "What does a total compensation package include?", options: ["Just base salary", "Salary + bonus + equity + benefits + pension + perks", "Salary + tax", "Net pay only"], correct: 1 },
    ]
  },
  {
    level: 3, name: 'Opening', xp: 17,
    questions: [
      { q: "Should you give a number first or let the employer go first?", options: ["Always let them go first", "It depends — going first lets you anchor high", "Always go first to show confidence", "Never give a number"], correct: 1 },
      { q: "What is anchoring in salary negotiation?", options: ["Locking yourself into a low number", "Setting a high first number that influences the final outcome", "Refusing to negotiate", "Accepting the first offer"], correct: 1 },
      { q: "When asked 'What are your salary expectations?', you should…", options: ["Give the lowest number you'd accept", "Give a researched range, anchoring slightly above your target", "Say 'I'll take whatever you offer'", "Deflect completely every time"], correct: 1 },
    ]
  },
  {
    level: 4, name: 'Tactics', xp: 22,
    questions: [
      { q: "What is the 'silence technique' in negotiation?", options: ["Not speaking during the interview", "After making your ask, stay silent — don't backtrack", "Refusing to answer questions", "Pausing before you speak"], correct: 1 },
      { q: "If the employer says the salary is fixed, you should…", options: ["Accept immediately", "Negotiate other benefits — start date, remote work, bonus, holidays", "Walk away", "Ask for a promotion"], correct: 1 },
      { q: "What does 'mirroring' mean in negotiation?", options: ["Copying the interviewer's body language", "Repeating the last few words they said to encourage elaboration", "Matching their salary offer exactly", "Using the same CV format"], correct: 1 },
    ]
  },
  {
    level: 5, name: 'Numbers', xp: 27,
    questions: [
      { q: "What % above market rate is reasonable to ask for?", options: ["50% above", "10–20% above the midpoint", "Exactly market rate", "Whatever feels right"], correct: 1 },
      { q: "If you're offered £30k but want £35k, what should you say?", options: ["I want £40k then", "I was hoping for something closer to £35k based on my research", "'£30k is fine I guess'", "That's too low, no thanks"], correct: 1 },
      { q: "Is it OK to ask for time to consider an offer?", options: ["No — decide on the spot", "Yes — ask for 24–48 hours to review", "Yes — ask for 2 weeks", "Only if you have another offer"], correct: 1 },
    ]
  },
  {
    level: 6, name: 'Counteroffers', xp: 33,
    questions: [
      { q: "What is a counteroffer?", options: ["A second job offer from the same company", "Your response to the employer's offer, proposing different terms", "An offer from a competitor", "A bonus structure"], correct: 1 },
      { q: "You receive a counteroffer from your current employer after resigning. Should you take it?", options: ["Always — it's more money", "Carefully consider it — research shows most who accept leave within a year", "Never — it's always a trap", "Only if it matches the new offer exactly"], correct: 1 },
      { q: "How many times can you counter in a negotiation?", options: ["Only once", "As many as needed, but 2–3 is typical", "10+ times", "None — accept first offer"], correct: 1 },
    ]
  },
  {
    level: 7, name: 'Benefits', xp: 40,
    questions: [
      { q: "Which benefit is often MORE valuable than a salary increase?", options: ["A company car", "Equity / shares — especially in startups and growth companies", "More holidays", "A corner office"], correct: 1 },
      { q: "What's a sign-on bonus?", options: ["A monthly bonus", "A one-time payment when you join, often to offset loss of old bonus", "A performance bonus", "A joining fee you pay"], correct: 1 },
      { q: "What is a clawback clause?", options: ["A salary reduction", "A requirement to repay a bonus if you leave within X months", "A penalty for performance", "A delayed salary increase"], correct: 1 },
    ]
  },
  {
    level: 8, name: 'Advanced', xp: 48,
    questions: [
      { q: "What is a 'walking away point' and why does it matter?", options: ["Your commute limit", "The minimum you'll accept — knowing it gives you confidence", "When you quit a negotiation", "A mental health boundary"], correct: 1 },
      { q: "Which negotiation style tends to get better outcomes?", options: ["Aggressive and demanding", "Collaborative — 'how can we make this work for both of us?'", "Passive — accept everything", "Emotional and pressuring"], correct: 1 },
      { q: "What does 'expanding the pie' mean in negotiation?", options: ["Eating during the meeting", "Creating more value for both sides, not just dividing a fixed resource", "Asking for more holidays", "Requesting a bigger team"], correct: 1 },
    ]
  },
  {
    level: 9, name: 'Psychology', xp: 58,
    questions: [
      { q: "What is loss aversion and how does it affect salary negotiation?", options: ["Fear of losing your job", "People fear losing money more than gaining it — you can use this to frame asks", "Not caring about the offer", "Accepting below market to avoid risk"], correct: 1 },
      { q: "How does confidence affect negotiation outcomes?", options: ["No effect", "Confident negotiators consistently achieve better outcomes", "Confidence is seen as rude", "Only matters for senior roles"], correct: 1 },
      { q: "What is the 'flinch' technique?", options: ["Flinching when you hear a bad number", "Visibly reacting to an offer to signal it's too low — without saying a word", "Walking out", "Physically shaking your head"], correct: 1 },
    ]
  },
  {
    level: 10, name: 'Master', xp: 70,
    questions: [
      { q: "What is the single most important salary negotiation rule?", options: ["Never negotiate more than once", "Never accept the first offer without at least attempting to negotiate", "Always ask for 2x the salary", "Always negotiate in writing only"], correct: 1 },
      { q: "What is a 'two-stage' negotiation strategy?", options: ["Two phone calls to decide", "Negotiate salary first, then separately negotiate benefits and perks", "Negotiate in two departments", "Ask for a raise after 2 weeks"], correct: 1 },
      { q: "What distinguishes elite negotiators from average ones?", options: ["They're more aggressive", "They listen more than they talk, ask powerful questions and create win-wins", "They always go last", "They always win everything"], correct: 1 },
    ]
  },
];

export default function SalaryNegotiationQuiz({ onComplete }) {
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
          onComplete(Math.round((newScore / totalQ) * 120));
        } else { setScore(newScore); setLevelDone(true); }
      } else { setScore(newScore); setCurrent(c => c + 1); setSelected(null); }
    }, 700);
  };

  const nextLevel = () => { setLevelIdx(l => l + 1); setCurrent(0); setSelected(null); setLevelDone(false); };

  if (allDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-5xl">{score >= totalQ * 0.8 ? '🏆' : '🎯'}</div>
      <h3 className="text-2xl font-black text-slate-800">{score}/{totalQ} correct!</h3>
      <p className="text-slate-500">{score >= totalQ * 0.8 ? 'Salary Negotiation Master!' : 'Keep practising — every negotiation is a win!'}</p>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 inline-flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-black text-amber-700">+{Math.round((score / totalQ) * 120)} XP earned!</span>
      </div>
    </motion.div>
  );

  if (levelDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-4xl">⬆️</div>
      <h3 className="text-xl font-black text-slate-800">Level {levelIdx + 1} Complete!</h3>
      <p className="text-slate-400 text-sm">+{LEVELS[levelIdx].xp} XP · Ready for <strong>{LEVELS[levelIdx + 1]?.name}</strong>?</p>
      <div className="flex gap-1.5 justify-center flex-wrap">
        {LEVELS.map((l, i) => (<div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= levelIdx ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</div>))}
      </div>
      <button onClick={nextLevel} className="flex items-center gap-2 mx-auto bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-2xl transition-colors">
        Level {levelIdx + 2} <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {LEVELS.map((l, i) => (<span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${i === levelIdx ? 'bg-green-600 text-white' : i < levelIdx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</span>))}
        </div>
        <span className="text-sm font-bold text-slate-500">{answered + 1}/{totalQ} · {level.name}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <motion.div className="h-1.5 bg-green-600 rounded-full" animate={{ width: `${((answered + 1) / totalQ) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${levelIdx}-${current}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-lg font-black text-slate-800 mb-4">{q.q}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let cls = 'border-slate-200 bg-white hover:border-green-500 hover:bg-green-50 text-slate-700';
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