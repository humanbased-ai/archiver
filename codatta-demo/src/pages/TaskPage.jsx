import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// ─── Wallet Connect Modal ────────────────────────────────────────────────────
function WalletConnectModal({ onClose, onConnected }) {
  const [connecting, setConnecting] = useState(null);

  const handleConnect = (wallet) => {
    setConnecting(wallet);
    setTimeout(() => {
      onConnected(wallet);
      onClose();
    }, 1500);
  };

  const wallets = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', desc: 'Connect with MetaMask' },
    { id: 'okx', name: 'OKX Wallet', icon: '⭕', desc: 'Connect with OKX Wallet' },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', desc: 'Scan with mobile wallet' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-8 w-full max-w-sm relative"
        style={{ boxShadow: '0 0 32px 0 rgba(208,188,255,0.07), 0 25px 50px rgba(0,0,0,0.6)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface/30 hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
        </div>
        <h2 className="text-xl font-bold font-headline mb-1">Connect Wallet</h2>
        <p className="text-sm text-on-surface/40 mb-6">Connect your wallet to submit data and anchor on-chain.</p>

        <div className="space-y-2">
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => handleConnect(w.id)}
              disabled={!!connecting}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-outline-variant/20 hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 text-left">
              <span className="text-2xl">{w.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold">{w.name}</p>
                <p className="text-[10px] text-on-surface/40">{w.desc}</p>
              </div>
              {connecting === w.id && (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TaskPage() {
  const navigate = useNavigate();
  const { walletAddress, connectWallet, submitData } = useApp();

  const [foodImage, setFoodImage] = useState(null);
  const [foodName, setFoodName] = useState('');
  const [foodWeight, setFoodWeight] = useState('');
  const [cookingMethod, setCookingMethod] = useState('');
  const [calories, setCalories] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFoodImage(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) setFoodImage(file);
  };

  const canSubmit = foodImage && foodName.trim() && foodWeight.trim() && cookingMethod.trim() && calories.trim();

  const doSubmit = (wallet) => {
    setSubmitting(true);
    submitData({
      foodName: foodName.trim(),
      foodWeight: foodWeight.trim(),
      cookingMethod: cookingMethod.trim(),
      calories: calories.trim(),
      foodImageName: foodImage.name,
    });
    setTimeout(() => navigate('/profile'), 1200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!walletAddress) {
      setShowWalletModal(true);
      return;
    }
    doSubmit(walletAddress);
  };

  return (
    <main className="pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-8">

        {/* Header */}
        <header className="mb-10 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-on-surface/50 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back
          </Link>
          <h1 className="flex-1 text-center text-xl font-bold font-headline tracking-tight">
            Food Image Data Collection &amp; Annotation
          </h1>
          <div className="w-[52px]" />
        </header>

        {/* Guidelines */}
        <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 mb-8 space-y-6">
          <h2 className="text-base font-bold font-headline flex items-center gap-2">
            <span>📋</span> Guidelines
          </h2>

          <div>
            <h3 className="text-sm font-bold text-on-surface/80 mb-2 flex items-center gap-2">
              <span>📋</span> Task Description
            </h3>
            <p className="text-sm text-on-surface/60 leading-relaxed">
              This project aims to co-create a high-quality food nutrition database through the food photos you take and your precise annotations. You are required to submit a clear, aesthetically pleasing photo of a ready-to-eat dish. Please note: raw ingredients such as raw meat, raw fish, unprocessed vegetables, or unopened packaged products do not meet the requirements. Additionally, please provide an accurate food name, quantity, cooking method, and estimated calories for the food in the photo.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-on-surface/80 mb-2 flex items-center gap-2">
              <span>📋</span> Evaluation Criteria
            </h3>
            <p className="text-sm text-on-surface/60 leading-relaxed mb-3">
              Your submission will be comprehensively reviewed by the system, combining both image and text information, and given a quality score from D to S based on the following criteria:
            </p>
            <div className="space-y-2 text-sm text-on-surface/60 leading-relaxed">
              <p><span className="font-bold text-on-surface/80">D:</span> The submitted image URL is invalid or inaccessible; there is no clearly discernible food in the picture; or the food is a non-ready-to-eat raw ingredient (e.g., raw meat, raw fish).</p>
              <p><span className="font-bold text-on-surface/80">C:</span> The annotated text information is gibberish, an ad, or completely unrelated to food.</p>
              <p><span className="font-bold text-on-surface/80">B:</span> The annotated information contains obvious errors relative to the image content. For example: the food name doesn't match the picture, or the quantity, cooking method, or calorie values severely deviate from common sense.</p>
              <p><span className="font-bold text-on-surface/80">A:</span> The annotated information is generally accurate, but the image quality is poor, such as a blurry main subject, poor composition, dim lighting, or a cluttered background.</p>
              <p><span className="font-bold text-on-surface/80">S:</span> A perfect submission—the image is clear and aesthetically pleasing, and all annotated information is accurate, reasonable, and complete.</p>
            </div>
          </div>
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mb-8">

          {/* Food Image Upload */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface/40 block mb-2">
              Food Image <span className="text-primary">*</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center transition-all ${
                dragging ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-primary/40'
              }`}
            >
              {foodImage ? (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-base">image</span>
                  <span className="text-sm">{foodImage.name}</span>
                  <button type="button" onClick={() => setFoodImage(null)} className="ml-2">
                    <span className="material-symbols-outlined text-on-surface/30 hover:text-on-surface/60 text-sm">close</span>
                  </button>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-4xl text-primary/60">cloud_upload</span>
                  <div>
                    <p className="text-sm font-bold mb-1">Upload Food Image</p>
                    <p className="text-xs text-on-surface/40">
                      Photos of ready-to-eat dishes (homemade or restaurant-made). Excludes: Raw ingredients &amp; packaged products
                    </p>
                  </div>
                  <label className="btn-gradient px-5 py-2 text-white text-xs font-bold rounded-xl cursor-pointer">
                    Browse Files
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Food Name */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface/40 block mb-2">
              Food Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g. Grilled Salmon with Vegetables"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 placeholder:text-on-surface/20 transition-colors"
            />
          </div>

          {/* Food Weight */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface/40 block mb-2">
              Food Weight (in grams) <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={foodWeight}
              onChange={(e) => setFoodWeight(e.target.value)}
              placeholder="e.g. 350"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 placeholder:text-on-surface/20 transition-colors"
            />
          </div>

          {/* Cooking Method */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface/40 block mb-2">
              Cooking Method <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={cookingMethod}
              onChange={(e) => setCookingMethod(e.target.value)}
              placeholder="e.g. Pan-fried, Steamed, Baked"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 placeholder:text-on-surface/20 transition-colors"
            />
          </div>

          {/* Calories */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface/40 block mb-2">
              Calories (kcal) <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="e.g. 450"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 placeholder:text-on-surface/20 transition-colors"
            />
          </div>

          {/* Redline Behaviors Warning */}
          <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
              <span>⚠️</span> Expert Redline Behaviors (One-time Elimination System)
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-on-surface/60 leading-relaxed">
              <li>Maliciously circumventing or cracking task rules; submitting a large amount of invalid or low-quality data</li>
              <li>Engaging in obvious cheating behavior by directly submitting AI-generated content without performing any manual review, modification, or annotation</li>
              <li>Engaging in dishonest behaviors such as plagiarism or delegating tasks to others</li>
              <li>Engaging in uncivilized behaviors such as verbal abuse or personal attacks against others</li>
              <li>Disseminating question banks or task rules, or disclosing any related confidential information</li>
            </ol>
            <p className="text-xs text-red-400/80 leading-relaxed pt-1">
              Please also note that if any malicious activity is detected, all submitted data from the account will be invalidated, and the account will be blacklisted, preventing any new data submissions for 14 days.
            </p>
          </section>

          {/* Wallet status */}
          {walletAddress && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs">
              <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="text-on-surface/60">Wallet connected:</span>
              <span className="font-mono text-primary">{walletAddress}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
              canSubmit
                ? 'btn-gradient text-white'
                : 'bg-surface-container-high text-on-surface/20 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : !walletAddress && canSubmit ? 'Connect Wallet & Submit' : 'Submit'}
          </button>
        </form>

      </div>

      {/* Wallet Connect Modal */}
      {showWalletModal && (
        <WalletConnectModal
          onClose={() => setShowWalletModal(false)}
          onConnected={(wallet) => {
            connectWallet(wallet);
            doSubmit(wallet);
          }}
        />
      )}
    </main>
  );
}
