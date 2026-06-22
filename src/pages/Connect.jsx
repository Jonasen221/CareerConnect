import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Inbox,
  Heart,
  Check,
  X,
  Settings as SettingsIcon,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import PersonSwipeCard from '@/components/connect/PersonSwipeCard';
import { sortByKeywordRelevance } from '@/lib/keywordScore';
import {
  handleRightSwipe,
  handleLeftSwipe,
  acceptPendingRequest,
  normalizeEmail,
} from '@/lib/connections';

const VISIBLE_STATUSES = new Set(['approved']);

/**
 * Decide whether a profile P should appear in viewer V's swipe deck.
 *
 * Both sides must "include each other" in their audience preference, the
 * candidate must not be opted out / banned / suspended / pending, and we never
 * surface someone the viewer has already swiped on.
 */
const isCandidateVisibleTo = (candidate, viewer, viewerKind, alreadySwipedEmails) => {
  if (!candidate) return false;
  if (candidate.connect_opt_out) return false;
  if (!VISIBLE_STATUSES.has(candidate.status)) return false;
  const candEmail = normalizeEmail(candidate.email || candidate.created_by);
  if (!candEmail) return false;
  if (candEmail === normalizeEmail(viewer.email)) return false;
  if (alreadySwipedEmails.has(candEmail)) return false;

  // Audience reciprocity: viewer's "who do I want to meet" must include the
  // candidate's audience tag (kind/edu), AND candidate's "who do I want to
  // meet" must include the viewer's.
  const viewerWants = Array.isArray(viewer.connect_audience) && viewer.connect_audience.length > 0
    ? viewer.connect_audience
    : ['student', 'high_school', 'recruiter'];
  const candWants = Array.isArray(candidate.connect_audience) && candidate.connect_audience.length > 0
    ? candidate.connect_audience
    : ['student', 'high_school', 'recruiter'];

  const candAudienceTag = candidate.kind === 'recruiter'
    ? 'recruiter'
    : candidate.education_level === 'high_school'
      ? 'high_school'
      : 'student';
  const viewerAudienceTag = viewerKind === 'recruiter'
    ? 'recruiter'
    : viewer.education_level === 'high_school'
      ? 'high_school'
      : 'student';

  if (!viewerWants.includes(candAudienceTag)) return false;
  if (!candWants.includes(viewerAudienceTag)) return false;

  return true;
};

const personWithKind = (row, kind) => ({ ...row, kind });

