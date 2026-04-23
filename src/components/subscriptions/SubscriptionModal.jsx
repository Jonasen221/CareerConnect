import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, ExternalLink, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const STUDENT_PLANS = [
  {
    tier: 'bronze',
    name: 'Industry Specific',
    basePrice: 14.95,
    price: '€14.95',
    period: '/mo',
    swipes: 2,
    badge: null,
    features: [
      { text: 'Industry-specific job listings', included: true },
      { text: '2 swipes per day', included: true },
      { text: 'Profile visible to matched recruiters', included: true },
      { text: 'Community events', included: true },
    ],
  },
  {
    tier: 'silver',
    name: 'Global',
    basePrice: 25.95,
    price: '€25.95',
    period: '/mo',
    swipes: 3,
    badge: 'Best Value',
    features: [
      { text: 'All industries access', included: true },
      { text: '3 swipes per day', included: true },
      { text: 'Priority profile review', included: true },
      { text: 'Exclusive events access', included: true },
      { text: 'Direct message priority', included: true },
      { text: 'Cover letter & multinational CV service', included: true },
    ],
  },
];

const RECRUITER_PLANS = [
  {
    tier: 'bronze',
    name: 'Industry Specific',
    basePrice: 14.95,
    price: '€14.95',
    period: '/mo',
    swipes: 2,
    badge: null,
    features: [
      { text: 'Browse industry-specific talent', included: true },
      { text: '2 swipes per day', included: true },
      { text: 'Post job listings', included: true },
      { text: 'Basic company profile', included: true },
    ],
  },
  {
    tier: 'silver',
    name: 'Global',
    basePrice: 25.95,
    price: '€25.95',
    period: '/mo',
    swipes: 3,
    badge: 'Best Value',
    features: [
      { text: 'Access all candidate profiles', included: true },
      { text: '3 swipes per day', included: true },
      { text: 'Priority listing placement', included: true },
      { text: 'Invite-only events access', included: true },
      { text: 'Featured company profile', included: true },
      { text: 'Candidate CV & cover letter support', included: true },
    ],
  },
];

const ALL_PLANS = [...STUDENT_PLANS, ...RECRUITER_PLANS];

const getPlans = (userType) => userType === 'recruiter' ? RECRUITER_PLANS : STUDENT_PLANS;

const PAYPAL_EMAIL = 'franziskanickenig@gmail.com';

