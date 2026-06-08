import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('en-CA'); // YYYY-MM-DD
}

export default function Dashboard() {
  const { submission, anchored, walletAddress } = useApp();

  // Derive submission status from state
  const status = !submission
    ? null
    : anchored
    ? 'Anchored'
    : 'Validation';

  const statusColor = status === 'Anchored'
    ? 'bg-primary/20 text-primary'
    : 'bg-secondary-container/40 text-secondary';

  return (
    <main className="pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-8">

        {/* Header */}
        <header className="mb-12">
          <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Overview</p>
          <h1 className="text-4xl font-bold font-headline tracking-tight mb-2">My Contributions</h1>
          <p className="text-on-surface/50 text-sm">Track your data submissions, validation status, and on-chain anchoring.</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            {
              label: 'Total Submissions',
              value: submission ? '1' : '0',
              icon: 'upload_file',
              delta: submission ? 'Submitted this session' : 'No submissions yet',
            },
            {
              label: 'Validated',
              value: submission ? '1' : '0',
              icon: 'verified',
              delta: submission ? 'Grade S · Auto-validated' : '—',
            },
            {
              label: 'Anchored On-chain',
              value: anchored ? '1' : '0',
              icon: 'link',
              delta: anchored ? 'Token minted · ERC-1155' : submission ? 'Pending anchor' : '—',
            },
            {
              label: 'Wallet',
              value: walletAddress ? '●' : '—',
              icon: 'account_balance_wallet',
              delta: walletAddress || 'Not connected',
            },
          ].map(({ label, value, icon, delta }) => (
            <div key={label} className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface/40">{label}</span>
                <span className="material-symbols-outlined text-primary text-base">{icon}</span>
              </div>
              <p className="text-2xl font-bold font-headline mb-1">{value}</p>
              <p className="text-[10px] text-on-surface/40 font-mono truncate">{delta}</p>
            </div>
          ))}
        </div>

        {/* Submissions */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold font-headline">Recent Submissions</h2>
          </div>

          {!submission ? (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface/20">inbox</span>
              <p className="text-on-surface/40 text-sm">No submissions yet.</p>
              <Link
                to="/"
                className="btn-gradient px-6 py-2.5 text-white text-sm font-bold rounded-xl">
                Go to Frontier →
              </Link>
            </div>
          ) : (
            <Link to="/lineage"
              className="block bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 hover:border-primary/30 hover:bg-surface-container transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-base">image</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{submission.foodName}</span>
                      <span className="text-[9px] font-mono text-on-surface/30">{submission.id}</span>
                    </div>
                    <p className="text-xs text-on-surface/50">
                      Food Science · Nutritional Analysis · Image 2 Text
                    </p>
                    <p className="text-[10px] text-on-surface/30 mt-0.5">
                      {submission.foodWeight}g · {submission.cookingMethod} · {submission.calories} kcal
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center hidden md:block">
                    <p className="text-[9px] uppercase text-on-surface/30 mb-1">Quality</p>
                    <span className="text-sm font-bold text-primary">S</span>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-[9px] uppercase text-on-surface/30 mb-1">Date</p>
                    <span className="text-xs font-mono">{formatDate(submission.submittedAt)}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full ${statusColor}`}>
                    {status}
                  </span>
                  <span className="material-symbols-outlined text-on-surface/20 group-hover:text-primary transition-colors text-base">
                    arrow_forward
                  </span>
                </div>
              </div>
            </Link>
          )}
        </section>

      </div>
    </main>
  );
}
