import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Trophy, Loader2, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const LEVELS = [
  { level: 1, name: 'Intro', emoji: '🟢', xp: 10, question: "Tell me about yourself.", tip: "Use Present-Past-Future: who you are now, relevant experience, and why this role." },
  { level: 2, name: 'Motivation', emoji: '🟢', xp: 13, question: "Why do you want to work for us?", tip: "Show you've researched the company. Connect their mission to your goals." },
  { level: 3, name: 'Strength', emoji: '🟡', xp: 17, question: "What is your greatest strength and how does it apply to this role?", tip: "Pick a strength relevant to the job. Give a concrete example." },
  { level: 4, name: 'Weakness', emoji: '🟡', xp: 22, question: "What is your greatest weakness?", tip: "Be honest but show self-awareness and what you're doing to improve." },
  { level: 5, name: 'Behavioural', emoji: '🟡', xp: 27, question: "Tell me about a time you dealt with a difficult team member. What did you do?", tip: "Use the STAR method: Situation, Task, Action, Result." },
  { level: 6, name: 'Leadership', emoji: '🟠', xp: 33, question: "Describe a time you took initiative or led a project. What was the outcome?", tip: "Show ownership, decision-making, and measurable results." },
  { level: 7, name: 'Pressure', emoji: '🟠', xp: 40, question: "Describe a situation where you had to manage competing priorities under tight deadlines.", tip: "Be specific with numbers/outcomes. Show self-awareness and prioritisation skills." },
  { level: 8, name: 'Failure', emoji: '🔴', xp: 48, question: "Tell me about a time you failed. What did you learn?", tip: "Be honest. The key is showing growth, reflection, and what changed after." },
  { level: 9, name: 'Conflict', emoji: '🔴', xp: 58, question: "Describe a time you disagreed with your manager. How did you handle it?", tip: "Show maturity, constructive communication, and professionalism." },
  { level: 10, name: 'Vision', emoji: '🔴', xp: 70, question: "Where do you see yourself in 5 years, and how does this role help you get there?", tip: "Be ambitious but realistic. Connect your long-term goals to the company's growth." },
];

function LevelChallenge({ level, onComplete }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (answer.trim().length < 30) return;
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a senior career coach evaluating a student's interview answer. 
Level: ${level.name} — Question: "${level.question}"
Student answer: "${answer}"
Tip context: ${level.tip}

Score out of 10 and give 2 short actionable tips (max 15 words each). Be encouraging.
Return JSON: { "score": number, "verdict": "one sentence", "tips": ["tip1", "tip2"] }`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          verdict: { type: "string" },
          tips: { type: "array", items: { type: "string" } }
        }
      }
    });
    setFeedback(res);
    setLoading(false);
    onComplete(res.score);
  };

  if (feedback) return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2">{feedback.score >= 8 ? '🌟' : feedback.score >= 6 ? '👏' : '💪'}</div>
        <div className="text-3xl font-black text-slate-800">{feedback.score}/10</div>
        <p className="text-slate-500 text-sm mt-1">{feedback.verdict}</p>
      </div>
      <div className="bg-[#EAF5FB] border border-[#A8D4E8] rounded-2xl p-4 space-y-2">
        {feedback.tips.map((tip, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="w-5 h-5 bg-[#5BA4C4] text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</span>
            <p className="text-sm text-slate-700">{tip}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">💡 Tip</p>
        <p className="text-sm text-slate-600">{level.tip}</p>
      </div>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Write your answer here..."
        className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm resize-none focus:border-[#5BA4C4] focus:outline-none transition-colors"
        rows={5}
      />
      <p className="text-xs text-slate-400">{answer.length} characters · Aim for 100–300</p>
      <Button onClick={submit} disabled={loading || answer.trim().length < 30}
        className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA] py-4 font-bold rounded-2xl">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI is rating...</> : 'Get AI Feedback ✨'}
      </Button>
    </div>
  );
}

export default function InterviewQAGame({ onComplete }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [scores, setScores] = useState([]);
  const [levelDone, setLevelDone] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const handleLevelComplete = (score) => {
    const newScores = [...scores, score];
    setScores(newScores);
    setLevelDone(true);
    if (levelIdx + 1 >= LEVELS.length) {
      const avg = newScores.reduce((a, b) => a + b, 0) / newScores.length;
      const xp = Math.round((avg / 10) * 140);
      setTimeout(() => { setAllDone(true); onComplete(xp); }, 800);
    }
  };

  const nextLevel = () => {
    setLevelIdx(l => l + 1);
    setLevelDone(false);
  };

  if (allDone) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-5">
        <div className="text-5xl">{avg >= 8 ? '🏆' : avg >= 6 ? '🎯' : '💪'}</div>
        <h3 className="text-2xl font-black text-slate-800">All 10 Levels Complete!</h3>
        <p className="text-slate-500">Average score: {avg.toFixed(1)}/10</p>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 inline-flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span className="font-black text-amber-700">+{Math.round((avg / 10) * 140)} XP earned!</span>
        </div>
      </motion.div>
    );
  }

  const level = LEVELS[levelIdx];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 flex-wrap">
        {LEVELS.map((l, i) => (
          <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === levelIdx ? 'bg-[#5BA4C4] text-white' : i < levelIdx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
            {i < levelIdx ? '✓' : i + 1}
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-1">Lv{levelIdx + 1}: {level.name}</span>
      </div>

      <div className="bg-gradient-to-r from-[#5BA4C4] to-[#3D87AA] rounded-2xl p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">{level.emoji} Level {levelIdx + 1} — {level.name} (+{level.xp} XP)</p>
        <p className="font-black text-lg">"{level.question}"</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={levelIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          {levelDone && levelIdx + 1 < LEVELS.length ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl">⬆️</div>
              <p className="font-black text-slate-800">Level {levelIdx + 1} done! Score: {scores[levelIdx]}/10</p>
              <p className="text-slate-500 text-sm">Ready for Level {levelIdx + 2}: <strong>{LEVELS[levelIdx + 1]?.name}</strong>?</p>
              <button onClick={nextLevel} className="flex items-center gap-2 mx-auto bg-[#5BA4C4] hover:bg-[#3D87AA] text-white font-bold px-6 py-3 rounded-2xl transition-colors">
                Next Level <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <LevelChallenge level={level} onComplete={handleLevelComplete} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}