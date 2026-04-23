import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, X, ChevronRight, Lock } from 'lucide-react';
import PersonalityQuiz from '../components/games/PersonalityQuiz';
import JobJargonGame from '../components/games/JobJargonGame';
import ElevatorPitchGame from '../components/games/ElevatorPitchGame';
import CvReviewGame from '../components/games/CvReviewGame';
import InterviewQAGame from '../components/games/InterviewQAGame';
import LinkedInQuizGame from '../components/games/LinkedInQuizGame';
import CareerGapsQuiz from '../components/games/CareerGapsQuiz';
import SalaryNegotiationQuiz from '../components/games/SalaryNegotiationQuiz';
import NetworkingQuiz from '../components/games/NetworkingQuiz';
import BuyCreditsModal from '../components/subscriptions/BuyCreditsModal';
import CertificateUpload from '../components/games/CertificateUpload';

const GAMES = [
{
  id: 'personality',
  title: 'Personality Type',
  emoji: '🧠',
  desc: 'Discover your career personality in 5 questions',
  xp: 120,
  color: 'from-[#3D87AA] to-[#2d6d8e]',
  time: '3 min',
  component: PersonalityQuiz
},
{
  id: 'jargon',
  title: 'Job Jargon Blitz',
  emoji: '⚡',
  desc: '10 levels: beat the clock from Starter to Expert!',
  xp: 100,
  color: 'from-[#4a90b0] to-[#3D87AA]',
  time: '10 min',
  component: JobJargonGame
},
{
  id: 'pitch',
  title: 'Elevator Pitch',
  emoji: '🎤',
  desc: 'Write your pitch, get instant AI feedback & score',
  xp: 110,
  color: 'from-[#5BA4C4] to-[#3D87AA]',
  time: '5 min',
  component: ElevatorPitchGame
},
{
  id: 'cvreview',
  title: 'CV Quiz',
  emoji: '📄',
  desc: '10 levels: from CV basics to legend-level strategy',
  xp: 130,
  color: 'from-emerald-500 to-emerald-700',
  time: '10 min',
  component: CvReviewGame
},
{
  id: 'interview',
  title: 'Interview Coach',
  emoji: '🎙️',
  desc: '10 levels: from warm-up to vision — with AI feedback',
  xp: 140,
  color: 'from-purple-500 to-purple-700',
  time: '10 min',
  component: InterviewQAGame
},
{
  id: 'linkedin',
  title: 'LinkedIn Mastery',
  emoji: '💼',
  desc: '10 levels: from profile basics to thought leadership',
  xp: 120,
  color: 'from-blue-600 to-blue-800',
  time: '8 min',
  component: LinkedInQuizGame
},
{
  id: 'gaps',
  title: 'Career Gaps',
  emoji: '🌉',
  desc: '10 levels: how to handle, frame and own career gaps',
  xp: 110,
  color: 'from-orange-500 to-orange-700',
  time: '8 min',
  component: CareerGapsQuiz
},
{
  id: 'salary',
  title: 'Salary Negotiation',
  emoji: '💰',
  desc: '10 levels: research to psychology of negotiation',
  xp: 120,
  color: 'from-green-600 to-green-800',
  time: '8 min',
  component: SalaryNegotiationQuiz
},
{
  id: 'networking',
  title: 'Networking Pro',
  emoji: '🤝',
  desc: '10 levels: from mindset to becoming a super connector',
  xp: 115,
  color: 'from-violet-500 to-violet-700',
  time: '8 min',
  component: NetworkingQuiz
}];


const SERVICES = [
{ id: 'cv_full_onepager', title: 'Call + Prep Full CV & One Pager', emoji: '📄', category: 'cv', cost: 96, regularPrice: 120, popular: true },
{ id: 'cv_full', title: 'Call + Prep Full CV', emoji: '📄', category: 'cv', cost: 72, regularPrice: 90, popular: false },
{ id: 'cv_onepager', title: 'Call + One Pager', emoji: '📄', category: 'cv', cost: 48, regularPrice: 60, popular: false },
{ id: 'linkedin_full', title: 'Call + Full LinkedIn', emoji: '💼', category: 'linkedin', cost: 72, regularPrice: 90, popular: true },
{ id: 'linkedin_review', title: 'Call + Review LinkedIn', emoji: '💼', category: 'linkedin', cost: 48, regularPrice: 60, popular: false },
{ id: 'prepcall_linkedin', title: 'Prep Call - LinkedIn Guide', emoji: '🎯', category: 'prepcall', cost: 24, regularPrice: 30, popular: false },
{ id: 'prepcall_joboffer', title: 'Prep Call - Job Offers', emoji: '🎯', category: 'prepcall', cost: 24, regularPrice: 30, popular: false },
{ id: 'prepcall_interview', title: 'Prep Call - Interview Prep', emoji: '🎯', category: 'prepcall', cost: 24, regularPrice: 30, popular: false }];


