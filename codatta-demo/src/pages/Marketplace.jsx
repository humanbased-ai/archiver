import { useState } from 'react';
import { Link } from 'react-router-dom';

const listings = [
  {
    id: 'listing_882_42',
    title: 'Food-Science-Asset-42',
    dataset: 'Asian-Cuisine-Instruct-V4',
    category: 'Nutritional Analysis',
    contributor: '@chef_kenshiro',
    quality: 'S',
    price: '1,200 XNY',
    fractions: 85,
    buyers: 3,
    status: 'Listed',
    featured: true,
  },
  {
    id: 'listing_791_33',
    title: 'RobotArm-Pose-Asset-33',
    dataset: 'Robotics-Instruct-V2',
    category: 'Robotics / Pose Estimation',
    contributor: '@dev_akira',
    quality: 'A',
    price: '860 XNY',
    fractions: 60,
    buyers: 1,
    status: 'Listed',
    featured: false,
  },
  {
    id: 'listing_605_18',
    title: 'StreetSign-OCR-Asset-18',
    dataset: 'AutonomousDrive-V5',
    category: 'Autonomous Driving / OCR',
    contributor: '@road_data_lab',
    quality: 'B',
    price: '430 XNY',
    fractions: 40,
    buyers: 0,
    status: 'Listed',
    featured: false,
  },
];

export default function Marketplace() {
  const [selected, setSelected] = useState(null);

  return (
    <main className="pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-8">

        {/* Header */}
        <header className="mb-12">
          <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Data Economy</p>
          <h1 className="text-4xl font-bold font-headline tracking-tight mb-2">Marketplace</h1>
          <p className="text-on-surface/50 text-sm">Browse and acquire fractional data assets.</p>
        </header>

        {/* Stats row */}
        <div className="flex gap-4 mb-10 overflow-x-auto no-scrollbar">
          {[
            { label: 'Active Listings', value: '3' },
            { label: 'Total Volume', value: '2,490 XNY' },
            { label: 'Unique Assets', value: '3' },
            { label: 'Categories', value: '3' },
          ].map(s => (
            <div key={s.label} className="glass-panel px-5 py-3 rounded-xl flex items-center gap-4 shrink-0">
              <p className="text-xl font-bold font-headline text-primary">{s.value}</p>
              <p className="text-xs text-on-surface/40 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Listings */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(item => (
            <div key={item.id}
              onClick={() => setSelected(item)}
              className={`bg-surface-container-low border rounded-2xl p-5 cursor-pointer hover:border-primary/40 hover:scale-[1.02] transition-all duration-200 group
                ${item.featured ? 'border-primary/30 shadow-[0_0_24px_rgba(176,71,211,0.1)]' : 'border-outline-variant/20 hover:shadow-[0_0_16px_rgba(176,71,211,0.06)]'}`}>
              {item.featured && (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="material-symbols-outlined text-primary text-xs">star</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary">Featured</span>
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold font-headline text-sm mb-1">{item.title}</h3>
                  <p className="text-[10px] text-on-surface/40">{item.category}</p>
                </div>
                <span className="text-xs font-bold text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded-full">{item.quality}</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface/40">Dataset</span>
                  <span className="font-medium text-on-surface/70 truncate ml-2">{item.dataset}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface/40">Contributor</span>
                  <span className="font-mono text-primary">{item.contributor}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface/40">Fractions left</span>
                  <span className="font-bold">{item.fractions}%</span>
                </div>
              </div>

              {/* Fraction bar */}
              <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mb-4">
                <div className="h-full bg-primary rounded-full" style={{ width: `${100 - item.fractions}%` }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-headline text-primary">{item.price}</span>
                <button className="text-xs font-bold bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg group-hover:bg-primary group-hover:text-white transition-all">
                  Buy Fraction
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-8 w-full max-w-lg relative" style={{ boxShadow: '0 0 32px 0 rgba(208,188,255,0.07), 0 25px 50px rgba(0,0,0,0.55)' }}>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-on-surface/30 hover:text-on-surface">
              <span className="material-symbols-outlined">close</span>
            </button>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">{selected.category}</p>
            <h2 className="text-2xl font-bold font-headline mb-1">{selected.title}</h2>
            <p className="text-xs font-mono text-on-surface/30 mb-6">{selected.id}</p>

            <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 mb-6 space-y-3">
              {[
                ['Dataset', selected.dataset],
                ['Contributor', selected.contributor],
                ['Quality Grade', selected.quality],
                ['Available Fractions', `${selected.fractions}%`],
                ['Price per 1%', selected.price],
                ['Buyers so far', selected.buyers],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-on-surface/40">{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link to="/lineage"
                className="flex-1 py-3 border border-outline-variant/30 rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors text-center">
                View Data Lineage
              </Link>
              <button className="btn-gradient flex-1 py-3 text-white font-bold rounded-xl transition-all">
                Buy Fraction
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
