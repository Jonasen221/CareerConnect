import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';

const LEVELS = [
  {
    level: 1, name: 'Profile Basics', xp: 10,
    questions: [
      { q: "What should your LinkedIn headline include?", options: ["Just your job title", "Your name and location", "Your role, value and keywords", "Your university only"], correct: 2 },
      { q: "How important is a profile photo on LinkedIn?", options: ["Not important", "Profiles with photos get up to 21x more views", "Only important for senior roles", "Optional for students"], correct: 1 },
      { q: "What does the 'Open to Work' banner do?", options: ["Hides your profile from recruiters", "Signals to recruiters you're looking for opportunities", "Shows your salary expectations", "Blocks current employer"], correct: 1 },
    ]
  },
  {
    level: 2, name: 'About Section', xp: 13,
    questions: [
      { q: "How long should your LinkedIn About section be?", options: ["1–2 sentences", "3–5 paragraphs covering your story and value", "Just your CV pasted in", "A list of skills only"], correct: 1 },
      { q: "What's the best way to start your About section?", options: ["'I am a...'", "With a hook — a question or bold statement", "With your university name", "With your GPA"], correct: 1 },
      { q: "Should you write in first or third person?", options: ["Third person always", "First person — it feels more authentic", "Third person for professionalism", "No preference"], correct: 1 },
    ]
  },
  {
    level: 3, name: 'Connections', xp: 17,
    questions: [
      { q: "What's the minimum connections to appear in LinkedIn searches?", options: ["10", "50", "500", "There's no minimum, but 500+ shows as '500+'"], correct: 3 },
      { q: "When should you personalise a connection request?", options: ["Never — waste of time", "Always — especially to people you don't know", "Only for CEOs", "Only for recruiters"], correct: 1 },
      { q: "What's a 2nd degree connection?", options: ["Someone who follows you", "A connection of your connections", "A LinkedIn Premium user", "Someone in your industry"], correct: 1 },
    ]
  },
  {
    level: 4, name: 'Experience', xp: 22,
    questions: [
      { q: "How should you describe your experience on LinkedIn?", options: ["Copy-paste your CV bullet points", "Use action verbs + outcomes + metrics where possible", "Write long paragraphs", "Just list job titles"], correct: 1 },
      { q: "Can you add media to your LinkedIn experience?", options: ["No", "Yes — add links, PDFs, videos, presentations", "Only for premium users", "Only photos"], correct: 1 },
      { q: "Should you include volunteering on LinkedIn?", options: ["No — it's not professional", "Yes — it shows character and transferable skills", "Only if paid", "Only if it lasted 1+ years"], correct: 1 },
    ]
  },
  {
    level: 5, name: 'Skills', xp: 27,
    questions: [
      { q: "How many skills can you add on LinkedIn?", options: ["10", "25", "50", "Up to 100"], correct: 3 },
      { q: "What makes a LinkedIn endorsement valuable?", options: ["Quantity of endorsements", "Quality — from relevant people in your field", "Having 500+ endorsements", "They are not valuable"], correct: 1 },
      { q: "Should your top 3 skills be pinned?", options: ["No, they show randomly", "Yes — pin the most relevant to your target roles", "Yes — pin the most popular", "It doesn't matter"], correct: 1 },
    ]
  },
  {
    level: 6, name: 'Content', xp: 33,
    questions: [
      { q: "What type of LinkedIn posts get the most engagement?", options: ["Job announcements", "Personal stories with a professional lesson", "Share links to articles", "Motivational quotes"], correct: 1 },
      { q: "How often should you post on LinkedIn?", options: ["Daily minimum", "1–3x per week for consistent visibility", "Once a month", "Only when you have news"], correct: 1 },
      { q: "What should you comment to build your presence?", options: ["Just emoji reactions", "Thoughtful, specific comments that add value", "Short 'great post!' replies", "Tags of your connections"], correct: 1 },
    ]
  },
  {
    level: 7, name: 'Recruiting', xp: 40,
    questions: [
      { q: "What does LinkedIn's algorithm prioritise?", options: ["Paid advertisements", "Engagement in the first hour of posting", "Posts with the most hashtags", "Premium account posts"], correct: 1 },
      { q: "What's the best way to reach out to a recruiter on LinkedIn?", options: ["Send your CV immediately", "Personalised message showing research + clear ask", "Connect without a message", "Send the same template to everyone"], correct: 1 },
      { q: "What's an InMail?", options: ["A LinkedIn email integration", "A message to someone you're not connected with", "A job application message", "A premium post type"], correct: 1 },
    ]
  },
  {
    level: 8, name: 'Branding', xp: 48,
    questions: [
      { q: "What is a LinkedIn Creator Mode?", options: ["A paid tier", "A mode that unlocks tools for content creators", "A privacy setting", "A job board feature"], correct: 1 },
      { q: "How should your LinkedIn banner image look?", options: ["Leave it blank", "Reflect your personal brand or industry", "Use a generic stock photo", "Show your face"], correct: 1 },
      { q: "What should your vanity URL look like?", options: ["linkedin.com/in/random123", "linkedin.com/in/firstname-lastname", "linkedin.com/in/yournickname", "Any short URL"], correct: 1 },
    ]
  },
  {
    level: 9, name: 'Advanced', xp: 58,
    questions: [
      { q: "What is the 'Featured' section used for?", options: ["Featuring your employer", "Showcasing your best work — posts, links, PDFs", "Listing your top skills", "Only for premium users"], correct: 1 },
      { q: "How can you signal you're a thought leader on LinkedIn?", options: ["Follow many people", "Publish articles and share insights regularly", "Connect with influencers", "Join many groups"], correct: 1 },
      { q: "What's the social selling index (SSI)?", options: ["How much you've spent on LinkedIn ads", "A score measuring your professional brand and network activity", "Your connection acceptance rate", "A recruiter rating system"], correct: 1 },
    ]
  },
  {
    level: 10, name: 'Legend', xp: 70,
    questions: [
      { q: "What is LinkedIn's 'dwell time' and why does it matter?", options: ["How long your profile loads", "Time spent reading a post — influences what the algorithm promotes", "How long your connections stay active", "Time between posts"], correct: 1 },
      { q: "Which best describes a winning student LinkedIn profile?", options: ["Lots of connections but no content", "Clear headline, strong About, tailored experience, regular engagement", "100% profile completion with no posts", "Just an updated CV version"], correct: 1 },
      { q: "What is the ultimate goal of your LinkedIn profile?", options: ["Maximum connections", "To tell your professional story and attract the right opportunities", "To copy successful people's profiles", "To list every job ever"], correct: 1 },
    ]
  },
];