const SERVICE_CATEGORIES = [
{ id: 'cv', name: 'CV Services', icon: '📄', color: 'bg-[#EAF5FB] border-[#A8D4E8]' },
{ id: 'linkedin', name: 'LinkedIn Services', icon: '💼', color: 'bg-[#EAF5FB] border-[#A8D4E8]' },
{ id: 'prepcall', name: 'Prep Calls', icon: '🎯', color: 'bg-[#EAF5FB] border-[#A8D4E8]' }];


const DISCOUNT_THRESHOLD = 1000; // Credits needed for 10% discount

function XPBar({ xp, level }) {
  const xpForLevel = level * 200;
  const xpInLevel = xp % 200;
  const pct = Math.min(xpInLevel / xpForLevel * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-white/70 mb-1">
        <span>Level {level}</span><span>{xpInLevel}/{xpForLevel} XP</span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2">
        <motion.div className="h-2 bg-white rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
      </div>
    </div>);

}

export default function CareerGames() {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [redeeming, setRedeeming] = useState(null);
  const [redeemDone, setRedeemDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayPlayed, setTodayPlayed] = useState([]);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  useEffect(() => {loadData();}, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const existing = await base44.entities.GameProgress.filter({ created_by: u.email });
    let prog = existing[0];
    if (!prog) {
      prog = await base44.entities.GameProgress.create({ total_xp: 0, credits: 0, streak_days: 0, level: 1, completed_games: [] });

    } else {
      // Check & update streak
      const today = new Date().toISOString().split('T')[0];
      const last = prog.last_activity_date;
      if (last) {
        const diff = Math.floor((new Date(today) - new Date(last)) / (1000 * 60 * 60 * 24));
        if (diff === 1) {




          // streak continues — will update on next game
        } else if (diff > 1) {prog = await base44.entities.GameProgress.update(prog.id, { streak_days: 0 });}} // Track today's played games (only keep today's entries to keep array lean)
      const todayCompleted = (prog.completed_games || []).filter((g) => g.includes(today));
      setTodayPlayed(todayCompleted.map((g) => g.split('_')[0]));
      // Prune old entries (keep only today's) to avoid bloat
      if ((prog.completed_games || []).some((g) => !g.includes(today))) {
        base44.entities.GameProgress.update(prog.id, { completed_games: todayCompleted });
        prog = { ...prog, completed_games: todayCompleted };
      }
    }
    setProgress(prog);
    setLoading(false);
  };

  const handleGameComplete = async (xpEarned, extraData) => {
    setGameResult({ xpEarned, extraData });
    const today = new Date().toISOString().split('T')[0];
    const last = progress.last_activity_date;
    const diff = last ? Math.floor((new Date(today) - new Date(last)) / (1000 * 60 * 60 * 24)) : 1;
    const newStreak = diff === 1 ? (progress.streak_days || 0) + 1 : diff === 0 ? progress.streak_days : 1;
    const newXP = (progress.total_xp || 0) + xpEarned;
    const oldLevel = Math.floor((progress.total_xp || 0) / 200) + 1;
    const newLevel = Math.floor(newXP / 200) + 1;
    const gameKey = `${activeGame.id}_${today}`;
    const updatedGames = [...(progress.completed_games || []).filter((g) => !g.startsWith(activeGame.id + '_')), gameKey];
    const leveledUp = newLevel > oldLevel;

    const updated = await base44.entities.GameProgress.update(progress.id, {
      total_xp: newXP,
      streak_days: newStreak,
      last_activity_date: today,
      level: newLevel,
      completed_games: updatedGames,
      ...(extraData ? { personality_type: extraData } : {})
    });

    // Push profile to recruiters when leveling up
    if (leveledUp) {
      const u = await base44.auth.me();
      const studentProfiles = await base44.entities.StudentProfile.filter({ created_by: u.email });
      if (studentProfiles.length > 0) {
        await base44.entities.StudentProfile.update(studentProfiles[0].id, { level: newLevel });
      }
    }

    setProgress(updated);
    setTodayPlayed((prev) => [...prev, activeGame.id]);
    setGameResult((r) => ({ ...r, streak: newStreak, leveledUp, newLevel }));
  };

  const handleRedeem = async (service) => {
    if ((progress.credits || 0) < service.cost) return;
    setRedeeming(service);
  };

  const confirmRedeem = async () => {
    await base44.entities.CreditRedemption.create({
      service_type: redeeming.id,
      credits_spent: redeeming.cost,
      status: 'pending'
    });
    await base44.entities.GameProgress.update(progress.id, { credits: progress.credits - redeeming.cost });
    setProgress((p) => ({ ...p, credits: p.credits - redeeming.cost }));
    setRedeeming(null);
    setRedeemDone(true);
    setTimeout(() => setRedeemDone(false), 4000);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5BA4C4] to-[#3D87AA]"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="bg-transparent min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] px-6 pt-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-white mb-1">Career Arena 🏆</h1>
          <p className="text-white/80 text-sm mb-6">Play daily games, earn XP to unlock events · Buy credits to redeem services</p>

          <div className="grid grid-cols-3 gap-4">
            {[
            { label: 'Total XP', value: progress?.total_xp || 0, emoji: '⚡' },
            { label: 'Credits', value: progress?.credits || 0, emoji: '🪙' },
            { label: 'Day Streak', value: `${progress?.streak_days || 0}🔥`, emoji: '' }].
            map((s) =>
            <div key={s.label} className="bg-white/20 backdrop-blur rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-white">{s.emoji}{s.value}</p>
                <p className="text-xs text-white/70 mt-0.5">{s.label}</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <XPBar xp={progress?.total_xp || 0} level={progress?.level || 1} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-10 pb-10">
        {redeemDone &&
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-[#EAF5FB] border border-[#5BA4C4] rounded-2xl flex items-center gap-3">
            <Trophy className="w-5 h-5 text-[#5BA4C4]" />
            <div><p className="font-bold text-[#2E3F4F]">Booked! 🎉</p><p className="text-sm text-[#7A7870]">Franzi will be in touch via email within 24 hours.</p></div>
          </motion.div>
        }

        {/* Certificate Upload */}
        <section className="mb-8 p-5 bg-[#EAF5FB] border border-[#8FAFC4] rounded-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-[#2E3F4F] mb-1">📜 Upload Certificates</h2>
              <p className="text-sm text-[#7A7870]">Earned a course certificate? Upload it to earn 100 XP!</p>
            </div>
            <Button onClick={() => setShowCertificateModal(true)} className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] whitespace-nowrap">
              Upload Certificate
            </Button>
          </div>
        </section>

        {/* Daily Games */}
        <section className="mb-8">
          <h2 className="text-xl font-black text-[#2E3F4F] mb-4">Today's Games 🎮</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {GAMES.map((game) => {
              const played = todayPlayed.includes(game.id);
              return (
                <motion.div key={game.id} whileHover={!played ? { y: -4 } : {}} transition={{ duration: 0.2 }}>
                  <Card className={`border-0 shadow-lg overflow-hidden cursor-pointer ${played ? 'opacity-70' : ''}`}
                  onClick={() => !played && setActiveGame(game)}>
                    <div className={`bg-gradient-to-br ${game.color} p-5`}>
                      <div className="flex items-start justify-between">
                        <span className="text-4xl">{game.emoji}</span>
                        {played ? <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">✅ Done</span> :
                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">{game.time}</span>}
                      </div>
                      <h3 className="text-white font-black mt-3">{game.title}</h3>
                      <p className="text-white/80 text-xs mt-1">{game.desc}</p>
                    </div>
                    <CardContent className="p-4 bg-white flex items-center justify-between">
                      <span className="text-sm font-bold text-[#5BA4C4]">⚡ Up to +{game.xp} XP</span>
                      {played ? <Lock className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </CardContent>
                  </Card>
                </motion.div>);

            })}
          </div>
        </section>

        {/* Credits Shop */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#2E3F4F]">Spend Your Credits 🪙</h2>
            <div className="flex items-center gap-3">
              <div className="bg-[#EAF5FB] text-[#2E3F4F] font-black px-3 py-1 rounded-full text-sm border border-[#8FAFC4]">
                {progress?.credits || 0} credits
              </div>
              <Button onClick={() => setShowBuyCreditsModal(true)} className="bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] text-sm font-bold">
                💳 Buy Credits
              </Button>
            </div>
          </div>



          <div className="p-6 bg-gradient-to-br from-[#EAF5FB] to-[#daeef7] border-2 border-[#5BA4C4] rounded-2xl flex flex-col items-center text-center gap-4">
            <span className="text-5xl">🎟️</span>
            <div>
              <h3 className="text-xl font-black text-[#2d5f7a] mb-1">Exclusive Career Events</h3>
              <p className="text-sm text-[#3D87AA]">Use your XP to RSVP to company visits, panels, career fairs, and more. Each event costs <strong>200 XP</strong> to attend.</p>
            </div>
            <Button onClick={() => window.location.href = '/EventsPage'} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white font-bold px-6">
              Browse Events 📅
            </Button>
          </div>

          <div className="mt-4 p-4 bg-[#EAF5FB] border border-[#A8D4E8] rounded-2xl text-sm text-[#3D87AA]">
            💡 <strong>Tip:</strong> Credits are purchased (€1 = 1 credit) and used to buy service packages. XP is earned by playing games daily — keep your streak going!
          </div>
        </section>
      </div>

      {/* Game Modal */}
      <AnimatePresence>
        {activeGame &&
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className={`bg-gradient-to-r ${activeGame.color} p-5 rounded-t-3xl flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activeGame.emoji}</span>
                  <div>
                    <h2 className="text-white font-black text-lg">{activeGame.title}</h2>
                    <p className="text-white/80 text-xs">Up to +{activeGame.xp} XP</p>
                  </div>
                </div>
                <button onClick={() => {setActiveGame(null);setGameResult(null);}}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-6">
                {gameResult ?
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="text-center py-4">
                      <div className="text-6xl mb-3">🎉</div>
                      <h3 className="text-2xl font-black text-[#2E3F4F]">Game Complete!</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-[#EAF5FB] rounded-xl">
                        <span className="font-bold text-[#2E3F4F]">⚡ XP Earned</span>
                        <span className="font-black text-[#5BA4C4]">+{gameResult.xpEarned}</span>
                      </div>
                      {gameResult.leveledUp &&
                  <div className="flex items-center justify-between p-3 bg-[#EAF5FB] rounded-xl">
                          <span className="font-bold text-[#2d5f7a]">🎯 Level Up!</span>
                          <span className="font-black text-[#2d5f7a]">Level {gameResult.newLevel}</span>
                        </div>
                  }
                      <div className="flex items-center justify-between p-3 bg-[#EAF5FB] rounded-xl">
                        <span className="font-bold text-[#3D87AA]">🔥 Day Streak</span>
                        <span className="font-black text-[#3D87AA]">{gameResult.streak} days</span>
                      </div>
                    </div>
                    <Button onClick={() => {setActiveGame(null);setGameResult(null);}} className="w-full bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] font-bold py-5 rounded-2xl">
                      Awesome! 🎉
                    </Button>
                  </motion.div> :

              <activeGame.component onComplete={handleGameComplete} />
              }
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Redeem Confirm Modal */}
      <AnimatePresence>
        {redeeming &&
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
              <div className="text-5xl mb-4">{redeeming.emoji}</div>
              <h3 className="text-xl font-black text-[#2E3F4F] mb-2">{redeeming.title}</h3>
              <p className="text-[#7A7870] text-sm mb-5">{redeeming.desc}</p>
              <div className="bg-[#EAF5FB] border border-[#8FAFC4] rounded-2xl p-4 mb-6">
                <p className="font-black text-[#2E3F4F] text-lg">🪙 {redeeming.cost} credits</p>
                <p className="text-xs text-[#7A7870] mt-1">You'll have {(progress?.credits || 0) - redeeming.cost} credits left</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRedeeming(null)} className="flex-1">Cancel</Button>
                <Button onClick={confirmRedeem} className="flex-1 bg-[#EAF5FB] hover:bg-[#A8D4E8] text-[#2E3F4F] border border-[#A8D4E8] font-bold">Confirm Redeem ✅</Button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      <BuyCreditsModal
        open={showBuyCreditsModal}
        onClose={() => setShowBuyCreditsModal(false)}
        onSuccess={(credits) => {
          setProgress((p) => ({ ...p, credits: (p.credits || 0) + credits }));
        }} />


      <CertificateUpload
        open={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        onSuccess={async (xpEarned) => {
          const newXP = (progress.total_xp || 0) + xpEarned;
          const newLevel = Math.floor(newXP / 200) + 1;
          const updated = await base44.entities.GameProgress.update(progress.id, {
            total_xp: newXP,
            level: newLevel
          });
          setProgress(updated);
        }} />

    </div>);

}