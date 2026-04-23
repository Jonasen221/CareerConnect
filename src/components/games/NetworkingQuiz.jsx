import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';

const LEVELS = [
  {
    level: 1, name: 'Mindset', xp: 10,
    questions: [
      { q: "What is networking?", options: ["Collecting as many contacts as possible", "Building genuine, mutually beneficial professional relationships", "Only going to events", "Spamming people on LinkedIn"], correct: 1 },
      { q: "When should you start networking?", options: ["After graduating", "As soon as possible — even at university", "After 5 years of work", "Only when job hunting"], correct: 1 },
      { q: "What is the most common networking mistake?", options: ["Going to too many events", "Only networking when you need something", "Not having a business card", "Meeting too many people"], correct: 1 },
    ]
  },
  {
    level: 2, name: 'Online', xp: 13,
    questions: [
      { q: "What is the best platform for professional networking?", options: ["Instagram", "LinkedIn", "Twitter/X", "Facebook"], correct: 1 },
      { q: "What should your connection request message include?", options: ["Nothing — just send it", "Who you are, why you're connecting, and a specific reason", "Your CV attached", "How many mutual connections you have"], correct: 1 },
      { q: "What's the ideal length of an outreach message?", options: ["500+ words to explain yourself", "3–5 sentences — clear, specific and easy to respond to", "1 sentence", "A full paragraph with no ask"], correct: 1 },
    ]
  },
  {
    level: 3, name: 'Events', xp: 17,
    questions: [
      { q: "How should you prepare for a networking event?", options: ["Nothing — just show up", "Research attendees, prepare your intro, have questions ready", "Prepare a long speech", "Bring as many business cards as possible"], correct: 1 },
      { q: "What is the 'give before you get' principle?", options: ["Bring food to events", "Offer value to others before asking for anything in return", "Give your CV to everyone", "Share industry articles"], correct: 1 },
      { q: "How soon should you follow up after meeting someone?", options: ["Never", "Within 24–48 hours with a personalised message", "2 weeks later", "Only if they contact you first"], correct: 1 },
    ]
  },
  {
    level: 4, name: 'Conversation', xp: 22,
    questions: [
      { q: "What's the best conversation opener at a networking event?", options: ["'Can you help me get a job?'", "'What are you working on at the moment?'", "'What's your salary?'", "'How many connections do you have?'"], correct: 1 },
      { q: "How do you gracefully exit a conversation at a networking event?", options: ["Just walk away mid-sentence", "Thank them, exchange details, and mention someone you should introduce them to", "Say you need the bathroom", "Stand there awkwardly"], correct: 1 },
      { q: "What is active listening in networking?", options: ["Nodding without listening", "Fully engaging, asking follow-up questions, and remembering details", "Waiting for your turn to speak", "Looking around the room while someone talks"], correct: 1 },
    ]
  },
  {
    level: 5, name: 'Informational Interviews', xp: 27,
    questions: [
      { q: "What is an informational interview?", options: ["A job interview", "A casual conversation to learn about someone's role/industry", "An interview you do for information on a company", "A panel interview format"], correct: 1 },
      { q: "What should you ask in an informational interview?", options: ["'Can you get me a job?'", "'What does your typical day look like?' and 'What skills do you wish you had developed earlier?'", "Salary questions only", "'Do you think I'm qualified?'"], correct: 1 },
      { q: "How long should an informational interview be?", options: ["60 minutes minimum", "20–30 minutes — respect their time", "As long as possible", "5 minutes only"], correct: 1 },
    ]
  },
  {
    level: 6, name: 'Building Relationships', xp: 33,
    questions: [
      { q: "What does a strong professional network look like?", options: ["500+ LinkedIn connections", "A diverse mix of meaningful relationships across industries and levels", "Only senior people", "Only people in your field"], correct: 1 },
      { q: "How do you maintain relationships in your network?", options: ["Only contact people when you need help", "Regular, genuine touchpoints — sharing articles, congratulating wins, checking in", "Send mass emails periodically", "Accept all connection requests"], correct: 1 },
      { q: "What is a 'weak tie' in networking theory?", options: ["A connection you don't value", "An acquaintance — research shows weak ties often lead to the best opportunities", "Someone outside your field", "A connection with no mutual contacts"], correct: 1 },
    ]
  },
  {
    level: 7, name: 'Alumni Networks', xp: 40,
    questions: [
      { q: "Why are alumni networks powerful for job seekers?", options: ["They guarantee jobs", "Shared experience creates instant rapport and willingness to help", "They're free to join", "They have job boards"], correct: 1 },
      { q: "How should you approach a stranger alumnus on LinkedIn?", options: ["'Can you get me a job at your company?'", "Reference your shared university, show genuine interest, make a small specific ask", "Send your CV immediately", "Connect without a message"], correct: 1 },
      { q: "What's the best ask for a first message to an alumnus?", options: ["Job referral immediately", "A 15-minute call to hear about their career path", "Their salary information", "Introduction to their CEO"], correct: 1 },
    ]
  },
  {
    level: 8, name: 'Personal Brand', xp: 48,
    questions: [
      { q: "What is personal branding in networking?", options: ["Creating a logo for yourself", "How you consistently present your values, skills and story professionally", "Having a website", "Only applies to influencers"], correct: 1 },
      { q: "How does sharing content on LinkedIn help your network?", options: ["It doesn't — content is spam", "It keeps you visible, demonstrates expertise, and attracts inbound conversations", "Only useful for sales people", "Only helps if you have 1000+ followers"], correct: 1 },
      { q: "What is a 'brand statement'?", options: ["A company slogan", "A 1–2 sentence summary of who you are and the value you bring", "A LinkedIn post", "Your job title"], correct: 1 },
    ]
  },
  {
    level: 9, name: 'Advanced Strategy', xp: 58,
    questions: [
      { q: "What does 'mapping your network' mean?", options: ["Drawing a literal map", "Identifying key people, gaps and opportunities in your professional connections", "Creating a spreadsheet of everyone you know", "Following everyone on LinkedIn"], correct: 1 },
      { q: "How should you approach a cold outreach to someone you really admire?", options: ["Don't bother — they're too busy", "Short, specific, respectful message that shows you've researched their work", "Send a long email explaining everything", "Ask a mutual connection to beg on your behalf"], correct: 1 },
      { q: "What is a 'super connector' in networking?", options: ["A LinkedIn Premium user", "Someone who actively bridges people across different networks", "A person with 10,000+ connections", "A recruiter"], correct: 1 },
    ]
  },
  {
    level: 10, name: 'Master', xp: 70,
    questions: [
      { q: "What separates average networkers from elite ones?", options: ["More contacts", "They focus on genuinely helping others — the relationships become reciprocal naturally", "Premium LinkedIn accounts", "Going to more events"], correct: 1 },
      { q: "What is the 'law of reciprocity' in networking?", options: ["You must repay favours immediately", "When you help others, they are psychologically inclined to help you back", "You owe people who help you", "It's a legal networking rule"], correct: 1 },
      { q: "What is the ultimate goal of a professional network?", options: ["Getting jobs through it", "A community of mutual support, opportunity-sharing and long-term career growth", "Having the most connections", "Being liked by everyone"], correct: 1 },
    ]
  },
];

