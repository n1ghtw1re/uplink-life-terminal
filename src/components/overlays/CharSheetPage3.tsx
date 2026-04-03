// ============================================================
// src/components/overlays/CharSheetPage3.tsx
// ACHIEVEMENTS & BADGES
// ============================================================
import { useState } from 'react';
import { useOperator } from '@/hooks/useOperator';
import { applyThemeClass, normalizeTheme } from '@/lib/themes';

const mono = "'IBM Plex Mono', monospace";
const vt   = "'VT323', monospace";
const acc  = 'hsl(var(--accent))';
const dim  = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgS  = 'hsl(var(--bg-secondary))';

const MASTER_TITLES = [
  'Novice', 'Apprentice', 'Initiate', 'Adept', 'Specialist', 
  'Senior', 'Lead', 'Expert', 'Master', 'Principal', 
  'Elite', 'Exalted', 'Grandmaster',
];

const MOCK_ACHIEVEMENTS = [
  { id: 1, title: 'FIRST BLOOD', desc: 'Complete your first sprint goal.', date: '2026-03-20' },
  { id: 2, title: 'NIGHT OWL', desc: 'Log 5 sessions after midnight.', date: '2026-03-24' },
  { id: 3, title: 'JACKED IN', desc: 'Achieve a 7-day login streak.', date: '2026-03-28' },
  { id: 4, title: 'CODE MONKEY', desc: 'Log 10 hours in Wire / Coding.', date: '2026-04-01' },
  { id: 5, title: 'IRON WILL', desc: 'Maintain Grit habit for 14 days.', date: '2026-04-05' },
];

const THEMES = ['2077', 'DOS', 'AMBER'];

export default function CharSheetPage3() {
  const { data: operator } = useOperator();
  
  // Calculate earned titles
  const level = operator?.level || 0;
  const maxTitleIndex = Math.min(Math.floor(level / 5), MASTER_TITLES.length - 1);
  const earnedTitles = MASTER_TITLES.slice(0, maxTitleIndex + 1);

  const handleThemeChange = (themeName: string) => {
    const t = normalizeTheme(themeName);
    applyThemeClass(document.documentElement, t);
    localStorage.setItem('uplink-theme', t);
    window.dispatchEvent(new Event('theme-changed'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono, gap: 24, paddingRight: 4, overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${adim}`, paddingBottom: 16, display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ fontFamily: vt, fontSize: 32, color: acc, letterSpacing: 2 }}>ACHIEVEMENTS & BADGES</div>
        <div style={{ fontSize: 10, color: adim, letterSpacing: 1 }}>// OPERATOR MILESTONES AND UNLOCKS</div>
      </div>

      {/* Main Grid Area */}
      <div style={{ display: 'flex', gap: 24, paddingBottom: 24, flex: 1, minHeight: 0 }}>
        
        {/* Left Col: Titles, Achievements */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
          
          {/* Master Level Titles */}
          <div style={{ padding: 16, background: bgS, border: `1px solid ${adim}` }}>
            <div style={{ fontSize: 12, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 16 }}>// MASTER LEVEL TITLES EARNED</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {earnedTitles.map((title, i) => (
                <div key={title} style={{ 
                  padding: '6px 12px', background: 'rgba(255,176,0,0.1)', 
                  border: `1px solid ${acc}`, color: acc, fontSize: 10, 
                  letterSpacing: 1, boxShadow: i === earnedTitles.length - 1 ? '0 0 8px rgba(255,176,0,0.3)' : 'none'
                }}>
                  {title.toUpperCase()}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 9, color: dim }}>
              CURRENT LEVEL: {level} &nbsp;&nbsp; // &nbsp;&nbsp; NEXT TITLE UNLOCKS AT: LEVEL {(maxTitleIndex + 1) * 5}
            </div>
          </div>

          {/* Recent Achievements */}
          <div style={{ padding: 16, background: bgS, border: `1px solid ${adim}`, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ fontSize: 12, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 16 }}>// RECENT ACHIEVEMENTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 8, scrollbarWidth: 'none' }}>
              {MOCK_ACHIEVEMENTS.map(ach => (
                <div key={ach.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 12, borderBottom: `1px solid rgba(153,104,0,0.2)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: acc, fontSize: 14, fontFamily: vt, letterSpacing: 1 }}>{ach.title}</span>
                    <span style={{ color: adim, fontSize: 9 }}>{ach.date}</span>
                  </div>
                  <span style={{ color: dim, fontSize: 10 }}>{ach.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Themes, Badges */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
          
          {/* Themes Unlocked */}
          <div style={{ padding: 16, background: bgS, border: `1px solid ${adim}` }}>
            <div style={{ fontSize: 12, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 16 }}>// THEMES UNLOCKED</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {THEMES.map(t => (
                <button key={t} onClick={() => handleThemeChange(t)} style={{
                  padding: '6px 16px', background: 'transparent', border: `1px solid ${adim}`,
                  color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer', letterSpacing: 1, transition: 'all 150ms'
                }} onMouseEnter={e => { e.currentTarget.style.color = acc; e.currentTarget.style.borderColor = acc; }}
                   onMouseLeave={e => { e.currentTarget.style.color = dim; e.currentTarget.style.borderColor = adim; }}>
                  APPLY [{t}]
                </button>
              ))}
            </div>
          </div>

          {/* Badge Collection */}
          <div style={{ padding: 16, background: bgS, border: `1px solid ${adim}`, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ fontSize: 12, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 16 }}>// BADGE COLLECTION</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 100px)', gap: 16, overflowY: 'auto', paddingRight: 8, scrollbarWidth: 'none', alignContent: 'start' }}>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <div key={num} style={{ 
                  width: 100, height: 100, border: `1px solid ${adim}`, background: '#0a0a0a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
                 }}>
                  <img src={`/images/badges/badge${num}.jpeg`} alt={`Badge ${num}`} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'grayscale(20%) sepia(30%) hue-rotate(5deg)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.85)', padding: '6px', textAlign: 'center', fontSize: 10, color: acc, borderTop: `1px solid ${adim}`, fontFamily: vt, letterSpacing: 2 }}>
                    BADGE_0{num}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