export default function Connect() {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [viewerProfile, setViewerProfile] = useState(null);
  const [viewerKind, setViewerKind] = useState(null);
  const [deck, setDeck] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [matchBanner, setMatchBanner] = useState(null);
  const cardRef = useRef(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setAuthUser(u);

      const [
        studentRows,
        recruiterRows,
        mySwipes,
        receivedRights,
        connectionsAsA,
        connectionsAsB,
      ] = await Promise.all([
        base44.entities.StudentProfile.list(),
        base44.entities.RecruiterProfile.list(),
        base44.entities.ConnectionSwipe.filter({ swiper_email: normalizeEmail(u.email) }),
        base44.entities.ConnectionSwipe.filter({
          target_email: normalizeEmail(u.email),
          direction: 'right',
        }),
        base44.entities.Connection.filter({ user_a_email: normalizeEmail(u.email) }),
        base44.entities.Connection.filter({ user_b_email: normalizeEmail(u.email) }),
      ]);

      // Identify the viewer's own profile (student vs recruiter).
      const myStudent = studentRows.find((s) => normalizeEmail(s.created_by) === normalizeEmail(u.email));
      const myRecruiter = recruiterRows.find((r) => normalizeEmail(r.created_by) === normalizeEmail(u.email));
      const myProfile = myStudent ?? myRecruiter ?? null;
      const myKind = myStudent ? 'student' : myRecruiter ? 'recruiter' : null;
      setViewerProfile(myProfile);
      setViewerKind(myKind);

      const allPeople = [
        ...studentRows.map((r) => personWithKind(r, 'student')),
        ...recruiterRows.map((r) => personWithKind(r, 'recruiter')),
      ];

      const alreadySwiped = new Set(mySwipes.map((s) => normalizeEmail(s.target_email)));

      // Active connections (any status that isn't 'closed') are already in your
      // connections list — don't re-show them in the deck.
      const allConnections = [...connectionsAsA, ...connectionsAsB];
      for (const c of allConnections) {
        const other = normalizeEmail(c.user_a_email) === normalizeEmail(u.email)
          ? c.user_b_email
          : c.user_a_email;
        if (other) alreadySwiped.add(normalizeEmail(other));
      }

      const visible = allPeople.filter((p) =>
        myProfile
          ? isCandidateVisibleTo(
              { ...p, education_level: p.education_level },
              { ...myProfile, email: u.email, kind: myKind },
              myKind,
              alreadySwiped
            )
          : false
      );

      // Keyword-rank against viewer's keywords + skills.
      const viewerKeywords = [
        ...(Array.isArray(myProfile?.keywords) ? myProfile.keywords : []),
        ...(Array.isArray(myProfile?.skills) ? myProfile.skills : []),
      ];
      const ranked = viewerKeywords.length > 0
        ? sortByKeywordRelevance(visible, viewerKeywords, ['keywords', 'skills', 'headline', 'bio'])
        : visible;

      setDeck(ranked);

      // Pending requests = right swipes against me where I haven't swiped yet.
      const myConnectedEmails = new Set(
        allConnections.flatMap((c) => [
          normalizeEmail(c.user_a_email),
          normalizeEmail(c.user_b_email),
        ])
      );
      const mySwipedTargets = new Set(mySwipes.map((s) => normalizeEmail(s.target_email)));

      const incoming = receivedRights
        .filter((s) => {
          const swiper = normalizeEmail(s.swiper_email);
          if (myConnectedEmails.has(swiper)) return false;
          if (mySwipedTargets.has(swiper)) return false;
          return true;
        })
        .map((s) => {
          const swiperEmail = normalizeEmail(s.swiper_email);
          const profile = allPeople.find((p) => normalizeEmail(p.created_by) === swiperEmail);
          return { swipe: s, profile };
        })
        .filter((row) => row.profile);
      setPendingRequests(incoming);

      // Connections list = accepted connections with the other party resolved.
      const liveConnections = allConnections
        .filter((c) => c.status === 'accepted')
        .map((c) => {
          const me = normalizeEmail(u.email);
          const otherEmail = normalizeEmail(c.user_a_email) === me
            ? c.user_b_email
            : c.user_a_email;
          const otherProfile = allPeople.find((p) =>
            normalizeEmail(p.created_by) === normalizeEmail(otherEmail)
          );
          return { connection: c, otherEmail, otherProfile };
        });
      setConnections(liveConnections);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const currentTarget = deck[0] ?? null;

  const swiperPayload = useMemo(() => ({
    email: authUser?.email,
    role: viewerKind,
    full_name: viewerProfile?.full_name ?? authUser?.full_name ?? '',
  }), [authUser, viewerProfile, viewerKind]);

  const targetPayload = (person) => ({
    email: person.created_by || person.email,
    role: person.kind,
    full_name: person.full_name,
  });

  const handleSwipe = async (direction) => {
    if (!currentTarget || busy) return;
    setBusy(true);
    try {
      const target = targetPayload(currentTarget);
      if (direction === 'right') {
        const result = await handleRightSwipe({ swiper: swiperPayload, target });
        if (result?.matched) {
          setMatchBanner({
            name: currentTarget.full_name,
            connection: result.connection,
          });
        }
      } else {
        await handleLeftSwipe({ swiper: swiperPayload, target });
      }
      setDeck((prev) => prev.slice(1));
    } catch (e) {
      console.error('[Connect] swipe failed', e);
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptPending = async (entry) => {
    if (!entry?.profile || busy) return;
    setBusy(true);
    try {
      const result = await acceptPendingRequest({
        me: swiperPayload,
        requester: {
          email: entry.profile.created_by || entry.profile.email,
          role: entry.profile.kind,
          full_name: entry.profile.full_name,
        },
      });
      if (result?.matched) {
        setMatchBanner({
          name: entry.profile.full_name,
          connection: result.connection,
        });
      }
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleDeclinePending = async (entry) => {
    if (!entry?.profile || busy) return;
    setBusy(true);
    try {
      await handleLeftSwipe({
        swiper: swiperPayload,
        target: {
          email: entry.profile.created_by || entry.profile.email,
          role: entry.profile.kind,
          full_name: entry.profile.full_name,
        },
      });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!viewerProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md space-y-3">
          <p className="text-slate-600">
            Finish onboarding before opening Connect.
          </p>
          <Button onClick={() => navigate(createPageUrl('Onboarding'))} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
            Continue onboarding
          </Button>
        </div>
      </div>
    );
  }

  if (viewerProfile.connect_opt_out) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md text-center space-y-3">
          <SettingsIcon className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-800">You've opted out of Connect</p>
          <p className="text-sm text-slate-500">
            Re-enable visibility in Settings to swipe through people and be swiped on.
          </p>
          <Button onClick={() => navigate(createPageUrl('Settings'))} className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
            Open Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8E4DF] dark:bg-slate-900">
      <div className="bg-gradient-to-r from-[#5BA4C4] via-[#4a90b0] to-[#3D87AA] px-6 pt-8 pb-16">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-7 h-7" /> Connect
            </h1>
            <p className="text-white/80 mt-1">
              Swipe right on people you'd like to meet. Mutual right swipes unlock a chat.
            </p>
          </div>
          <Link to={createPageUrl('Settings')}>
            <Button variant="outline" className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30">
              <SettingsIcon className="w-4 h-4 mr-1.5" /> Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-10 pb-12 space-y-5">
        {matchBanner && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="font-bold text-lg flex items-center gap-2">
                <Heart className="w-5 h-5" /> It's a match!
              </p>
              <p className="text-white/90 text-sm">
                You and {matchBanner.name} both swiped right. A chat has been opened.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                className="bg-white text-emerald-700 border-white hover:bg-emerald-50"
                onClick={() => navigate(createPageUrl('Messages'))}
              >
                Open chat
              </Button>
              <Button
                variant="outline"
                className="bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => setMatchBanner(null)}
              >
                Keep swiping
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="swipe">
          <TabsList className="bg-white shadow-sm border border-slate-100 flex-wrap h-auto gap-1">
            <TabsTrigger value="swipe" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1.5" /> Swipe deck {deck.length > 0 && <span className="ml-1.5 text-xs bg-amber-500 text-white rounded-full px-2">{deck.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
              <Inbox className="w-4 h-4 mr-1.5" /> Pending requests {pendingRequests.length > 0 && <span className="ml-1.5 text-xs bg-pink-500 text-white rounded-full px-2">{pendingRequests.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-[#5BA4C4] data-[state=active]:text-white">
              <Heart className="w-4 h-4 mr-1.5" /> Connections {connections.length > 0 && <span className="ml-1.5 text-xs bg-slate-500 text-white rounded-full px-2">{connections.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="swipe" className="mt-5">
            {deck.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">You've seen everyone (for now).</p>
                <p className="text-sm text-slate-500">
                  Check back later, or tune your audience in Settings to widen the deck.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="relative h-[620px] max-w-md mx-auto">
                  {deck.slice(0, 2).reverse().map((person, idx, arr) => {
                    const isTop = idx === arr.length - 1;
                    return (
                      <PersonSwipeCard
                        key={person.id}
                        ref={isTop ? cardRef : undefined}
                        person={person}
                        isTop={isTop}
                        onSwipe={handleSwipe}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => cardRef.current?.swipeLeft()}
                    disabled={busy}
                    className="w-14 h-14 rounded-full bg-white border-2 border-red-200 text-red-500 flex items-center justify-center shadow-md hover:bg-red-50 disabled:opacity-60"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cardRef.current?.swipeRight()}
                    disabled={busy}
                    className="w-14 h-14 rounded-full bg-white border-2 border-emerald-200 text-emerald-500 flex items-center justify-center shadow-md hover:bg-emerald-50 disabled:opacity-60"
                  >
                    <Heart className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-5">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-2">
                <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-500">No pending connection requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((entry) => {
                  const p = entry.profile;
                  const initials = p.full_name?.split(' ').map((n) => n?.[0]).join('').toUpperCase().slice(0, 2) || '?';
                  return (
                    <div
                      key={entry.swipe.id}
                      className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
                    >
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        {p.photo_url && <img src={p.photo_url} alt="" className="w-full h-full object-cover rounded-full" />}
                        {p.company_logo_url && !p.photo_url && (
                          <img src={p.company_logo_url} alt="" className="w-full h-full object-cover rounded-full" />
                        )}
                        <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{p.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {p.kind === 'student'
                            ? [p.university, p.major].filter(Boolean).join(' · ') || p.email
                            : [p.company, p.title].filter(Boolean).join(' · ') || p.email}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Wants to connect · {entry.swipe.created_date ? new Date(entry.swipe.created_date).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeclinePending(entry)}
                          disabled={busy}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" /> Pass
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptPending(entry)}
                          disabled={busy}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-1" /> Accept
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="mt-5">
            {connections.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-2">
                <Heart className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-500">No accepted connections yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map(({ connection, otherEmail, otherProfile }) => {
                  const name = otherProfile?.full_name || otherEmail;
                  const initials = name?.split(' ').map((n) => n?.[0]).join('').toUpperCase().slice(0, 2) || '?';
                  return (
                    <div
                      key={connection.id}
                      className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
                    >
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        {otherProfile?.photo_url && (
                          <img src={otherProfile.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                        )}
                        {!otherProfile?.photo_url && otherProfile?.company_logo_url && (
                          <img src={otherProfile.company_logo_url} alt="" className="w-full h-full object-cover rounded-full" />
                        )}
                        <AvatarFallback className="bg-[#EAF5FB] text-[#3D87AA] font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{name}</p>
                        <p className="text-xs text-slate-500 truncate">{otherEmail}</p>
                        <p className="text-xs text-slate-400">
                          Connected {connection.created_date ? new Date(connection.created_date).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <Link to={createPageUrl('Messages')}>
                        <Button size="sm" className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">
                          <MessageCircle className="w-4 h-4 mr-1" /> Message
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
