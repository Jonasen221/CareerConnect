import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';

const LEVELS = [
  {
    level: 1, name: 'Beginner', xp: 10,
    questions: [
      { q: "A CV should be how long for a student?", options: ["1 page", "2 pages", "3 pages", "As long as needed"], correct: 0 },
      { q: "Which email is best for a professional CV?", options: ["partyking99@hotmail.com", "john.smith@gmail.com", "js@uni.ac.uk", "Either B or C"], correct: 3 },
      { q: "What should go at the TOP of a student CV?", options: ["Work Experience", "Hobbies", "Personal Statement / Contact Info", "References"], correct: 2 },
    ]
  },
  {
    level: 2, name: 'Basics', xp: 13,
    questions: [
      { q: "Should you include a photo on a UK CV?", options: ["Always", "Never", "Optional – generally not recommended", "Only if attractive"], correct: 2 },
      { q: "Which section should a student prioritise?", options: ["References", "Education & Skills", "Hobbies", "Salary expectations"], correct: 1 },
      { q: "What font size is standard for CV body text?", options: ["8pt", "10–12pt", "14pt", "16pt"], correct: 1 },
    ]
  },
  {
    level: 3, name: 'Structure', xp: 17,
    questions: [
      { q: "Which bullet point is stronger?", options: ["Helped with marketing", "Increased social media engagement by 40% in 3 months", "Worked on campaigns", "Did marketing stuff"], correct: 1 },
      { q: "What does ATS stand for?", options: ["Application Tracking Sheet", "Applicant Tracking System", "Automated Task System", "Annual Talent Score"], correct: 1 },
      { q: "Keywords in a CV should match…", options: ["Your university course name", "The job description", "Industry buzzwords only", "LinkedIn profile"], correct: 1 },
    ]
  },
  {
    level: 4, name: 'Language', xp: 22,
    questions: [
      { q: "What's the best tense for bullet points describing past jobs?", options: ["Present tense", "Future tense", "Past tense (action verbs)", "Passive voice"], correct: 2 },
      { q: "Which action verb is WEAKEST?", options: ["Led", "Developed", "Helped", "Achieved"], correct: 2 },
      { q: "How should you describe a gap year on a CV?", options: ["Leave it blank", "Explain it honestly with skills gained", "Lie about employment", "Remove it entirely"], correct: 1 },
    ]
  },
  {
    level: 5, name: 'Intermediate', xp: 27,
    questions: [
      { q: "Which CV format is best for a career changer?", options: ["Chronological", "Functional / Skills-based", "Infographic", "One-liner"], correct: 1 },
      { q: "A strong quantified bullet includes…", options: ["Action verb + task only", "Action verb + task + result + metric", "Job title + company", "Responsibilities"], correct: 1 },
      { q: "When should you use a cover letter?", options: ["Never — waste of time", "Always unless specified otherwise", "Only for senior roles", "Only for internships"], correct: 1 },
    ]
  },
  {
    level: 6, name: 'Tailoring', xp: 33,
    questions: [
      { q: "Which is a red flag for recruiters?", options: ["Short internship stints", "Gaps with explanation", "Generic objective with no tailoring", "University societies"], correct: 2 },
      { q: "You're applying to a tech company. What should you emphasise?", options: ["Hobbies", "Technical skills and projects", "Number of previous employers", "Soft skills only"], correct: 1 },
      { q: "How many CVs should you have?", options: ["One universal CV", "A tailored version per application type", "Dozens, one per company", "None — use LinkedIn only"], correct: 1 },
    ]
  },
  {
    level: 7, name: 'Advanced', xp: 40,
    questions: [
      { q: "What is a 'one-pager' CV best used for?", options: ["All applications", "Networking events & quick pitches", "Government jobs", "Graduate schemes only"], correct: 1 },
      { q: "How do you handle 5+ years of experience on one page?", options: ["Remove early roles entirely", "Summarise older roles in one line", "Use size-6 font", "Add a second page"], correct: 1 },
      { q: "What's the purpose of a personal profile/summary?", options: ["List every job", "Hook the reader in 3–5 sentences", "List hobbies", "Show salary history"], correct: 1 },
    ]
  },
  {
    level: 8, name: 'Expert', xp: 48,
    questions: [
      { q: "What makes an executive CV different from a junior one?", options: ["Longer and more detailed throughout", "Focuses on leadership, strategy & measurable impact", "Includes more hobbies", "No difference"], correct: 1 },
      { q: "What does 'P-A-R' stand for in CV bullet writing?", options: ["Person-Ability-Role", "Problem-Action-Result", "Priority-Achievement-Relevance", "Purpose-Activity-Result"], correct: 1 },
      { q: "A recruiter scans a CV for how long on average?", options: ["5 minutes", "30 seconds or less", "2 minutes", "1 minute"], correct: 1 },
    ]
  },
  {
    level: 9, name: 'Master', xp: 58,
    questions: [
      { q: "Which of these increases ATS compatibility?", options: ["Tables and columns", "Plain text, standard section headings", "Graphics and icons", "PDF with custom fonts"], correct: 1 },
      { q: "What is a 'hybrid' CV format?", options: ["Two CVs in one file", "Combines chronological + functional sections", "A CV and cover letter merged", "A video CV"], correct: 1 },
      { q: "How should you list a failed startup on your CV?", options: ["Hide it", "Founder – [Company] | highlight skills & traction", "Only list it if it succeeded", "List as gap year"], correct: 1 },
    ]
  },
  {
    level: 10, name: 'Legend', xp: 70,
    questions: [
      { q: "A CV for a creative agency should…", options: ["Be the same as any other CV", "Show personality while remaining professional", "Be 3 pages", "Include salary history"], correct: 1 },
      { q: "What is a 'T-shaped' skills profile?", options: ["Two columns of skills", "Deep expertise in one area + broad knowledge across others", "Technical + soft skills equally split", "Top 5 skills listed"], correct: 1 },
      { q: "Which statement best represents elite CV writing?", options: ["List every responsibility in detail", "Every word earns its place — metrics, impact, clarity", "Use the same template everyone uses", "Make it as long as possible"], correct: 1 },
    ]
  },
];