export default function NetworkingQuiz({ onComplete }) {
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
          onComplete(Math.round((newScore / totalQ) * 115));
        } else { setScore(newScore); setLevelDone(true); }
      } else { setScore(newScore); setCurrent(c => c + 1); setSelected(null); }
    }, 700);
  };

  const nextLevel = () => { setLevelIdx(l => l + 1); setCurrent(0); setSelected(null); setLevelDone(false); };

  if (allDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-5xl">{score >= totalQ * 0.8 ? '🏆' : '🤝'}</div>
      <h3 className="text-2xl font-black text-slate-800">{score}/{totalQ} correct!</h3>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 inline-flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-black text-amber-700">+{Math.round((score / totalQ) * 115)} XP earned!</span>
      </div>
    </motion.div>
  );

  if (levelDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-4xl">⬆️</div>
      <h3 className="text-xl font-black text-slate-800">Level {levelIdx + 1} Complete!</h3>
      <p className="text-slate-400 text-sm">+{LEVELS[levelIdx].xp} XP · Ready for <strong>{LEVELS[levelIdx + 1]?.name}</strong>?</p>
      <div className="flex gap-1.5 justify-center flex-wrap">
        {LEVELS.map((l, i) => (<div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= levelIdx ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</div>))}
      </div>
      <button onClick={nextLevel} className="flex items-center gap-2 mx-auto bg-violet-500 hover:bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl transition-colors">
        Level {levelIdx + 2} <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {LEVELS.map((l, i) => (<span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${i === levelIdx ? 'bg-violet-500 text-white' : i < levelIdx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</span>))}
        </div>
        <span className="text-sm font-bold text-slate-500">{answered + 1}/{totalQ} · {level.name}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <motion.div className="h-1.5 bg-violet-500 rounded-full" animate={{ width: `${((answered + 1) / totalQ) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${levelIdx}-${current}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-lg font-black text-slate-800 mb-4">{q.q}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let cls = 'border-slate-200 bg-white hover:border-violet-400 hover:bg-violet-50 text-slate-700';
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