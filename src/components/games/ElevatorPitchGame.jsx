import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { Trophy, Loader2, Sparkles } from 'lucide-react';

const SCENARIOS = [
  { role: "Software Engineer at a startup", company: "a fast-growing fintech startup", time: "30 seconds in a lift" },
  { role: "Marketing Analyst at a global brand", company: "a Fortune 500 FMCG company", time: "1 minute at a career fair" },
  { role: "Business Analyst at a consulting firm", company: "a top-tier consultancy", time: "30 seconds at a networking event" },
];

export default function ElevatorPitchGame({ onComplete }) {
  const [scenario] = useState(SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]);
  const [pitch, setPitch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pitch.trim().length < 20) return;
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a career coach evaluating a student's elevator pitch for: ${scenario.role} at ${scenario.company}. The student had ${scenario.time}.

Student pitch: "${pitch}"

Rate this pitch out of 10 and give exactly 3 short, actionable bullet points of feedback (max 15 words each). Be encouraging but honest.

Return JSON: { "score": number, "summary": "one sentence verdict", "tips": ["tip1", "tip2", "tip3"] }`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          summary: { type: "string" },
          tips: { type: "array", items: { type: "string" } }
        }
      }
    });
    setFeedback(res);
    const xp = Math.round((res.score / 10) * 110);
    onComplete(xp);
    setLoading(false);
  };

  if (feedback) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="text-center">
        <div className="text-5xl mb-3">{feedback.score >= 8 ? '🌟' : feedback.score >= 6 ? '👏' : '💪'}</div>
        <div className="text-4xl font-black text-slate-800">{feedback.score}/10</div>
        <p className="text-slate-500 mt-1">{feedback.summary}</p>
      </div>
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        {feedback.tips.map((tip, i) => (
          <div key={i} className="flex gap-3">
            <span className="w-6 h-6 bg-[#5BA4C4] text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</span>
            <p className="text-sm text-slate-600">{tip}</p>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-black text-amber-700">+{Math.round((feedback.score / 10) * 110)} XP earned!</span>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-[#5BA4C4] to-[#3D87AA] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">Your Scenario</span></div>
        <p className="font-black text-lg">You're applying for <span className="underline">{scenario.role}</span></p>
        <p className="text-white/80 text-sm mt-1">You bump into the CEO of {scenario.company}. You have {scenario.time}.</p>
      </div>

      <div>
        <label className="text-sm font-bold text-slate-700 block mb-2">Write your elevator pitch 🎤</label>
        <textarea
          value={pitch}
          onChange={e => setPitch(e.target.value)}
          placeholder="Hi! I'm [name], a [year] [major] student at [university]. I'm passionate about... My experience in... means I can..."
          className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm resize-none focus:border-[#5BA4C4] focus:outline-none transition-colors"
          rows={5}
        />
        <p className="text-xs text-slate-400 mt-1">{pitch.length} characters · Aim for 150–250</p>
      </div>

      <Button onClick={submit} disabled={loading || pitch.trim().length < 20}
        className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA] py-5 font-bold rounded-2xl">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI is rating your pitch...</> : 'Submit for AI Feedback ✨'}
      </Button>
    </div>
  );
}