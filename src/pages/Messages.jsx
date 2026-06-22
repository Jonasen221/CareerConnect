import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '../components/layout/PullToRefresh';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, ArrowLeft, Phone, Heart, Clock, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';

export default function Messages() {
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [callRequests, setCallRequests] = useState([]);
  const [swipes, setSwipes] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');

  useEffect(() => {loadData();}, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);

    const [allMatches, requests, allSwipes] = await Promise.all([
    base44.entities.Match.list(),
    base44.entities.CallRequest.filter({ student_email: u.email, status: 'pending' }),
    base44.entities.Swipe.filter({ created_by: u.email })]
    );

    const userMatches = allMatches.filter((m) =>
    m.student_email === u.email || m.recruiter_email === u.email
    );

    setMatches(userMatches);
    setCallRequests(requests);

    // Get jobs swiped right that haven't been shortlisted
    const shortlists = await base44.entities.Shortlist.filter({ created_by: u.email });
    const swipedRight = allSwipes.filter((s) => s.direction === 'right');
    const unshortlistedSwipes = swipedRight.filter((s) =>
    !shortlists.some((sl) => sl.job_id === s.job_id)
    );

    // Get job details for unshortlisted swipes
    const jobIds = [...new Set(unshortlistedSwipes.map((s) => s.job_id))];
    if (jobIds.length > 0) {
      const jobs = await Promise.all(jobIds.map((id) => base44.entities.Job.filter({ id })));
      const jobMap = jobs.flat().reduce((acc, j) => ({ ...acc, [j.id]: j }), {});
      const swipesWithJobs = unshortlistedSwipes.map((s) => ({ ...s, job: jobMap[s.job_id] }));
      setSwipes(swipesWithJobs);
    }

    setLoading(false);
  };

  const handleSelectMatch = async (match) => {
    setSelectedMatch(match);
    // Load messages for this match
    const allMessages = await base44.entities.Message.filter({ match_id: match.id });
    setMessages(allMessages);

    // Mark as read
    await Promise.all(
      allMessages.filter((m) => m.receiver_email === user.email && !m.read).
      map((m) => base44.entities.Message.update(m.id, { read: true }))
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch) return;
    setSending(true);

    const otherEmail = selectedMatch.student_email === user.email ?
    selectedMatch.recruiter_email :
    selectedMatch.student_email;

    await base44.entities.Message.create({
      receiver_email: otherEmail,
      match_id: selectedMatch.id,
      content: newMessage
    });

    setNewMessage('');
    await handleSelectMatch(selectedMatch);
    setSending(false);
  };

  const getOtherUserEmail = (match) => {
    return match.student_email === user?.email ?
    match.recruiter_email :
    match.student_email;
  };

  const getOtherUserName = (match) => {
    // F4 connection-kind matches carry the peer names in match.data, regardless
    // of which slot they ended up in (we use canonical-order user_a/user_b).
    if (match.data?.kind === 'connection' || match.data?.kind === 'peer_connection') {
      const isA = match.student_email === user?.email;
      return isA ? (match.data.peer_b_name || match.recruiter_email) : (match.data.peer_a_name || match.student_email);
    }
    return match.student_email === user?.email ?
    match.company :
    `Student`;
  };

  const getMatchSubtitle = (match) => {
    if (match.data?.kind === 'connection' || match.data?.kind === 'peer_connection') {
      return 'Direct connection';
    }
    return match.job_title;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="w-6 h-6 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-2xl mx-auto flex h-screen flex-col">
        {!selectedMatch ?
          <>
            {/* Header */}
            <div className="border-b border-slate-200 p-4 bg-white">
              <h1 className="text-slate-800 text-2xl font-bold">Inbox</h1>
              <p className="text-sm text-slate-500 mt-1">Messages, requests & pending actions</p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-white px-4 py-0 h-auto gap-0">
                <TabsTrigger value="messages" className="text-slate-500 px-4 py-3 text-sm font-medium rounded-none inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border-b-2 border-transparent data-[state=active]:border-[#5BA4C4] data-[state=active]:bg-transparent data-[state=active]:text-[#3D87AA]">
                  <MessageCircle className="w-4 h-4 mr-2" />Messages {matches.length > 0 && `(${matches.length})`}
                </TabsTrigger>
                <TabsTrigger value="requests" className="text-slate-500 px-4 py-3 text-sm font-medium rounded-none inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border-b-2 border-transparent data-[state=active]:border-[#5BA4C4] data-[state=active]:bg-transparent data-[state=active]:text-[#3D87AA]">
                  <Phone className="w-4 h-4 mr-2" />Call Requests {callRequests.length > 0 && `(${callRequests.length})`}
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-slate-500 px-4 py-3 text-sm font-medium rounded-none inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border-b-2 border-transparent data-[state=active]:border-[#5BA4C4] data-[state=active]:bg-transparent data-[state=active]:text-[#3D87AA]">
                  <Heart className="w-4 h-4 mr-2" />Pending {swipes.length > 0 && `(${swipes.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Messages Tab */}
              <TabsContent value="messages" className="flex-1 overflow-y-auto">
                {matches.length === 0 ?
                <div className="flex flex-col items-center justify-center h-full p-6">
                    <MessageCircle className="w-16 h-16 text-slate-300 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-700 mb-2">No conversations yet</h2>
                    <p className="text-slate-500 text-center">When you match with someone, you can message them here</p>
                  </div> :

                <div className="space-y-1 p-2">
                    {matches.map((match) => {
                    const unreadCount = messages.filter((m) =>
                    m.match_id === match.id &&
                    m.receiver_email === user.email &&
                    !m.read
                    ).length;
                    return (
                      <motion.button
                        key={match.id}
                        onClick={() => handleSelectMatch(match)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full text-left p-4 rounded-xl bg-white hover:bg-[#EAF5FB] transition-all border border-slate-100 hover:border-[#A8D4E8] group">

                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800">{getOtherUserName(match)}</p>
                              <p className="text-sm text-slate-500 mt-0.5">{getMatchSubtitle(match)}</p>
                            </div>
                            {unreadCount > 0 &&
                          <div className="ml-2 w-6 h-6 bg-[#5BA4C4] text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                {unreadCount}
                              </div>
                          }
                          </div>
                        </motion.button>);

                  })}
                  </div>
                }
              </TabsContent>

              {/* Call Requests Tab */}
              <TabsContent value="requests" className="flex-1 overflow-y-auto">
                {callRequests.length === 0 ?
                <div className="flex flex-col items-center justify-center h-full p-6">
                    <Phone className="w-16 h-16 text-slate-300 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-700 mb-2">No pending requests</h2>
                    <p className="text-slate-500 text-center">Call requests from recruiters will appear here</p>
                  </div> :

                <div className="space-y-2 p-3">
                    {callRequests.map((req) =>
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200 rounded-xl p-4">

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800">{req.recruiter_name}</p>
                            <p className="text-sm text-slate-600">{req.company}</p>
                            <p className="text-xs text-slate-500 mt-2 font-medium">{req.job_title}</p>
                            {req.proposed_date &&
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(req.proposed_date).toLocaleDateString()} {req.proposed_time && `at ${req.proposed_time}`}
                              </p>
                        }
                            {req.message &&
                        <p className="text-sm text-slate-600 mt-3 italic bg-[#EAF5FB] p-2 rounded border-l-2 border-[#5BA4C4]">"{req.message}"</p>
                        }
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="flex-1 border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => base44.entities.CallRequest.update(req.id, { status: 'declined' }).then(() => loadData())}>
                            <X className="w-3 h-3 mr-1" />Decline
                          </Button>
                          <Button size="sm" className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA] text-white" onClick={() => base44.entities.CallRequest.update(req.id, { status: 'accepted' }).then(() => loadData())}>
                            <Check className="w-3 h-3 mr-1" />Accept
                          </Button>
                        </div>
                      </motion.div>
                  )}
                  </div>
                }
              </TabsContent>

              {/* Pending Swipes Tab */}
              <TabsContent value="pending" className="flex-1 overflow-y-auto">
                {swipes.length === 0 ?
                <div className="flex flex-col items-center justify-center h-full p-6">
                    <Heart className="w-16 h-16 text-slate-300 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-700 mb-2">All clear!</h2>
                    <p className="text-slate-500 text-center">You've actioned all your liked jobs</p>
                  </div> :

                <div className="space-y-2 p-3">
                    {swipes.map((swipe, idx) =>
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-amber-200 rounded-xl p-4">

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 font-semibold">{swipe.job?.title}</p>
                            <p className="text-sm text-slate-600">{swipe.job?.company}</p>
                            <div className="mt-2 flex gap-2 flex-wrap">
                              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-current" />Liked
                              </span>
                              {swipe.job?.location &&
                          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{swipe.job.location}</span>
                          }
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  )}
                  </div>
                }
              </TabsContent>
            </Tabs>
          </> :

          <>
            {/* Chat Header */}
            <div className="border-b border-slate-200 p-4 flex items-center gap-3 bg-white">
              <button
                onClick={() => setSelectedMatch(null)}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors">

                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <p className="font-semibold text-slate-800">{getOtherUserName(selectedMatch)}</p>
                <p className="text-sm text-slate-500">{getMatchSubtitle(selectedMatch)}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 ?
              <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500 text-center">No messages yet. Start the conversation!</p>
                </div> :

              messages.map((msg) =>
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.created_by === user.email ? 'justify-end' : 'justify-start'}`}>

                    <div
                  className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                  msg.created_by === user.email ?
                  'bg-[#5BA4C4] text-white rounded-br-none' :
                  'bg-white text-slate-800 rounded-bl-none border border-slate-200'}`
                  }>

                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.created_by === user.email ? 'text-blue-100' : 'text-slate-400'}`}>
                        {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
              )
              }
            </div>

            {/* Message Input */}
            <div className="border-t border-slate-200 p-4 bg-white">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-[#5BA4C4]" />

                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-[#5BA4C4] hover:bg-[#3D87AA] text-white">

                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
          }
      </div>
    </div>
    </PullToRefresh>);

}