export default function CvReviewGame({ onComplete }) {
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
          const xp = Math.round((newScore / totalQ) * 130);
          onComplete(xp);
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

  const nextLevel = () => {
    setLevelIdx(l => l + 1);
    setCurrent(0);
    setSelected(null);
    setLevelDone(false);
  };

  if (allDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-5xl">{score >= totalQ * 0.8 ? '🏆' : score >= totalQ * 0.5 ? '🎯' : '📚'}</div>
      <h3 className="text-2xl font-black text-slate-800">{score}/{totalQ} correct!</h3>
      <p className="text-slate-500">{score >= totalQ * 0.8 ? 'CV Legend! You know your stuff.' : score >= totalQ * 0.5 ? 'Good effort — keep polishing!' : 'Keep learning, you\'ll get there!'}</p>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 inline-flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-black text-amber-700">+{Math.round((score / totalQ) * 130)} XP earned!</span>
      </div>
    </motion.div>
  );

  if (levelDone) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
      <div className="text-4xl">⬆️</div>
      <h3 className="text-xl font-black text-slate-800">Level {levelIdx + 1} Complete!</h3>
      <p className="text-slate-500 text-sm">+{LEVELS[levelIdx].xp} XP for this level</p>
      <p className="text-slate-400 text-sm">Ready for <strong>{LEVELS[levelIdx + 1]?.name}</strong>?</p>
      <div className="flex gap-1.5 justify-center flex-wrap">
        {LEVELS.map((l, i) => (
          <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= levelIdx ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div>
        ))}
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
          {LEVELS.map((l, i) => (
            <span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${i === levelIdx ? 'bg-[#5BA4C4] text-white' : i < levelIdx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {i < levelIdx ? '✓' : i + 1}
            </span>
          ))}
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
              return (
                <button key={i} onClick={() => advance(i)}
                  className={`w-full text-left p-3 rounded-xl border-2 text-sm font-medium transition-all ${cls}`}>
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