export default function LinkedInQuizGame({ onComplete }) {
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
      <div className="text-5xl">{score >= totalQ * 0.8 ? '🏆' : score >= totalQ * 0.5 ? '🎯' : '💼'}</div>
      <h3 className="text-2xl font-black text-slate-800">{score}/{totalQ} correct!</h3>
      <p className="text-slate-500">{score >= totalQ * 0.8 ? 'LinkedIn Legend!' : 'Keep building your profile!'}</p>
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
        {LEVELS.map((l, i) => (<div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= levelIdx ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</div>))}
      </div>
      <button onClick={nextLevel} className="flex items-center gap-2 mx-auto bg-[#5BA4C4] hover:bg-[#3D87AA] text-white font-bold px-6 py-3 rounded-2xl transition-colors">
        Level {levelIdx + 2} <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {LEVELS.map((l, i) => (<span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${i === levelIdx ? 'bg-[#5BA4C4] text-white' : i < levelIdx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{i < levelIdx ? '✓' : i + 1}</span>))}
        </div>
        <span className="text-sm font-bold text-slate-500">{answered + 1}/{totalQ} · Lv{levelIdx + 1} {level.name}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <motion.div className="h-1.5 bg-[#5BA4C4] rounded-full" animate={{ width: `${((answered + 1) / totalQ) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${levelIdx}-${current}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-lg font-black text-slate-800 mb-4">{q.q}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let cls = 'border-slate-200 bg-white hover:border-[#5BA4C4] hover:bg-[#EAF5FB] text-slate-700';
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