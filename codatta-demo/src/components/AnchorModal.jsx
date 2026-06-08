import { useState } from 'react';

export default function AnchorModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(0); // 0=confirm, 1=processing, 2=done

  const handleConfirm = () => {
    setStep(1);
    setTimeout(() => setStep(2), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-8 w-full max-w-md relative" style={{ boxShadow: '0 0 32px 0 rgba(208,188,255,0.07), 0 25px 50px rgba(0,0,0,0.6)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface/30 hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        {step === 0 && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-primary">link</span>
            </div>
            <h2 className="text-2xl font-bold font-headline mb-2">Mint Verification Proof</h2>
            <p className="text-sm text-on-surface/50 mb-6">
              Anchor your submission to the blockchain. This creates a permanent, tamper-proof record of your contribution.
            </p>
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface/40">Asset</span>
                <span className="font-bold">Food-Science-Asset-42</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface/40">Service Fee</span>
                <span className="font-bold text-orange-400">450 XNY</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface/40">Network Fee</span>
                <span className="font-mono text-on-surface/60">~0.0002 ETH</span>
              </div>
              <div className="border-t border-outline-variant/10 pt-3 flex justify-between text-sm">
                <span className="text-on-surface/40">Wallet</span>
                <span className="font-mono text-primary">@chef_kenshiro</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 border border-outline-variant/30 rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm}
                className="btn-gradient flex-1 py-3 text-white font-bold rounded-xl transition-all">
                Confirm &amp; Anchor
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold font-headline mb-2">Anchoring to Blockchain…</h2>
            <p className="text-sm text-on-surface/40">Broadcasting transaction to Ethereum network</p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h2 className="text-xl font-bold font-headline mb-2">Successfully Anchored!</h2>
            <p className="text-sm text-on-surface/40 mb-6">Your contribution is now permanently recorded on-chain.</p>
            <div className="bg-surface-container-low border border-primary/20 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-on-surface/40">Tx Hash</span>
                <span className="font-mono text-primary">0xa13f...92bd</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-on-surface/40">Block</span>
                <span className="font-mono">21,483,291</span>
              </div>
            </div>
            <button onClick={() => { onSuccess?.(); onClose(); }}
              className="btn-gradient w-full py-3 text-white font-bold rounded-xl transition-all">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
