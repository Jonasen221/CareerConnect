import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, X, CheckCircle, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';

export default function AIJobMatcher({ job, profile }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyse = async () => {
    setOpen(true);
    if (result) return; // already fetched for this job
    setLoading(true);

    const prompt = `You are a career advisor AI. Analyse how well a student's profile matches a job listing.

STUDENT PROFILE:
- Name: ${profile.full_name || 'N/A'}
- Major: ${profile.major || 'N/A'}
- University: ${profile.university || 'N/A'}
- Graduation Year: ${profile.graduation_year || 'N/A'}
- GPA: ${profile.gpa || 'N/A'}
- Skills: ${(profile.skills || []).join(', ') || 'N/A'}
- Languages: ${(profile.languages || []).join(', ') || 'N/A'}
- Work Preferences: ${(profile.work_preferences || []).join(', ') || 'N/A'}
- Bio: ${profile.bio || 'N/A'}

JOB LISTING:
- Title: ${job.title}
- Company: ${job.company}
- Type: ${job.type?.replace('_', ' ') || 'N/A'}
- Location: ${job.location || 'N/A'}
- Required Skills: ${(job.required_skills || []).join(', ') || 'N/A'}
- Required Languages: ${(job.required_languages || []).join(', ') || 'N/A'}
- Preferred Majors: ${(job.preferred_majors || []).join(', ') || 'N/A'}
- Description: ${job.description || 'N/A'}

Return a JSON object with:
- match_score: number 0-100
- verdict: one of "Strong Match", "Good Match", "Partial Match", "Low Match"
- strengths: array of 2-3 short strings (what the student has that matches)
- gaps: array of 1-2 short strings (what's missing or could be improved)
- tip: one actionable sentence to improve chances`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          match_score: { type: 'number' },
          verdict: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          gaps: { type: 'array', items: { type: 'string' } },
          tip: { type: 'string' },
        },
      },
    });

    setResult(res);
    setLoading(false);
  };

  const scoreColor = result
    ? result.match_score >= 70 ? 'text-green-600' : result.match_score >= 45 ? 'text-amber-500' : 'text-red-500'
    : '';
  const scoreBg = result
    ? result.match_score >= 70 ? 'bg-green-50 border-green-200' : result.match_score >= 45 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
    : '';

  return (
    <>
      <button
        onClick={analyse}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#5BA4C4] to-[#3D87AA] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mt-3 shadow-md"
      >
        <Sparkles className="w-4 h-4" />
        AI Match Analysis
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#5BA4C4]" />
                <h3 className="text-lg font-bold text-slate-800">AI Match Analysis</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="text-sm text-slate-500 mb-4">
              <span className="font-semibold text-slate-700">{job.title}</span> at {job.company}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-8 h-8 text-[#5BA4C4] animate-spin" />
                <p className="text-sm text-slate-500">Analysing your CV against this role...</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Score */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border ${scoreBg}`}>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Match Score</p>
                    <p className={`text-3xl font-black ${scoreColor}`}>{result.match_score}%</p>
                    <p className={`text-sm font-semibold ${scoreColor}`}>{result.verdict}</p>
                  </div>
                  <TrendingUp className={`w-10 h-10 ${scoreColor} opacity-30`} />
                </div>

                {/* Strengths */}
                {result.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your Strengths</p>
                    <div className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gaps */}
                {result.gaps?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Areas to Improve</p>
                    <div className="space-y-2">
                      {result.gaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          {g}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tip */}
                {result.tip && (
                  <div className="bg-[#EAF5FB] border border-[#A8D4E8] rounded-xl p-3">
                    <p className="text-xs font-semibold text-[#3D87AA] uppercase tracking-wide mb-1">💡 Career Tip</p>
                    <p className="text-sm text-[#2E3F4F]">{result.tip}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}