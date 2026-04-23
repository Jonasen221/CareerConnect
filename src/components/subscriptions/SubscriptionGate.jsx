import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Lock, Star, Zap, CheckCircle } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';

export default function SubscriptionGate({ userType, onSubscribed }) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleModalClose = async (open) => {
    setModalOpen(open);
    if (!open) {
      // Re-check subscription after modal closes
      const subs = await base44.entities.Subscription.list('-created_date', 1);
      const paid = subs.find(s => s.tier && s.tier !== 'free');
      if (paid) onSubscribed();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3D87AA] via-[#4a90b0] to-[#5BA4C4] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-[#EAF5FB] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-[#3D87AA]" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Subscription Required</h2>
        <p className="text-slate-500 mb-6">
          To access CareerConnect's full platform, you need an active subscription. Unlock job matching, events, career games, and more.
        </p>
        <div className="space-y-3 mb-8 text-left">
          {[
            { icon: Zap, text: 'Swipe & match with jobs / talent' },
            { icon: Star, text: 'Career Arena games & XP rewards' },
            { icon: CheckCircle, text: 'Events, messages & career services' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-slate-700">
              <Icon className="w-4 h-4 text-[#5BA4C4] flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
        <Button className="w-full bg-[#5BA4C4] hover:bg-[#3D87AA] text-white font-bold py-3 rounded-xl text-base" onClick={() => setModalOpen(true)}>
          View Plans & Subscribe
        </Button>
        <button onClick={() => base44.auth.logout()} className="mt-4 text-sm text-slate-400 hover:text-slate-600 underline">
          Sign out
        </button>
      </div>
      <SubscriptionModal open={modalOpen} onOpenChange={handleModalClose} userType={userType} />
    </div>
  );
}