import { useNavigate } from 'react-router-dom';

const FRONTIERS = [
  {
    id: 'food-science',
    title: 'Food Science',
    participants: '99k',
    stars: 1,
    bg: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
    bgColor: '#1a0d00',
    highlight: true,
  },
];

function StarRating({ count }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i}
          className="material-symbols-outlined text-sm"
          style={{
            color: i <= count ? '#facc15' : 'rgba(255,255,255,0.2)',
            fontVariationSettings: i <= count ? "'FILL' 1" : "'FILL' 0",
            fontSize: 14,
          }}>
          star
        </span>
      ))}
    </div>
  );
}

// Fake avatar stack
function AvatarStack() {
  return (
    <div className="flex items-center -space-x-1.5">
      {[0,1,2].map(i => (
        <div key={i} className="w-5 h-5 rounded-full border border-black/40"
          style={{ background: ['#b047d3','#571bc1','#849495'][i] }} />
      ))}
    </div>
  );
}

export default function Frontier() {
  const navigate = useNavigate();

  return (
    <main className="pt-16 pb-20 min-h-screen" style={{ background: '#0d0d14' }}>

      {/* Hero banner */}
      <div className="relative overflow-hidden mb-8"
        style={{ background: 'linear-gradient(135deg, #0d0d14 0%, #1a0d2e 50%, #0d0d14 100%)', minHeight: 200 }}>
        {/* decorative orbs */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(176,71,211,0.15)' }} />
        <div className="absolute right-32 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl pointer-events-none"
          style={{ background: 'rgba(87,27,193,0.2)' }} />
        {/* 3D coin placeholder */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 flex items-center gap-4 opacity-60">
          <div className="w-20 h-20 rounded-2xl border border-white/10 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <span className="material-symbols-outlined text-white/40 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
          </div>
          <div className="w-14 h-14 rounded-xl border border-white/10 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)' }}>
            <span className="material-symbols-outlined text-white/30 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <span className="material-symbols-outlined text-white text-xs" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>hub</span>
            </div>
            <span className="text-white/50 text-xs">Codatta</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Knowledge Layer for <span style={{ color: '#f5a623' }}>AI</span>
          </h1>
          <p className="text-white/50 text-sm">Your Knowledge, Your Data Asset, Endless AI Royalties</p>
        </div>
      </div>

      {/* Task grid */}
      <div className="max-w-6xl mx-auto px-8">
        <h2 className="text-white font-bold text-base mb-4">Recent Frontiers</h2>

        <div className="grid grid-cols-1 gap-3 max-w-sm">
          {FRONTIERS.map(f => (
            <div
              key={f.id}
              onClick={() => f.id === 'food-science' && navigate('/task')}
              className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${f.highlight ? 'ring-1 ring-primary/50' : ''}`}
              style={{ aspectRatio: '4/3', background: f.bgColor }}>

              {/* Background image */}
              <img
                src={f.bg}
                alt={f.title}
                className="absolute inset-0 w-full h-full object-cover opacity-70"
                onError={e => { e.target.style.display = 'none'; }}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%)' }} />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-bold text-sm mb-1.5 leading-tight">{f.title}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AvatarStack />
                    <span className="text-white/60 text-[11px]">{f.participants}</span>
                  </div>
                  <StarRating count={f.stars} />
                </div>
              </div>

              {/* Highlight badge */}
              {f.highlight && (
                <div className="absolute top-2.5 right-2.5 bg-primary/80 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">
                  My Task
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
