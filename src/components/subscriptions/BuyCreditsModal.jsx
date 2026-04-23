import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { ExternalLink } from 'lucide-react';

const PAYPAL_EMAIL = 'franziskanickenig@gmail.com';

const CREDIT_PACKAGES = [
  { credits: 10, price: 10, label: '€10' },
  { credits: 25, price: 25, label: '€25' },
  { credits: 50, price: 50, label: '€50' },
  { credits: 100, price: 100, label: '€100' },
];

function PaymentForm({ credits, price, onSuccess, onCancel }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const gameProgress = await base44.entities.GameProgress.filter({ created_by: user.email });
    if (gameProgress[0]) {
      await base44.entities.GameProgress.update(gameProgress[0].id, {
        credits: (gameProgress[0].credits || 0) + credits,
      });
    }
    setLoading(false);
    onSuccess(credits, price);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">Credits</span>
          <span className="font-bold text-slate-800">{credits}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Amount</span>
          <span className="text-xl font-black text-slate-800">€{price}</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-800">Pay via PayPal</p>
        <p className="text-sm text-blue-700">
          Send <strong>€{price}</strong> to <strong>{PAYPAL_EMAIL}</strong>
        </p>
        <a
          href={`https://paypal.me/franziskanickenig/${price}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-[#0070BA] hover:bg-[#005EA6] text-white font-bold py-3 px-4 rounded-xl transition-colors"
        >
          <img src="https://www.paypalobjects.com/webstatic/icon/favicon.ico" alt="PayPal" className="w-4 h-4" />
          Pay €{price} with PayPal
          <ExternalLink className="w-4 h-4" />
        </a>
        <p className="text-xs text-blue-600 text-center">Reference: CareerConnect Credits</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#5BA4C4]"
        />
        <span className="text-sm text-slate-700">I have completed the PayPal payment of €{price}</span>
      </label>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleConfirm} disabled={!confirmed || loading} className="flex-1 bg-[#5BA4C4] hover:bg-[#3D87AA]">
          {loading ? 'Activating...' : 'Confirm & Add Credits'}
        </Button>
      </div>
    </div>
  );
}

export default function BuyCreditsModal({ open, onClose, onSuccess }) {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  const handlePaymentSuccess = (credits) => {
    setPurchaseComplete(true);
    setTimeout(() => {
      onSuccess(credits);
      setSelectedPackage(null);
      setPurchaseComplete(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buy Credits</DialogTitle>
        </DialogHeader>

        {purchaseComplete ? (
          <div className="py-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Credits Added!</h3>
            <p className="text-sm text-slate-600">Your credits have been added to your account.</p>
          </div>
        ) : selectedPackage ? (
          <PaymentForm
            credits={selectedPackage.credits}
            price={selectedPackage.price}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setSelectedPackage(null)}
          />
        ) : (
          <div className="space-y-3">
            {CREDIT_PACKAGES.map(pkg => (
              <button
                key={pkg.credits}
                onClick={() => setSelectedPackage(pkg)}
                className="w-full p-4 border-2 border-slate-200 hover:border-[#5BA4C4] rounded-xl transition-all hover:bg-[#EAF5FB]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{pkg.credits} Credits</p>
                    <p className="text-sm text-slate-500">1 credit = €{(pkg.price / pkg.credits).toFixed(2)}</p>
                  </div>
                  <p className="text-2xl font-black text-[#5BA4C4]">€{pkg.price}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}