function PaymentForm({ tier, plan, onSuccess, onCancel }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const paypalUrl = `https://www.paypal.com/paypalme/${PAYPAL_EMAIL.split('@')[0]}/${plan.basePrice}`;

  const handleConfirm = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const existing = await base44.entities.Subscription.filter({ created_by: user.email });
    const subData = {
      tier,
      daily_swipes: ALL_PLANS.find(p => p.tier === tier)?.swipes ?? 2,
      can_message: tier === 'silver' || tier === 'gold',
      started_date: new Date().toISOString().split('T')[0],
    };
    if (existing.length > 0) {
      await base44.entities.Subscription.update(existing[0].id, subData);
    } else {
      await base44.entities.Subscription.create(subData);
    }
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-800">Pay via PayPal</p>
        <p className="text-sm text-blue-700">
          Send <strong>{plan.price}</strong> to <strong>{PAYPAL_EMAIL}</strong> via PayPal, then confirm below.
        </p>
        <a
          href={`https://paypal.me/franziskanickenig/${plan.basePrice}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-[#0070BA] hover:bg-[#005EA6] text-white font-bold py-3 px-4 rounded-xl transition-colors"
        >
          <img src="https://www.paypalobjects.com/webstatic/icon/favicon.ico" alt="PayPal" className="w-4 h-4" />
          Pay with PayPal
          <ExternalLink className="w-4 h-4" />
        </a>
        <p className="text-xs text-blue-600 text-center">Reference: CareerConnect {plan.name} Plan</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#5BA4C4]"
        />
        <span className="text-sm text-slate-700">I have completed the PayPal payment of {plan.price}</span>
      </label>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!confirmed || loading} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA]">
          {loading ? 'Activating...' : 'Confirm & Activate'}
        </Button>
      </div>
    </div>
  );
}

export default function SubscriptionModal({ open, onOpenChange, currentTier, onSubscribe = () => {}, userType = 'student' }) {
  const [loading, setLoading] = useState(null);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [activeTab, setActiveTab] = useState(userType);
  const plans = getPlans(activeTab);

  const handleSubscribe = async (tier) => {
    if (tier === currentTier) return;

    const plan = plans.find(p => p.tier === tier);
    if (plan.basePrice === 0) {
      // Free tier - no payment needed
      setLoading(tier);
      try {
        const user = await base44.auth.me();
        const existing = await base44.entities.Subscription.filter({ created_by: user.email });
        
        const subData = {
          tier,
          daily_swipes: ALL_PLANS.find(p => p.tier === tier)?.swipes ?? 2,
          can_message: tier === 'silver' || tier === 'gold',
          started_date: new Date().toISOString().split('T')[0],
        };

        if (existing.length > 0) {
          await base44.entities.Subscription.update(existing[0].id, subData);
        } else {
          await base44.entities.Subscription.create(subData);
        }

        onSubscribe(tier);
        onOpenChange(false);
      } catch (error) {
        console.error('Subscription error:', error);
      }
      setLoading(null);
    } else {
      // Paid tier - show payment form
      setSelectedForPayment({ tier, plan });
    }
  };

  const handlePaymentSuccess = () => {
    onSubscribe(selectedForPayment.tier);
    setSelectedForPayment(null);
    onOpenChange(false);
  };

  if (selectedForPayment) {
    return (
      <Dialog open={open} onOpenChange={(newOpen) => { if (!newOpen) setSelectedForPayment(null); onOpenChange(newOpen); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Payment</DialogTitle>
          </DialogHeader>
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
            <p className="text-sm text-slate-600">Upgrading to</p>
            <p className="text-lg font-bold text-slate-800">{selectedForPayment.plan.name}</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{selectedForPayment.plan.price} {selectedForPayment.plan.period}</p>
          </div>
          <PaymentForm 
            tier={selectedForPayment.tier}
            plan={selectedForPayment.plan}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setSelectedForPayment(null)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex justify-center gap-3 mt-2 mb-6">
          <button
            onClick={() => setActiveTab('student')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'student' ? 'bg-[#5BA4C4] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:text-[#3D87AA]'}`}
          >
            🎓 For Candidates
          </button>

          <button
            onClick={() => setActiveTab('recruiter')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'recruiter' ? 'bg-[#3D87AA] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:text-[#3D87AA]'}`}
          >
            💼 For Recruiters
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <motion.div key={plan.tier} whileHover={{ y: -4 }} className="relative">
              <div className={`rounded-2xl border-2 overflow-hidden transition-all h-full flex flex-col ${
                plan.badge === 'Most Popular'
                  ? 'border-[#5BA4C4] shadow-lg'
                  : plan.badge === 'Best Value'
                  ? 'border-[#2E3F4F]'
                  : 'border-slate-200 bg-white hover:border-[#5BA4C4]'
              } ${plan.tier === currentTier ? 'ring-2 ring-[#5BA4C4]' : ''}`}>
                {plan.badge && (
                  <div className={`text-white text-xs font-bold text-center py-2 uppercase tracking-wider ${plan.badge === 'Most Popular' ? 'bg-[#5BA4C4]' : 'bg-[#2E3F4F]'}`}>
                    {plan.badge}
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1 bg-white">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-2 mb-5">
                    <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-slate-500 text-sm ml-1">/mo</span>
                  </div>

                  <div className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#5BA4C4] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={loading === plan.tier || plan.tier === currentTier}
                    className={`w-full h-10 font-bold flex items-center justify-center gap-2 ${
                      plan.tier === currentTier
                        ? 'bg-slate-200 text-slate-500 cursor-default'
                        : plan.badge === 'Most Popular'
                        ? 'bg-[#5BA4C4] hover:bg-[#3D87AA] text-white'
                        : 'bg-[#EAF5FB] hover:bg-[#A8D4E8]/60 text-[#3D87AA]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    {loading === plan.tier ? 'Upgrading...' : plan.tier === currentTier ? 'Current Plan' : 'Get Started'}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}