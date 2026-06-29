import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Video, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import CoachingRequestModal from '@/components/coaching/CoachingRequestModal';

/**
 * Validates an LLM analysis payload. The edge function returns {} when the
 * OPENAI_API_KEY secret isn't configured yet; without this guard the UI used
 * to render an empty "/10" with empty strengths/improvements lists, which is
 * what the user reported on Jun 29.
 */
const isValidAnalysis = (a) =>
  a && typeof a === 'object' && (typeof a.score === 'number' || (a.strengths?.length ?? 0) > 0);

export default function AICVReview({ user, profile }) {
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCoaching, setShowCoaching] = useState(false);

  const handleFileUpload = async (file, type) => {
    setLoading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      if (type === 'cv') {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Full text content of the CV' },
            },
          },
        });

        if (extracted?.status === 'error' || extracted?.error) {
          throw new Error(extracted?.error || 'Could not read your CV.');
        }

        const analysis = await base44.integrations.Core.InvokeLLM({
          system: 'You are a senior career coach giving direct, actionable CV feedback. Return JSON only.',
          prompt: `Analyse this CV and respond with concrete, specific feedback. Avoid generic platitudes.

CV Content:
${extracted.output?.content || 'No content extracted'}`,
          response_json_schema: {
            type: 'object',
            required: ['score', 'strengths', 'improvements', 'recommendations'],
            properties: {
              score: { type: 'number', minimum: 1, maximum: 10 },
              strengths: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
              improvements: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
              recommendations: { type: 'string' },
            },
          },
        });

        if (!isValidAnalysis(analysis)) {
          throw new Error(analysis?.error || 'AI is not configured yet. Ask an admin to set OPENAI_API_KEY.');
        }
        setCvAnalysis(analysis);
        if (profile?.id && profile.id !== 'preview') {
          await base44.entities.StudentProfile.update(profile.id, { resume_url: file_url });
        }
      } else if (type === 'video') {
        const analysis = await base44.integrations.Core.InvokeLLM({
          system: 'You are a presentation coach. Return JSON only.',
          prompt: `Provide feedback on a 90-second intro video for a job candidate. Be specific.

Note: you only have metadata, not the actual video — so frame feedback as a "what to check" structure unless you can transcribe the audio.

Candidate Profile:
- Name: ${profile?.full_name || 'Student'}
- Major: ${profile?.major || 'Not specified'}
- University: ${profile?.university || 'Not specified'}`,
          response_json_schema: {
            type: 'object',
            required: ['score', 'strengths', 'improvements', 'recommendations'],
            properties: {
              score: { type: 'number' },
              strengths: { type: 'array', items: { type: 'string' } },
              improvements: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'string' },
            },
          },
        });

        if (!isValidAnalysis(analysis)) {
          throw new Error(analysis?.error || 'AI is not configured yet. Ask an admin to set OPENAI_API_KEY.');
        }
        setVideoAnalysis(analysis);
        if (profile?.id && profile.id !== 'preview') {
          await base44.entities.StudentProfile.update(profile.id, { intro_video_url: file_url });
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Analysis error:', e);
      setError(e?.message || 'Analysis failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5BA4C4]" />
              AI CV & Video Review
            </h2>
            <Button size="sm" onClick={() => setShowCoaching(true)} className="bg-gradient-to-r from-[#5BA4C4] to-[#3D87AA] hover:from-[#4a90b0] hover:to-[#2d6d8e] text-white">
              Request 1:1 Coaching
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* CV Review */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#5BA4C4]" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">CV Analysis</span>
              </div>
              
              {!cvAnalysis ? (
                <div
                  onClick={() => document.getElementById('cv-upload').click()}
                  className="border-2 border-dashed border-[#A8D4E8] dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:bg-[#EAF5FB] dark:hover:bg-slate-700/50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-[#5BA4C4] mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Upload your CV (PDF)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">AI-powered feedback</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#EAF5FB] to-[#A8D4E8]/30 dark:from-slate-700 dark:to-slate-700/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{cvAnalysis.score}/10</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Strengths:</p>
                    {cvAnalysis.strengths?.map((s, i) => (
                      <p key={i} className="text-xs text-green-700 dark:text-green-400">✓ {s}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Improve:</p>
                    {cvAnalysis.improvements?.map((s, i) => (
                      <p key={i} className="text-xs text-orange-700 dark:text-orange-400">⚠ {s}</p>
                    ))}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic">{cvAnalysis.recommendations}</p>
                  <Button size="sm" variant="outline" onClick={() => setCvAnalysis(null)} className="w-full mt-2">
                    Analyze Another
                  </Button>
                </div>
              )}
              <input
                id="cv-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'cv')}
              />
            </div>

            {/* Video Review */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-[#5BA4C4]" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Video Pitch Analysis</span>
              </div>
              
              {!videoAnalysis ? (
                <div
                  onClick={() => document.getElementById('video-upload').click()}
                  className="border-2 border-dashed border-[#A8D4E8] dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:bg-[#EAF5FB] dark:hover:bg-slate-700/50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-[#5BA4C4] mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Upload intro video</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">AI feedback on presentation</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#EAF5FB] to-[#A8D4E8]/30 dark:from-slate-700 dark:to-slate-700/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{videoAnalysis.score}/10</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Strengths:</p>
                    {videoAnalysis.strengths?.map((s, i) => (
                      <p key={i} className="text-xs text-green-700 dark:text-green-400">✓ {s}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Improve:</p>
                    {videoAnalysis.improvements?.map((s, i) => (
                      <p key={i} className="text-xs text-orange-700 dark:text-orange-400">⚠ {s}</p>
                    ))}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic">{videoAnalysis.recommendations}</p>
                  <Button size="sm" variant="outline" onClick={() => setVideoAnalysis(null)} className="w-full mt-2">
                    Analyze Another
                  </Button>
                </div>
              )}
              <input
                id="video-upload"
                type="file"
                accept=".mp4,.mov,.avi"
                className="hidden"
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'video')}
              />
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 py-4 justify-center">
              <Loader2 className="w-5 h-5 text-[#5BA4C4] animate-spin" />
              <span className="text-sm text-slate-500">AI is analyzing your file...</span>
            </div>
          )}

          {error && !loading && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-400">Couldn&apos;t analyze that</p>
                <p className="text-xs text-red-700 dark:text-red-500 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!profile?.resume_url && !profile?.intro_video_url && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Complete your profile first</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">Upload your CV and intro video to your profile for better AI analysis.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CoachingRequestModal
        open={showCoaching}
        onOpenChange={setShowCoaching}
        user={user}
        profile={profile}
      />
    </>
  );
}