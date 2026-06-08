import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function WalletModal({ onClose }) {
  const { connectWallet } = useApp();
  const [connecting, setConnecting] = useState(null);

  const wallets = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', desc: 'Connect with MetaMask' },
    { id: 'okx', name: 'OKX Wallet', icon: '⭕', desc: 'Connect with OKX Wallet' },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', desc: 'Scan with mobile wallet' },
  ];

  const handleConnect = (id) => {
    setConnecting(id);
    setTimeout(() => {
      connectWallet(id);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-8 w-full max-w-sm relative"
        style={{ boxShadow: '0 0 32px 0 rgba(208,188,255,0.07), 0 25px 50px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>
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

export default function Navbar() {
  const location = useLocation();
  const { walletAddress, disconnectWallet } = useApp();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);

  const navItems = [
    { label: 'Frontier', path: '/', icon: 'explore' },
    { label: 'Data Profile', path: '/profile', icon: 'manage_accounts' },
    { label: 'Data Lineage', path: '/lineage', icon: 'account_tree' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-outline-variant/20"
        style={{ background: 'rgba(13,13,20,0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-base">hub</span>
            </div>
            <span className="font-headline font-bold text-on-surface tracking-tight">Codatta</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 border border-primary/20 px-2 py-0.5 rounded-full">Architect</span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ label, path, icon }) => {
              const active = location.pathname === path;
              return (
                <Link key={path} to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface/50 hover:text-on-surface hover:bg-surface-container-high'
                    }`}>
                  <span className="material-symbols-outlined text-base">{icon}</span>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Wallet / Identity */}
          {walletAddress ? (
            <div className="relative">
              <button
                onClick={() => setShowDisconnect(v => !v)}
                className="flex items-center gap-2 bg-surface-container-highest border border-outline-variant/20 px-3 py-1.5 rounded-full hover:border-primary/30 transition-all cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
                <span className="text-xs font-mono text-on-surface/70">{walletAddress}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              </button>
              {showDisconnect && (
                <div className="absolute right-0 top-full mt-2 bg-surface-container border border-outline-variant/30 rounded-xl p-2 min-w-[140px] z-50"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  <button
                    onClick={() => { disconnectWallet(); setShowDisconnect(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface/70 hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="flex items-center gap-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 px-4 py-1.5 rounded-full transition-all text-sm font-medium text-primary">
              <span className="material-symbols-outlined text-base">account_balance_wallet</span>
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {showWalletModal && <WalletModal onClose={() => setShowWalletModal(false)} />}
    </>
  );
}
