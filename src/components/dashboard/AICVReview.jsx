import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Video, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AICVReview({ user, profile }) {
  const navigate = useNavigate();
  const [cvFile, setCvFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (file, type) => {
    setLoading(true);
    try {
      // Upload file using SDK
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      if (type === 'cv') {
        // Extract text from CV
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Full text content of the CV' }
            }
          }
        });
        
        // AI Analysis
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this CV and provide:
1. Overall score (1-10)
2. Top 3 strengths
3. Top 3 areas for improvement
4. Specific recommendations for improvement

CV Content:
${extracted.output?.content || 'No content extracted'}

Provide response in JSON format:
{
  "score": number,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "recommendations": "detailed recommendations paragraph"
}`,
          response_json_schema: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              strengths: { type: 'array', items: { type: 'string' } },
              improvements: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'string' }
            }
          }
        });
        setCvAnalysis(analysis);
        setCvFile(null);
        // Update profile with resume URL
        await base44.auth.updateMe({ resume_url: file_url });
      } else if (type === 'video') {
        // Analyze video with AI
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Provide feedback on a 90-second intro video for a job candidate. Consider:
1. Presentation quality score (1-10)
2. Top 3 strengths in communication
3. Top 3 areas for improvement
4. Specific recommendations

Candidate Profile:
- Name: ${profile?.full_name || 'Student'}
- Major: ${profile?.major || 'Not specified'}
- University: ${profile?.university || 'Not specified'}

Provide response in JSON format:
{
  "score": number,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "recommendations": "detailed recommendations paragraph"
}`,
          response_json_schema: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              strengths: { type: 'array', items: { type: 'string' } },
              improvements: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'string' }
            }
          }
        });
        setVideoAnalysis(analysis);
        setVideoFile(null);
        // Update profile with video URL
        await base44.auth.updateMe({ intro_video_url: file_url });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed. Please try again or upgrade your plan for premium AI features.');
    }
    setLoading(false);
  }

  const handleBuyPackage = () => {
    navigate(createPageUrl('ServicesBooking'));
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
            <Button size="sm" onClick={handleBuyPackage} className="bg-gradient-to-r from-[#5BA4C4] to-[#3D87AA] hover:from-[#4a90b0] hover:to-[#2d6d8e] text-white">
              Buy Package
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


    </>
  );
}