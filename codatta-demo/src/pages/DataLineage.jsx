import { useState } from 'react';
import { Link } from 'react-router-dom';
import AnchorModal from '../components/AnchorModal';
import { useApp } from '../context/AppContext';

// ─── Step Bar ─────────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'upload', label: 'Upload', icon: 'upload_file' },
  { key: 'process', label: 'Process', icon: 'settings_suggest' },
  { key: 'submission', label: 'Submission', icon: 'check_circle' },
  { key: 'validation', label: 'Validation', icon: 'verified' },
  { key: 'anchor', label: 'Anchor', icon: 'link' },
  { key: 'asset', label: 'Asset', icon: 'grid_view' },
  { key: 'market', label: 'Market', icon: 'storefront' },
];
const ACTIVE_STEP = 'submission';

function StepBar() {
  const activeIdx = STEPS.findIndex(s => s.key === ACTIVE_STEP);
  return (
    <div className="flex justify-between items-center overflow-x-auto pb-4 gap-2 no-scrollbar">
      {STEPS.map((step, i) => {
        const done = i < activeIdx;
        const current = step.key === ACTIVE_STEP;
        return (
          <div key={step.key} className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <span
                className={`material-symbols-outlined text-lg ${current ? 'text-primary' : done ? 'text-primary/60' : 'text-on-surface/25'}`}
                style={current ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {step.icon}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${current ? 'text-primary' : done ? 'text-on-surface/50' : 'text-on-surface/25'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-[1px]" style={done
                ? { background: 'linear-gradient(to right, #b047d3, #d0bcff)' }
                : { background: 'rgba(59,73,75,0.3)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Hover Popover ────────────────────────────────────────────────────────────
function HoverPopover({ children, content, align = 'left' }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div
          className={`absolute top-full mt-2 z-50 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.6))' }}>
          {content}
        </div>
      )}
    </span>
  );
}

// ─── Identity Chip ────────────────────────────────────────────────────────────
function IdentityChip({ handle, role, did, wallet }) {
  const card = (
    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 w-56 text-left">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        </div>
        <div>
          <p className="text-xs font-bold">{handle}</p>
          {role && <p className="text-[10px] text-on-surface/40">{role}</p>}
        </div>
      </div>
      {did && (
        <div className="mb-2">
          <p className="text-[9px] uppercase text-on-surface/30 font-bold tracking-wider mb-0.5">DID</p>
          <p className="text-[10px] font-mono text-primary/80 break-all">{did}</p>
        </div>
      )}
      {wallet && (
        <div>
          <p className="text-[9px] uppercase text-on-surface/30 font-bold tracking-wider mb-0.5">Wallet</p>
          <p className="text-[10px] font-mono text-on-surface/50">{wallet}</p>
        </div>
      )}
    </div>
  );
  return (
    <HoverPopover content={card}>
      <span className="font-bold text-primary cursor-default border-b border-dashed border-primary/50 hover:border-primary transition-colors pb-0.5">
        {handle}
      </span>
    </HoverPopover>
  );
}

// ─── Asset Chip (Node 4 hover → composition + ownership) ─────────────────────
function AssetChip({ name, assetId }) {
  const popover = (
    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-5 w-80 text-left">
      <p className="text-[9px] uppercase font-bold text-primary/70 tracking-widest mb-3">Composition Logic</p>

      <div className="bg-surface-container-high rounded-xl p-3 relative border border-outline-variant/10 mb-1.5">
        <span className="absolute top-2 left-3 text-[9px] text-primary font-bold opacity-50">X</span>
        <div className="flex items-start justify-between pt-3">
          <div>
            <p className="text-xs font-bold">Mushroom Image Set</p>
            <p className="text-[10px] text-primary/60 font-mono">@chef_kenshiro</p>
          </div>
          <span className="text-[8px] font-bold bg-surface/60 px-2 py-0.5 rounded text-on-surface/40 shrink-0 ml-2">RAW DATA</span>
        </div>
      </div>

      <div className="flex justify-center text-on-surface/20 my-1">
        <span className="material-symbols-outlined text-sm">add</span>
      </div>

      <div className="bg-surface-container-high rounded-xl p-3 relative border border-outline-variant/10 mb-1.5">
        <span className="absolute top-2 left-3 text-[9px] text-secondary font-bold opacity-50">Y</span>
        <div className="flex items-start justify-between pt-3">
          <div>
            <p className="text-xs font-bold">Grade S Validation</p>
            <p className="text-[10px] text-on-surface/40">By Codatta QA Admin</p>
          </div>
          <span className="text-[8px] font-bold bg-surface/60 px-2 py-0.5 rounded text-on-surface/40 shrink-0 ml-2">VALIDATED</span>
        </div>
      </div>

      <div className="flex justify-center text-on-surface/20 my-1">
        <span className="material-symbols-outlined text-sm">drag_handle</span>
      </div>

      <div className="bg-primary/5 rounded-xl p-3 border border-primary/20 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-sm">auto_fix_high</span>
          </div>
          <div>
            <p className="text-[8px] uppercase text-primary/50 font-bold">Final Asset</p>
            <p className="text-xs font-bold">{name}</p>
            <p className="text-[9px] font-mono text-on-surface/30">{assetId}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-outline-variant/10 pt-3">
        <p className="text-[9px] uppercase font-bold text-on-surface/30 tracking-widest mb-2">Initial Ownership Summary</p>
        {[
          { role: 'Contributor', handle: '@chef_kenshiro', pct: 40, color: '#b047d3' },
          { role: 'Validator', handle: 'Codatta QA Admin', pct: 25, color: '#d0bcff' },
          { role: 'Initial Staker', handle: '@alpha_backer', pct: 25, color: '#849495' },
          { role: 'Protocol Treasury', handle: null, pct: 10, color: '#571bc1' },
        ].map(({ role, handle, pct, color }) => (
          <div key={role} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[10px] text-on-surface/50 shrink-0">{role}</span>
              {handle && <span className="text-[10px] font-mono text-primary/70 ml-1">· {handle}</span>}
            </div>
            <span className="text-[10px] font-bold ml-2 shrink-0">{pct}%</span>
          </div>
        ))}
        <p className="text-[9px] text-on-surface/25 mt-2 italic">Demo preset based on protocol-configured ownership rules.</p>
      </div>
    </div>
  );

  return (
    <HoverPopover content={popover}>
      <span className="px-3 py-1 rounded border border-primary/40 bg-primary/10 text-primary text-xs font-bold cursor-default hover:bg-primary/15 hover:border-primary/60 transition-all inline-flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs">inventory_2</span>
        {name}
      </span>
    </HoverPopover>
  );
}

// ─── Timeline Node Wrapper ────────────────────────────────────────────────────
function NodeWrapper({ icon, iconFill, children, connector = true }) {
  return (
    <div className="mb-14 relative pl-16">
      {connector && <div className="timeline-connector absolute left-[23px] top-10 bottom-0 w-[2px]" />}
      <div className={`absolute left-0 top-0 w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center z-10 transition-shadow ${iconFill ? 'border border-primary/30 shadow-[0_0_16px_rgba(176,71,211,0.22)]' : 'border border-outline-variant/30'}`}>
        <span className="material-symbols-outlined text-base"
          style={iconFill ? { fontVariationSettings: "'FILL' 1", color: '#b047d3' } : { color: 'rgba(229,226,227,0.4)' }}>
          {icon}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Collapsible Card ─────────────────────────────────────────────────────────
function CollapsibleCard({ title, badge, badgeColor, timestamp, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_24px_rgba(176,71,211,0.07)]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 hover:bg-surface-container transition-colors rounded-2xl">
        <div className="flex flex-col items-start gap-2 text-left">
          <h3 className="text-xl font-bold font-headline">{title}</h3>
          {badge && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <span className="text-[10px] font-mono text-on-surface/30">{timestamp}</span>
          <span className={`material-symbols-outlined text-on-surface/30 transition-transform text-base ${open ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// ─── Accordion Section (Node 5) ───────────────────────────────────────────────
function AccordionSection({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-high hover:bg-surface-variant transition-colors">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">{icon}</span>
          <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
        </div>
        <span className={`material-symbols-outlined text-on-surface/40 text-sm transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─── Metadata Left Drawer ─────────────────────────────────────────────────────
function MetadataDrawer({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-80 bg-surface-container-low border-r border-outline-variant/20 h-full overflow-y-auto p-6"
        style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase text-primary font-bold tracking-widest mb-1">Node 1 · Off-chain</p>
            <p className="text-base font-bold font-headline">Storage &amp; Metadata</p>
          </div>
          <button onClick={onClose} className="text-on-surface/30 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Storage Type', value: 'IPFS + Codatta Off-chain' },
            { label: 'Object Hash', value: 'Qm3k7...f9a2' },
            { label: 'DID Snapshot', value: 'did:codatta:sub_882...' },
            { label: 'Binding Status', value: 'Confirmed' },
            { label: 'Registered At', value: '2025-11-20 14:32 UTC' },
            { label: 'Protocol Version', value: 'codatta-v0.4' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-container rounded-xl p-3">
              <p className="text-[9px] uppercase text-on-surface/30 font-bold tracking-wider mb-1">{label}</p>
              <p className="text-xs font-mono text-on-surface/70">{value}</p>
            </div>
          ))}

          <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 mt-4">
            <p className="text-[9px] uppercase text-primary/60 font-bold tracking-wider mb-1">Note</p>
            <p className="text-xs text-on-surface/50 leading-relaxed">
              Off-chain storage completes identity binding and DID snapshot registration.
              On-chain record begins from Node 3 (Anchor on-chain).
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    </div>
  );
}

// ─── Ownership Identity List ──────────────────────────────────────────────────
function OwnershipIdentityList({ entries }) {
  return (
    <div className="space-y-1">
      {entries.map(({ role, handle, did, pct, color }, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg even:bg-surface-container-lowest/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-xs text-on-surface/50 shrink-0">{role}</span>
            <span className="text-xs font-mono text-primary/70 truncate">· {handle || did}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <div className="w-20 h-1 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-xs font-bold w-8 text-right">{pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Circulation Log ──────────────────────────────────────────────────────────
function CirculationLog() {
  const [expanded, setExpanded] = useState(null);
  const events = [
    {
      id: 0, time: '2025-11-22 10:00', type: 'Listing',
      title: 'Listed on Marketplace',
      fromLabel: null, fromDid: null,
      toLabel: 'Data Marketplace #42', toDid: null,
      share: '100%', tx: null,
    },
    {
      id: 1, time: '2025-11-23 14:15', type: 'Purchase',
      title: '15% share purchased by Backer A',
      fromLabel: 'Initial Staker · @alpha_backer', fromDid: 'did:codatta:initial_staker_01',
      toLabel: 'Backer A', toDid: 'did:codatta:backer_a',
      share: '15%', tx: '0xa13f...92bd',
    },
    {
      id: 2, time: '2025-11-24 09:42', type: 'Transfer',
      title: '5% Contributor → Backer B',
      fromLabel: 'Contributor · @chef_kenshiro', fromDid: 'did:codatta:chef_kenshiro',
      toLabel: 'Backer B', toDid: 'did:codatta:backer_b',
      share: '5%', tx: '0x7cc4...1ab9',
    },
    {
      id: 3, time: '2025-11-24 18:00', type: 'Payout',
      title: 'Reward distributed to Contributor',
      fromLabel: null, fromDid: null,
      toLabel: 'Contributor · @chef_kenshiro', toDid: 'did:codatta:chef_kenshiro',
      share: '40 XNY', tx: '0xf113...90de',
    },
  ];

  const typeStyle = {
    Listing: 'bg-primary/20 text-primary',
    Purchase: 'bg-secondary-container/40 text-secondary',
    Transfer: 'bg-surface-container-high text-on-surface/60',
    Payout: 'bg-primary/20 text-primary',
  };

  const ETHERSCAN = 'https://etherscan.io/tx/';

  return (
    <div className="space-y-2">
      {events.map(evt => (
        <div key={evt.id} className="rounded-xl border border-outline-variant/15 overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === evt.id ? null : evt.id)}
            className="w-full flex items-start gap-3 p-3 hover:bg-surface-container-high/50 transition-colors text-left">
            <div className="shrink-0 mt-1.5">
              <div className={`w-2 h-2 rounded-full ${evt.type === 'Payout' || evt.type === 'Purchase' ? 'bg-primary shadow-[0_0_6px_rgba(176,71,211,0.5)]' : 'border border-primary/40 bg-surface-container'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-on-surface/30">{evt.time}</span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${typeStyle[evt.type]}`}>{evt.type}</span>
              </div>
              <p className="text-xs font-bold text-on-surface/80 mb-1">{evt.title}</p>
              {/* Actor row visible in collapsed state */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {evt.fromLabel && (
                  <>
                    <span className="text-[10px] font-mono text-on-surface/40">{evt.fromLabel}</span>
                    <span className="material-symbols-outlined text-on-surface/25 text-xs">arrow_forward</span>
                  </>
                )}
                <span className="text-[10px] font-mono text-primary/70">{evt.toLabel}</span>
                <span className="text-[10px] font-bold text-on-surface/50">· {evt.share}</span>
              </div>
            </div>
            <span className={`material-symbols-outlined text-on-surface/30 text-sm shrink-0 transition-transform mt-1 ${expanded === evt.id ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {expanded === evt.id && (
            <div className="px-4 pb-4 pt-2 border-t border-outline-variant/10 bg-surface-container-lowest/40 space-y-3">
              {evt.fromLabel && (
                <div>
                  <p className="text-[9px] uppercase text-on-surface/30 font-bold tracking-wider mb-1">From</p>
                  <p className="text-xs font-medium text-on-surface/70">{evt.fromLabel}</p>
                  <p className="text-[10px] font-mono text-primary/60">{evt.fromDid}</p>
                </div>
              )}
              <div>
                <p className="text-[9px] uppercase text-on-surface/30 font-bold tracking-wider mb-1">{evt.type === 'Payout' ? 'Receiver' : 'To'}</p>
                <p className="text-xs font-medium text-on-surface/70">{evt.toLabel}</p>
                {evt.toDid && <p className="text-[10px] font-mono text-primary/60">{evt.toDid}</p>}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase text-on-surface/30 font-bold tracking-wider mb-1">{evt.type === 'Payout' ? 'Amount' : 'Share'}</p>
                  <p className="text-xs font-bold">{evt.share}</p>
                </div>
                {evt.tx && (
                  <a
                    href={`${ETHERSCAN}${evt.tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary text-[11px] font-mono hover:bg-primary/15 transition-colors">
                    {evt.tx}
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DataLineage() {
  const { submission, anchored, setAnchored, walletAddress } = useApp();
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [circulationOpen, setCirculationOpen] = useState(true);
  const [ownershipOpen, setOwnershipOpen] = useState(true);

  const subId = submission?.id || 'SUB-88242-K';
  const foodTitle = submission?.foodName || 'Mushroom Image Set';
  const subDate = submission?.submittedAt
    ? new Date(submission.submittedAt).toLocaleDateString('en-CA') + ' ' + new Date(submission.submittedAt).toTimeString().slice(0,5)
    : '2025-11-20 14:32';
  const walletAddr = walletAddress || '0x3a4f...9c21';

  return (
    <main className="pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface/30 mb-8">
          <span className="text-on-surface/60">Data Lineage</span>
          <span>/</span>
          <span className="text-primary font-mono">{subId}</span>
        </div>

        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em]">Architecture / Flow</p>
              <h1 className="text-4xl font-bold font-headline tracking-tight">Data Lineage</h1>
              <p className="text-on-surface/50 text-sm">Contribution details and ownership flow tracking.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3">
                <span className="text-[10px] text-primary font-bold uppercase">Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium">Active / Published</span>
                </div>
              </div>
              <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3">
                <span className="text-[10px] text-primary font-bold uppercase">ID</span>
                <span className="text-sm font-mono">{subId}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Step bar */}
        <section className="mb-20">
          <StepBar />
        </section>

        {/* Timeline */}
        <div className="relative">
          <div className="timeline-connector absolute left-[23px] top-0 bottom-0 w-[2px]" />

          {/* ── Node 1: Submission Created ────────────────────────────────── */}
          <NodeWrapper icon="description">
            <CollapsibleCard
              title={foodTitle}
              badge="Submission Assembled"
              badgeColor="bg-primary/20 text-primary"
              timestamp={subDate}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-sm">person</span>
                </div>
                <p className="text-sm">
                  Contributor{' '}
                  <IdentityChip
                    handle={walletAddr}
                    role="Contributor"
                    did="did:codatta:contributor"
                    wallet={walletAddr}
                  />{' '}
                  submitted to{' '}
                  <span className="text-on-surface/70">Nutritional Analysis · Image 2 Text</span>
                </p>
              </div>
              <p className="text-sm text-on-surface/50 mb-6 leading-relaxed">
                Data received and registered. Platform has written to off-chain object storage with DID binding snapshot.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowMetadata(true)}
                  className="bg-surface-container-high border border-outline-variant/30 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-surface-variant hover:border-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-sm">inventory_2</span>
                  Storage &amp; Metadata
                </button>
                <span className="text-[10px] font-mono text-on-surface/25">DID: codatta:sub_882...</span>
              </div>
            </CollapsibleCard>
          </NodeWrapper>

          {/* ── Node 2: Validation ───────────────────────────────────────── */}
          <NodeWrapper icon="check_circle" iconFill>
            <CollapsibleCard
              title="Validation"
              badge="Validation Passed"
              badgeColor="bg-secondary-container/40 text-secondary"
              timestamp="2025-11-21 09:15">
              <div className="grid md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-4">
                  <p className="text-sm">
                    Data quality meets protocol standards. Validation level and validator identity recorded on-chain.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <span className="bg-surface-container-highest/40 border border-outline-variant/20 px-3 py-1.5 rounded-full text-[10px] font-bold text-secondary uppercase tracking-wider">
                      Grade S
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest/60 p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[9px] uppercase text-primary/60 font-bold tracking-widest mb-1">Validation Level</p>
                  <p className="text-lg font-bold font-headline">Grade S</p>
                </div>
              </div>
            </CollapsibleCard>
          </NodeWrapper>

          {/* ── Node 3: Anchor on-chain ──────────────────────────────────── */}
          <NodeWrapper icon="link" data-node="anchor">
            <CollapsibleCard
              title="Anchor on-chain"
              badge={anchored ? 'Anchored · 0xa13f...92bd' : 'Ready to Anchor'}
              badgeColor={anchored ? 'bg-primary/20 text-primary' : 'bg-secondary-container/40 text-secondary'}
              timestamp="2025-11-21 16:40">
              {!anchored ? (
                <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold font-headline mb-2">Mint Verification Proof</h4>
                    <p className="text-sm text-on-surface/40 mb-1">Optional · Permanent on-chain record</p>
                    <p className="text-sm text-on-surface/60 mb-5 max-w-md">
                      Anchor your submission to the blockchain to create a permanent, tamper-proof record of your contribution and mint your ownership tokens.
                    </p>

                    {/* FOMO: ownership rights */}
                    <div className="bg-surface-container border border-outline-variant/15 rounded-xl p-4 mb-6">
                      <p className="text-[10px] font-bold uppercase text-on-surface/30 tracking-wider mb-3">Without anchoring, you have no on-chain rights</p>
                      <div className="space-y-2 text-xs text-on-surface/60">
                        {[
                          { icon: 'close', label: 'No on-chain proof of contribution', color: 'text-red-400/70' },
                          { icon: 'close', label: 'No ERC-1155 ownership token', color: 'text-red-400/70' },
                          { icon: 'close', label: 'No share in future royalty distribution', color: 'text-red-400/70' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${item.color}`}>{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                        ))}
                        <div className="border-t border-outline-variant/10 pt-2 mt-2">
                          {[
                            { icon: 'check_circle', label: 'Permanent on-chain ownership record', color: 'text-primary' },
                            { icon: 'check_circle', label: 'ERC-1155 token minted to your wallet', color: 'text-primary' },
                            { icon: 'check_circle', label: 'Eligible for royalty distribution', color: 'text-primary' },
                          ].map(item => (
                            <div key={item.label} className="flex items-center gap-2 mb-1.5">
                              <span className={`material-symbols-outlined text-sm ${item.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                              <span className="text-on-surface/70">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-8 text-sm">
                      {['Verifiable History', 'Immutable Record', 'Enable Ownership', 'Traceability'].map(f => (
                        <div key={f} className="flex items-center gap-2 text-on-surface/60">
                          <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          {f}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-outline-variant/10 pt-5">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-bold uppercase text-on-surface/30">Service Fee</span>
                          <span className="font-bold text-orange-400">450 XNY</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-bold uppercase text-on-surface/30">Network Fee</span>
                          <span className="text-sm font-mono text-on-surface/60">~0.0002 ETH</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAnchorModal(true)}
                        className="btn-gradient px-8 py-3 text-white font-bold rounded-full hover:-translate-y-0.5 transition-all">
                        Start Anchoring →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-5 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-bold text-sm">Submission permanently recorded on-chain</span>
                  </div>
                  {[
                    { label: 'Tx Hash', value: '0xa13f...92bd', link: 'https://etherscan.io/tx/0xa13f' },
                    { label: 'Block', value: '21,483,291', link: null },
                    { label: 'Wallet', value: '@chef_kenshiro', link: null },
                    { label: 'IPFS CID', value: 'Qm3k7...f9a2', link: null },
                  ].map(({ label, value, link }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-on-surface/40">{label}</span>
                      {link
                        ? <a href={link} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline flex items-center gap-1">{value} <span className="material-symbols-outlined text-[10px]">open_in_new</span></a>
                        : <span className="font-mono text-on-surface/70">{value}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCard>
          </NodeWrapper>

          {/* ── Node 4: Assetification ───────────────────────────────────── */}
          <NodeWrapper icon="inventory_2">
            <CollapsibleCard
              title="Assetification"
              badge={anchored ? 'Ownership Established · On-chain' : 'Dataset Assembled'}
              badgeColor={anchored ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface/50'}
              timestamp="2025-11-22 10:00">

              {!anchored ? (
                <div className="space-y-5">
                  {/* Asset assembled info + HuggingFace link */}
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm">Asset Assembled:</p>
                    <AssetChip name="Food-Science-Asset-42" assetId="asset_882_v1" />
                    <p className="text-sm text-on-surface/40">included in</p>
                    <a href="https://huggingface.co/datasets/Codatta/MM-Food-100K" target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1 rounded border border-outline-variant/40 bg-surface-container-high text-on-surface text-xs font-bold hover:border-primary/40 hover:text-primary transition-colors inline-flex items-center gap-1">
                      Codatta/MM-Food-100K
                      <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                    </a>
                  </div>

                  {/* Estimated share — percentages only (no token counts before anchoring) */}
                  <div className="bg-surface-container border border-outline-variant/15 rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase text-on-surface/30 tracking-wider mb-3">Estimated Ownership Share (after anchoring)</p>
                    <div className="space-y-2 text-xs">
                      {[
                        { name: 'You (Contributor)', pct: '65%', color: '#b047d3', highlight: true },
                        { name: 'Protocol Validator', pct: '25%', color: '#d0bcff', highlight: false },
                        { name: 'Protocol Treasury', pct: '10%', color: '#571bc1', highlight: false },
                      ].map(u => (
                        <div key={u.name} className={`flex items-center justify-between py-1.5 ${u.highlight ? 'text-red-400/80' : ''}`}>
                          <div className="flex items-center gap-2">
                            {u.highlight
                              ? <span className="material-symbols-outlined text-xs">close</span>
                              : <div className="w-1.5 h-1.5 rounded-full" style={{ background: u.color }} />
                            }
                            <span className={u.highlight ? 'font-bold' : 'text-on-surface/60'}>{u.name}</span>
                          </div>
                          <span className="font-bold">{u.highlight ? 'Not claimed' : u.pct}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-on-surface/25 mt-3 italic">Token amounts are determined by the smart contract after anchoring. Anchor on-chain to claim your 65% share.</p>
                  </div>

                  {/* CTA back to anchor */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                    <span className="material-symbols-outlined text-primary text-lg">warning</span>
                    <p className="flex-1 text-sm text-on-surface/60">Your contribution is included in this asset, but you have no ownership until you anchor on-chain.</p>
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="shrink-0 px-4 py-2 border border-primary/30 rounded-lg text-primary text-xs font-bold hover:bg-primary/10 transition-colors">
                      ← Go to Step 03
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <p className="text-sm">Asset Assembled:</p>
                    <AssetChip name="Food-Science-Asset-42" assetId="asset_882_v1" />
                    <p className="text-sm text-on-surface/40">included in</p>
                    <a href="https://huggingface.co/datasets/Codatta/MM-Food-100K" target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1 rounded border border-outline-variant/40 bg-surface-container-high text-on-surface text-xs font-bold hover:border-primary/40 hover:text-primary transition-colors inline-flex items-center gap-1">
                      Codatta/MM-Food-100K
                      <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                    </a>
                  </div>
                  <div className="bg-surface-container-lowest border border-primary/10 rounded-xl p-4 space-y-2 text-xs mb-3">
                    {[
                      { label: 'Mint Tx Hash', value: '0xd94e...7f3a', link: 'https://etherscan.io/tx/0xd94e' },
                      { label: 'Token', value: 'ERC-1155 · #882', link: null },
                      { label: 'Your Tokens', value: '35 / 100  (35%)', link: null },
                    ].map(({ label, value, link }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-on-surface/40">{label}</span>
                        {link
                          ? <a href={link} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline flex items-center gap-1">{value} <span className="material-symbols-outlined text-[10px]">open_in_new</span></a>
                          : <span className="font-mono text-on-surface/70">{value}</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-on-surface/20 italic">Hover the asset chip to view composition logic and ownership summary.</p>
                </>
              )}
            </CollapsibleCard>
          </NodeWrapper>

          {/* ── Node 5: Publication & Circulation ───────────────────────── */}
          <NodeWrapper icon="public" iconFill connector={false}>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Step 05</span>
                <h3 className="text-xl font-bold font-headline">Publication &amp; Circulation</h3>
              </div>

              <p className="text-sm text-on-surface/60 mb-4">
                {anchored
                  ? 'Ownership tokens minted. Shares can be transferred via ERC-1155 protocol.'
                  : 'On-chain transfer events for this dataset. Anchor your data to claim your share.'}
              </p>

              {/* Marketplace Entry */}
              <div className="glass-panel rounded-2xl overflow-hidden border-outline-variant/20 opacity-60">
                <div className="w-full flex items-center justify-between p-4 bg-surface-container-high border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface/30">storefront</span>
                    <span className="text-sm font-bold uppercase tracking-wider text-on-surface/40">Marketplace Entry</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-surface-container text-on-surface/30 border border-outline-variant/20">
                    Coming Soon
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-xs text-on-surface/30">
                    Data marketplace contract is under development. Asset fractions can currently be transferred directly via ERC-1155 protocol through private agreement.
                  </p>
                </div>
              </div>

              {/* Circulation Log */}
              <div className="glass-panel rounded-2xl overflow-hidden border-primary/20">
                <button
                  onClick={() => setCirculationOpen(o => !o)}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-high border-b border-outline-variant/10 hover:bg-surface-variant transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">history</span>
                    <span className="text-sm font-bold uppercase tracking-wider">Circulation Log</span>
                  </div>
                  <span className={`material-symbols-outlined text-on-surface/40 text-base transition-transform ${circulationOpen ? '' : 'rotate-180'}`}>expand_more</span>
                </button>
                {circulationOpen && (
                  <div className="p-5">
                    {!anchored && (
                      <div className="mb-5 p-3 rounded-xl bg-surface-container border border-outline-variant/15 text-xs text-on-surface/50">
                        <span className="material-symbols-outlined text-sm text-on-surface/30 align-middle mr-1">info</span>
                        Other contributors who have anchored their data can earn royalties when their ownership tokens are transferred or traded. Anchor your data in Step 03 to participate.
                      </div>
                    )}
                    <div className="space-y-8 relative pl-6 border-l border-outline-variant/20">
                      {[
                        ...(anchored ? [
                          { time: '2025-11-25 11:30', type: 'Mint', title: 'ERC-1155 tokens minted to You', desc: 'Your 65 ownership tokens minted on-chain after anchoring. Represents your contributor share of this data asset.', from: null, to: '@chef_kenshiro (You)', share: '65 tokens', tx: '0xd94e...7f3a', highlight: true },
                          { time: '2025-11-26 09:00', type: 'Mint', title: 'Validator share minted', desc: 'Protocol validator share minted. 25 tokens.', from: null, to: 'Protocol Validator', share: '25 tokens', tx: '0x3d82...a01c', highlight: false },
                          { time: '2025-11-26 09:00', type: 'Mint', title: 'Treasury share minted', desc: 'Protocol treasury share. 10 tokens.', from: null, to: 'Protocol Treasury', share: '10 tokens', tx: '0x3d82...a01c', highlight: false },
                        ] : [
                          { time: '2025-11-22 10:00', type: 'Mint', title: 'Validator share minted', desc: 'Protocol validator share minted on-chain.', from: null, to: 'Protocol Validator', share: '25 tokens', tx: '0x3d82...a01c', highlight: false },
                          { time: '2025-11-22 10:00', type: 'Mint', title: 'Treasury share minted', desc: 'Protocol treasury share minted.', from: null, to: 'Protocol Treasury', share: '10 tokens', tx: '0x3d82...a01c', highlight: false },
                          { time: '2025-11-23 14:15', type: 'Transfer', title: 'Backer A purchased 10% share', desc: 'ERC-1155 direct transfer via wallet. You cannot trade your share until you anchor on-chain.', from: '@other_contributor', to: 'Backer A', share: '10 tokens', tx: '0xa13f...92bd', highlight: false },
                          { time: '2025-11-24 09:42', type: 'Transfer', title: 'Backer B purchased 5% share', desc: 'ERC-1155 direct transfer via wallet.', from: '@other_contributor', to: 'Backer B', share: '5 tokens', tx: '0x7cc4...1ab9', highlight: false },
                        ]),
                      ].map((evt, i) => (
                        <div key={i} className="relative">
                          <div className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 ${evt.highlight ? 'bg-primary border-primary shadow-[0_0_8px_rgba(176,71,211,0.5)]' : 'bg-surface border-primary/60'}`} />
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="font-mono text-on-surface/40">{evt.time}</span>
                              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[9px] font-bold uppercase">{evt.type}</span>
                            </div>
                            <p className="text-sm font-bold">{evt.title}</p>
                            <p className="text-xs text-on-surface/40">{evt.desc}</p>
                            <div className={`p-3 rounded-xl border text-[11px] grid grid-cols-2 md:grid-cols-4 gap-3 ${evt.highlight ? 'bg-primary/5 border-primary/10' : 'bg-surface-container-low/40 border-outline-variant/10'}`}>
                              {evt.from && <div><span className="opacity-40 uppercase block mb-0.5 text-[9px]">From</span><span className="font-bold text-primary truncate block">{evt.from}</span></div>}
                              <div><span className="opacity-40 uppercase block mb-0.5 text-[9px]">To</span><span className="font-bold text-primary truncate block">{evt.to}</span></div>
                              <div><span className="opacity-40 uppercase block mb-0.5 text-[9px]">Share</span><span className="font-bold">{evt.share}</span></div>
                              {evt.tx && <div><span className="opacity-40 uppercase block mb-0.5 text-[9px]">Tx Hash</span><a href={`https://etherscan.io/tx/${evt.tx}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{evt.tx} <span className="material-symbols-outlined text-[11px]">open_in_new</span></a></div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* FOMO hint + CTA when not anchored */}
                    {!anchored && (
                      <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                        <span className="material-symbols-outlined text-primary text-lg">warning</span>
                        <p className="flex-1 text-xs text-on-surface/60">Others are minting and trading tokens. You cannot trade your share until you anchor on-chain.</p>
                        <button
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="shrink-0 px-4 py-2 border border-primary/30 rounded-lg text-primary text-xs font-bold hover:bg-primary/10 transition-colors">
                          ← Go to Step 03
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Current Ownership */}
              <div className="glass-panel rounded-2xl overflow-hidden border-primary/20">
                <button
                  onClick={() => setOwnershipOpen(o => !o)}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-high border-b border-outline-variant/10 hover:bg-surface-variant transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">pie_chart</span>
                    <span className="text-sm font-bold uppercase tracking-wider">Current Ownership Snapshot</span>
                  </div>
                  <span className={`material-symbols-outlined text-on-surface/40 text-base transition-transform ${ownershipOpen ? '' : 'rotate-180'}`}>expand_more</span>
                </button>
                {ownershipOpen && (
                  <div className="p-5">
                    {[
                      ...(anchored ? [{ label: 'You · @chef_kenshiro', did: 'Contributor', percent: 65, color: '#b047d3' }] : []),
                      { label: 'Protocol Validator', did: 'Validator', percent: 25, color: '#d0bcff' },
                      { label: 'Protocol Treasury', did: 'Treasury', percent: 10, color: '#571bc1' },
                      ...(!anchored ? [{ label: 'You (unanchored)', did: 'Contributor', percent: 0, color: '#3b3b3b' }] : []),
                    ].map(({ label, did, percent, color }) => (
                      <div key={did} className="flex items-center justify-between py-3 px-2 rounded-lg even:bg-surface-container-lowest/60">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: `${color}22`, color }}>
                            {label.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{label}</p>
                            <p className="text-[9px] font-mono text-on-surface/30">{did}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="w-36 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percent}%`, background: color }} />
                          </div>
                          <span className="text-xs font-bold font-mono w-8 text-right">{percent}%</span>
                        </div>
                      </div>
                    ))}

                    {/* Hint when not anchored */}
                    {!anchored && (
                      <p className="text-[10px] text-on-surface/30 italic mt-3">Anchor on-chain to claim the contributor share (65 tokens).</p>
                    )}
                  </div>
                )}
              </div>

              {/* Marketplace Entry */}
              <div className="glass-panel rounded-2xl overflow-hidden border-outline-variant/20 opacity-60">
                <div className="w-full flex items-center justify-between p-4 bg-surface-container-high border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface/30">storefront</span>
                    <span className="text-sm font-bold uppercase tracking-wider text-on-surface/40">Marketplace Entry</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-surface-container text-on-surface/30 border border-outline-variant/20">
                    Coming Soon
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-xs text-on-surface/30">
                    Data marketplace contract is under development. Asset fractions can currently be transferred directly via ERC-1155 protocol through wallet.
                  </p>
                </div>
              </div>
            </div>
          </NodeWrapper>

        </div>
      </div>

      {showAnchorModal && (
        <AnchorModal
          onClose={() => setShowAnchorModal(false)}
          onSuccess={() => setAnchored(true)}
        />
      )}
      {showMetadata && <MetadataDrawer onClose={() => setShowMetadata(false)} />}
    </main>
  );
}
