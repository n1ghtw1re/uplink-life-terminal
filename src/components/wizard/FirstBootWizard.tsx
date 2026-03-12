// ============================================================
// src/components/wizard/FirstBootWizard.tsx
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatKey, STAT_META, MASTER_LEVEL_THRESHOLDS, getMasterLevel, MasterLevel } from '@/types';

// ─── CONSTANTS ───────────────────────────────────────────────

const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

const STAT_LEVEL_XP: Record<number, number> = {
  0: 0,
  1: 0,
  2: 500,
  3: 1200,
  4: 2500,
  5: 4500,
  6: 7500,
  7: 12000,
  8: 18000,
  9: 26000,
  10: 36000,
};

const SLIDER_LABEL = (val: number) => {
  if (val === 0) return 'DORMANT';
  if (val <= 2) return 'BEGINNER';
  if (val <= 4) return 'DEVELOPING';
  if (val <= 6) return 'CAPABLE';
  if (val <= 8) return 'ADVANCED';
  return 'ELITE';
};

// Skill templates — compact form for wizard use
interface SkillTemplate {
  name: string;
  statKeys: StatKey[];
  defaultSplit: number[];
}

const SKILL_TEMPLATES: Record<StatKey, SkillTemplate[]> = {
  body: [
    { name: 'Weightlifting',       statKeys: ['body'],         defaultSplit: [100] },
    { name: 'Running',             statKeys: ['body'],         defaultSplit: [100] },
    { name: 'Cycling',             statKeys: ['body'],         defaultSplit: [100] },
    { name: 'Swimming',            statKeys: ['body'],         defaultSplit: [100] },
    { name: 'Martial Arts',        statKeys: ['body','grit'],  defaultSplit: [60,40] },
    { name: 'Yoga',                statKeys: ['body','ghost'], defaultSplit: [50,50] },
    { name: 'Hiking / Walking',    statKeys: ['body','ghost'], defaultSplit: [70,30] },
    { name: 'Team Sport',          statKeys: ['body','cool'],  defaultSplit: [70,30] },
    { name: 'Mobility / Stretching', statKeys: ['body'],       defaultSplit: [100] },
    { name: 'Nutrition',           statKeys: ['body','grit'],  defaultSplit: [50,50] },
    { name: 'Sleep',               statKeys: ['body','grit'],  defaultSplit: [60,40] },
    { name: 'Cold Exposure',       statKeys: ['body','grit'],  defaultSplit: [40,60] },
  ],
  wire: [
    { name: 'Coding / Programming',  statKeys: ['wire'],         defaultSplit: [100] },
    { name: 'Web Development',       statKeys: ['wire'],         defaultSplit: [100] },
    { name: 'Data & Spreadsheets',   statKeys: ['wire','mind'],  defaultSplit: [60,40] },
    { name: 'Home IT / Networking',  statKeys: ['wire'],         defaultSplit: [100] },
    { name: 'Photography',           statKeys: ['wire','flow'],  defaultSplit: [50,50] },
    { name: 'Video Editing',         statKeys: ['wire','flow'],  defaultSplit: [50,50] },
    { name: 'Gaming',                statKeys: ['wire','mind'],  defaultSplit: [60,40] },
    { name: '3D Printing / CAD',     statKeys: ['wire','flow'],  defaultSplit: [60,40] },
    { name: 'Smart Home / DIY Tech', statKeys: ['wire'],         defaultSplit: [100] },
    { name: 'Productivity Tools',    statKeys: ['wire','grit'],  defaultSplit: [50,50] },
  ],
  mind: [
    { name: 'Reading (Non-fiction)',    statKeys: ['mind'],         defaultSplit: [100] },
    { name: 'Reading (Fiction)',        statKeys: ['mind','ghost'], defaultSplit: [70,30] },
    { name: 'Online Course',            statKeys: ['mind'],         defaultSplit: [100] },
    { name: 'Language Learning',        statKeys: ['mind','cool'],  defaultSplit: [70,30] },
    { name: 'Studying / Research',      statKeys: ['mind'],         defaultSplit: [100] },
    { name: 'Podcasts / Audio',         statKeys: ['mind'],         defaultSplit: [100] },
    { name: 'Writing (Academic)',       statKeys: ['mind','flow'],  defaultSplit: [60,40] },
    { name: 'Mathematics',              statKeys: ['mind'],         defaultSplit: [100] },
    { name: 'History / Philosophy',     statKeys: ['mind','ghost'], defaultSplit: [70,30] },
    { name: 'Watching (Educational)',   statKeys: ['mind'],         defaultSplit: [100] },
  ],
  cool: [
    { name: 'Networking',              statKeys: ['cool'],         defaultSplit: [100] },
    { name: 'Public Speaking',         statKeys: ['cool','grit'],  defaultSplit: [60,40] },
    { name: 'Job Applications',        statKeys: ['cool','grit'],  defaultSplit: [50,50] },
    { name: 'Interview Prep',          statKeys: ['cool','mind'],  defaultSplit: [60,40] },
    { name: 'Professional Development',statKeys: ['cool','mind'],  defaultSplit: [50,50] },
    { name: 'Social Media / Brand',    statKeys: ['cool','flow'],  defaultSplit: [60,40] },
    { name: 'Mentoring / Coaching',    statKeys: ['cool','grit'],  defaultSplit: [50,50] },
    { name: 'Volunteering',            statKeys: ['cool','grit'],  defaultSplit: [50,50] },
    { name: 'Sales / Client Work',     statKeys: ['cool'],         defaultSplit: [100] },
    { name: 'Negotiation',             statKeys: ['cool','grit'],  defaultSplit: [60,40] },
  ],
  grit: [
    { name: 'Morning Routine',         statKeys: ['grit'],         defaultSplit: [100] },
    { name: 'Evening Routine',         statKeys: ['grit'],         defaultSplit: [100] },
    { name: 'Journaling',              statKeys: ['grit','ghost'], defaultSplit: [50,50] },
    { name: 'Therapy / Counselling',   statKeys: ['grit','ghost'], defaultSplit: [50,50] },
    { name: 'Budgeting / Finance',     statKeys: ['grit','mind'],  defaultSplit: [60,40] },
    { name: 'Cleaning / Organisation', statKeys: ['grit'],         defaultSplit: [100] },
    { name: 'Digital Detox',           statKeys: ['grit','ghost'], defaultSplit: [50,50] },
    { name: 'Meal Prep',               statKeys: ['grit','body'],  defaultSplit: [60,40] },
    { name: 'Time Blocking',           statKeys: ['grit','mind'],  defaultSplit: [60,40] },
    { name: 'Quitting a Habit',        statKeys: ['grit'],         defaultSplit: [100] },
  ],
  flow: [
    { name: 'Playing Music',           statKeys: ['flow'],         defaultSplit: [100] },
    { name: 'Singing',                 statKeys: ['flow','cool'],  defaultSplit: [70,30] },
    { name: 'Drawing / Illustration',  statKeys: ['flow'],         defaultSplit: [100] },
    { name: 'Painting',                statKeys: ['flow'],         defaultSplit: [100] },
    { name: 'Creative Writing',        statKeys: ['flow','mind'],  defaultSplit: [60,40] },
    { name: 'Crafts / Making',         statKeys: ['flow'],         defaultSplit: [100] },
    { name: 'Cooking / Baking',        statKeys: ['flow','body'],  defaultSplit: [70,30] },
    { name: 'Dancing',                 statKeys: ['flow','body'],  defaultSplit: [60,40] },
    { name: 'DIY / Home Projects',     statKeys: ['flow','grit'],  defaultSplit: [50,50] },
    { name: 'Gardening',               statKeys: ['flow','ghost'], defaultSplit: [60,40] },
  ],
  ghost: [
    { name: 'Meditation',              statKeys: ['ghost'],        defaultSplit: [100] },
    { name: 'Breathwork',              statKeys: ['ghost','body'], defaultSplit: [60,40] },
    { name: 'Prayer / Spiritual',      statKeys: ['ghost'],        defaultSplit: [100] },
    { name: 'Nature / Outdoor Time',   statKeys: ['ghost','body'], defaultSplit: [60,40] },
    { name: 'Gratitude Practice',      statKeys: ['ghost','grit'], defaultSplit: [60,40] },
    { name: 'Rest / Doing Nothing',    statKeys: ['ghost'],        defaultSplit: [100] },
    { name: 'Self-Reflection',         statKeys: ['ghost','grit'], defaultSplit: [60,40] },
    { name: 'Contemplative Reading',   statKeys: ['ghost','mind'], defaultSplit: [60,40] },
    { name: 'Time in Silence',         statKeys: ['ghost'],        defaultSplit: [100] },
    { name: 'Mindful Eating',          statKeys: ['ghost','body'], defaultSplit: [50,50] },
  ],
};

const SUGGESTED_HABITS = [
  { name: 'Morning routine',      xp: 20 },
  { name: 'Journal entry',        xp: 15 },
  { name: 'Meditation (10 min)',  xp: 15 },
  { name: 'Read before bed',      xp: 15 },
  { name: 'Drink 8 glasses water',xp: 10 },
  { name: 'Make the bed',         xp: 10 },
  { name: 'Take vitamins',        xp: 10 },
  { name: 'No social media AM',   xp: 20 },
];

// ─── BOOT ANIMATION ──────────────────────────────────────────

const BOOT_LINES = [
  'UPLINK // N1GHTW1RE COLLECTIVE',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  'INITIALISING SYSTEM.....................OK',
  'LOADING CORE MODULES....................OK',
  'MOUNTING STAT ENGINE....................OK',
  'CALIBRATING XP THRESHOLDS...............OK',
  'ESTABLISHING SECURE CONNECTION...........OK',
  '',
  'NO OPERATOR PROFILE DETECTED.',
  '',
  '> INITIATING FIRST BOOT SEQUENCE...',
  '> PREPARE YOUR CALLSIGN.',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
];

const BootAnimation = ({ onDone }: { onDone: () => void }) => {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setVisibleLines(prev => [...prev, BOOT_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          setTimeout(onDone, 400);
        }, 600);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'hsl(var(--bg-primary))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: done ? 0 : 1,
      transition: 'opacity 400ms ease',
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13,
        color: 'hsl(var(--accent))',
        textShadow: '0 0 8px rgba(255,176,0,0.6)',
        maxWidth: 500,
        width: '100%',
        padding: '0 32px',
      }}>
        {visibleLines.map((line, i) => (
            <div key={i} style={{
            lineHeight: '1.6',
            color: (line && line.startsWith('>')) ? 'hsl(var(--accent-bright))' : 'hsl(var(--accent))',
        }}>
        {line || '\u00a0'}
  </div>
))}
        {visibleLines.length < BOOT_LINES.length && (
          <span className="cursor" style={{ display: 'inline-block' }} />
        )}
      </div>
    </div>
  );
};

// ─── PROGRESS BAR ─────────────────────────────────────────────

const WizardProgressBar = ({ step, total }: { step: number; total: number }) => (
  <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        flex: 1, height: 3,
        background: i < step ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))',
        boxShadow: i < step ? '0 0 6px rgba(255,176,0,0.5)' : 'none',
        transition: 'all 300ms ease',
      }} />
    ))}
  </div>
);

// ─── STEP WRAPPER ─────────────────────────────────────────────

const StepWrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    width: '100%',
    animation: 'fadeIn 200ms ease',
  }}>
    {children}
  </div>
);

const StepTitle = ({ step, title }: { step: number; title: string }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>
      // STEP {step} OF 6
    </div>
    <div style={{
      fontFamily: "'VT323', monospace",
      fontSize: 22,
      color: 'hsl(var(--accent-bright))',
      textShadow: '0 0 10px rgba(255,176,0,0.5)',
    }}>
      {title}
    </div>
  </div>
);

const Divider = () => (
  <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '16px 0', opacity: 0.4 }} />
);

// ─── NAV BUTTONS ──────────────────────────────────────────────

const NavButtons = ({
  onBack, onNext, onSkip,
  nextLabel = 'NEXT >>',
  nextDisabled = false,
  showBack = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
    {showBack && onBack && (
      <button className="topbar-btn" style={{ color: 'hsl(var(--text-dim))' }} onClick={onBack}>
        &lt;&lt; BACK
      </button>
    )}
    {onSkip && (
      <button className="topbar-btn" style={{ color: 'hsl(var(--text-dim))' }} onClick={onSkip}>
        SKIP
      </button>
    )}
    <button
      className="topbar-btn"
      style={{ opacity: nextDisabled ? 0.4 : 1 }}
      disabled={nextDisabled}
      onClick={onNext}
    >
      {nextLabel}
    </button>
  </div>
);

// ─── STEP 1 — IDENTITY ────────────────────────────────────────

interface Step1Data {
  callsign: string;
  displayName: string;
  birthdate: string;
  theme: string;
}

const Step1 = ({ data, onChange, onNext, onSkip }: {
  data: Step1Data;
  onChange: (d: Step1Data) => void;
  onNext: () => void;
  onSkip: () => void;
}) => {
  const callsignRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => callsignRef.current?.focus(), 100);
  }, []);

  return (
    <StepWrap>
      <StepTitle step={1} title="OPERATOR IDENTITY" />
      <div style={{ color: 'hsl(var(--text-dim))', fontSize: 11, marginBottom: 20, lineHeight: 1.7 }}>
        Every operator needs a callsign. This is how the system knows you.<br />
        It doesn't have to be your real name.
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
            CALLSIGN <span style={{ color: 'hsl(var(--accent))' }}>*required</span>
          </div>
          <input
            ref={callsignRef}
            className="crt-input"
            style={{ width: '100%', maxWidth: 320 }}
            placeholder="VOID_SIGNAL"
            value={data.callsign}
            maxLength={24}
            onChange={e => onChange({ ...data, callsign: e.target.value.toUpperCase().replace(/\s/g, '_') })}
          />
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginTop: 3 }}>
            max 24 chars — spaces become underscores
          </div>
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
            DISPLAY NAME <span style={{ color: 'hsl(var(--text-dim))' }}>(optional)</span>
          </div>
          <input
            className="crt-input"
            style={{ width: '100%', maxWidth: 320 }}
            placeholder="shown on character sheet"
            value={data.displayName}
            maxLength={40}
            onChange={e => onChange({ ...data, displayName: e.target.value })}
          />
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
            BIRTHDATE <span style={{ color: 'hsl(var(--text-dim))' }}>(optional)</span>
          </div>
          <input
            className="crt-input"
            style={{ width: 200 }}
            type="date"
            value={data.birthdate}
            onChange={e => onChange({ ...data, birthdate: e.target.value })}
          />
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginTop: 3 }}>
            used for birthday notifications — never shared
          </div>
        </div>

        <Divider />

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 10, letterSpacing: 1 }}>
            SELECT TERMINAL THEME
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { id: 'AMBER', label: 'AMBER-TTY',    available: true,  desc: 'classic phosphor' },
              { id: 'GRN',   label: 'GRN-PHOSPHOR', available: false, desc: 'unlocks LVL 3' },
              { id: 'DOS',   label: 'DOS-CLASSIC',  available: false, desc: 'unlocks LVL 5' },
            ].map(t => (
              <div
                key={t.id}
                onClick={() => t.available && onChange({ ...data, theme: t.id })}
                style={{
                  border: `1px solid ${data.theme === t.id ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                  padding: '8px 14px',
                  cursor: t.available ? 'pointer' : 'not-allowed',
                  opacity: t.available ? 1 : 0.4,
                  boxShadow: data.theme === t.id ? '0 0 8px rgba(255,176,0,0.3)' : 'none',
                  transition: 'all 150ms ease',
                  minWidth: 140,
                }}
              >
                <div style={{ fontSize: 11, color: data.theme === t.id ? 'hsl(var(--accent-bright))' : 'hsl(var(--accent))' }}>
                  {data.theme === t.id ? '(●) ' : '( ) '}{t.label}
                </div>
                <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 2 }}>{t.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginTop: 8 }}>
            More themes unlock as you level up.
          </div>
        </div>
      </div>

      <NavButtons
        showBack={false}
        onNext={onNext}
        onSkip={onSkip}
        nextDisabled={data.callsign.trim().length === 0}
        nextLabel="NEXT >>"
      />
    </StepWrap>
  );
};

// ─── STEP 2 — STAT CALIBRATION ───────────────────────────────

type StatSliders = Record<StatKey, number>;

const Step2 = ({ sliders, onChange, onBack, onNext, onSkip }: {
  sliders: StatSliders;
  onChange: (s: StatSliders) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) => {
  // Calculate live preview
  const totalStatXp = STAT_KEYS.reduce((sum, k) => sum + STAT_LEVEL_XP[sliders[k]], 0);
  const masterXp = Math.floor(totalStatXp * 0.30);
  const master = getMasterLevel(masterXp);

  return (
    <StepWrap>
      <StepTitle step={2} title="STAT CALIBRATION" />
      <div style={{ color: 'hsl(var(--text-dim))', fontSize: 11, marginBottom: 20, lineHeight: 1.7 }}>
        Rate your current real-world level in each area. Answer honestly —<br />
        this is your baseline, not a judgement. Set any stat to 0 to mark it DORMANT.
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {STAT_KEYS.map(key => {
          const meta = STAT_META[key];
          const val = sliders[key];
          const label = SLIDER_LABEL(val);
          const isDormant = val === 0;
          return (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{
                  fontSize: 13,
                  color: isDormant ? 'hsl(var(--text-dim))' : 'hsl(var(--accent))',
                  width: 20, textAlign: 'center',
                }}>
                  {meta.icon}
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: isDormant ? 'hsl(var(--text-dim))' : 'hsl(var(--accent))',
                  width: 60,
                }}>
                  {meta.name}
                </span>
                <span style={{
                  fontSize: 9,
                  color: 'hsl(var(--text-dim))',
                  flex: 1,
                }}>
                  {meta.domain}
                </span>
                <span style={{
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: isDormant ? 'hsl(var(--text-dim))' : 'hsl(var(--accent-bright))',
                  width: 80, textAlign: 'right',
                }}>
                  {label}
                  {!isDormant && <span style={{ color: 'hsl(var(--text-dim))', marginLeft: 6 }}>LVL {val}</span>}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 8, color: 'hsl(var(--text-dim))', width: 50 }}>DORMANT</span>
                <input
                  type="range"
                  className="ql-split-slider"
                  min={0} max={10} step={1}
                  value={val}
                  onChange={e => onChange({ ...sliders, [key]: Number(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 8, color: 'hsl(var(--text-dim))', width: 30 }}>ELITE</span>
              </div>
            </div>
          );
        })}
      </div>

      <Divider />

      <div style={{
        background: 'hsl(var(--bg-secondary))',
        border: '1px solid hsl(var(--accent-dim))',
        padding: '12px 16px',
        fontSize: 11,
      }}>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>
          ── ESTIMATED STARTING PROFILE ──────────────────────
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: 'hsl(var(--text-dim))' }}>MASTER LEVEL: </span>
            <span style={{ color: 'hsl(var(--accent-bright))' }}>
              {master.level} // {master.title}
            </span>
          </div>
          <div>
            <span style={{ color: 'hsl(var(--text-dim))' }}>LEGACY XP SEED: </span>
            <span style={{ color: 'hsl(var(--accent-bright))' }}>~{masterXp.toLocaleString()} XP</span>
          </div>
        </div>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginTop: 8 }}>
          This XP represents your history before UPLINK. Adjust until it feels right.
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} onSkip={onSkip} />
    </StepWrap>
  );
};

// ─── STEP 3 — SKILLS SETUP ───────────────────────────────────

interface SelectedSkill {
  name: string;
  statKeys: StatKey[];
  defaultSplit: number[];
  custom?: boolean;
}

const Step3 = ({ selected, onToggle, onAddCustom, onBack, onNext, onSkip }: {
  selected: SelectedSkill[];
  onToggle: (skill: SkillTemplate, stat: StatKey) => void;
  onAddCustom: (skill: SelectedSkill) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) => {
  const [expandedStat, setExpandedStat] = useState<StatKey | null>('body');
  const [customName, setCustomName] = useState('');
  const [customStat, setCustomStat] = useState<StatKey>('body');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const isSelected = (name: string) => selected.some(s => s.name === name);

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    onAddCustom({ name: customName.trim(), statKeys: [customStat], defaultSplit: [100], custom: true });
    setCustomName('');
    setShowCustomForm(false);
  };

  return (
    <StepWrap>
      <StepTitle step={3} title="SKILLS SETUP" />
      <div style={{ color: 'hsl(var(--text-dim))', fontSize: 11, marginBottom: 16, lineHeight: 1.7 }}>
        Add your first skills — the specific practices you want to track.<br />
        Select from templates or add custom ones. You can always add more later.
      </div>

      <div style={{
        color: 'hsl(var(--accent))', fontSize: 10, marginBottom: 12,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {selected.length} SKILL{selected.length !== 1 ? 'S' : ''} SELECTED
      </div>

      <div style={{ display: 'grid', gap: 4, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
        {STAT_KEYS.map(statKey => {
          const meta = STAT_META[statKey];
          const isOpen = expandedStat === statKey;
          const templates = SKILL_TEMPLATES[statKey];
          const selectedCount = templates.filter(t => isSelected(t.name)).length;

          return (
            <div key={statKey} style={{
              border: '1px solid hsl(var(--accent-dim))',
              background: 'hsl(var(--bg-secondary))',
            }}>
              <div
                onClick={() => setExpandedStat(isOpen ? null : statKey)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', cursor: 'pointer',
                  borderBottom: isOpen ? '1px solid hsl(var(--accent-dim))' : 'none',
                }}
              >
                <span style={{ color: 'hsl(var(--accent))', fontSize: 12 }}>{meta.icon}</span>
                <span style={{ color: 'hsl(var(--accent))', fontSize: 11, flex: 1 }}>{meta.name}</span>
                {selectedCount > 0 && (
                  <span style={{
                    background: 'hsl(var(--accent))', color: 'hsl(var(--bg-primary))',
                    fontSize: 9, padding: '1px 6px',
                  }}>
                    {selectedCount}
                  </span>
                )}
                <span style={{ color: 'hsl(var(--text-dim))', fontSize: 10 }}>
                  {isOpen ? '▾' : '›'}
                </span>
              </div>

              {isOpen && (
                <div style={{ padding: '8px 12px', display: 'grid', gap: 4 }}>
                  {templates.map(template => {
                    const sel = isSelected(template.name);
                    return (
                      <div
                        key={template.name}
                        onClick={() => onToggle(template, statKey)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 8px', cursor: 'pointer',
                          background: sel ? 'rgba(255,176,0,0.08)' : 'transparent',
                          border: `1px solid ${sel ? 'hsl(var(--accent-dim))' : 'transparent'}`,
                          transition: 'all 100ms ease',
                        }}
                      >
                        <span style={{
                          width: 14, height: 14,
                          border: `1px solid ${sel ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color: 'hsl(var(--accent))',
                          flexShrink: 0,
                        }}>
                          {sel ? '×' : ''}
                        </span>
                        <span style={{ fontSize: 10, color: sel ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))', flex: 1 }}>
                          {template.name}
                        </span>
                        <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>
                          {template.statKeys.map(k => k.toUpperCase()).join(' / ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Divider />

      {/* Custom skill */}
      {!showCustomForm ? (
        <button
          className="topbar-btn"
          style={{ color: 'hsl(var(--text-dim))' }}
          onClick={() => setShowCustomForm(true)}
        >
          + ADD CUSTOM SKILL
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginBottom: 4 }}>SKILL NAME</div>
            <input
              className="crt-input"
              style={{ width: 200 }}
              placeholder="e.g. Skateboarding"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              autoFocus
            />
          </div>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginBottom: 4 }}>STAT</div>
            <div className="crt-select-wrapper">
              <select className="crt-select" value={customStat} onChange={e => setCustomStat(e.target.value as StatKey)}>
                {STAT_KEYS.map(k => (
                  <option key={k} value={k}>{STAT_META[k].name}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="topbar-btn" onClick={handleAddCustom} disabled={!customName.trim()}>
            + ADD
          </button>
          <button
            className="topbar-btn"
            style={{ color: 'hsl(var(--text-dim))' }}
            onClick={() => { setShowCustomForm(false); setCustomName(''); }}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* Custom skills added */}
      {selected.filter(s => s.custom).length > 0 && (
        <div style={{ marginTop: 8 }}>
          {selected.filter(s => s.custom).map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 10, color: 'hsl(var(--accent))', marginBottom: 2,
            }}>
              <span style={{ color: 'hsl(var(--text-dim))' }}>+</span>
              {s.name}
              <span style={{ color: 'hsl(var(--text-dim))' }}>{s.statKeys[0].toUpperCase()} [CUSTOM]</span>
            </div>
          ))}
        </div>
      )}

      <NavButtons onBack={onBack} onNext={onNext} onSkip={onSkip} />
    </StepWrap>
  );
};

// ─── STEP 4 — LIFEPATH ───────────────────────────────────────

interface LifepathData {
  origin: string;
  personalCode: string;
  rootAccess: string;
}

const Step4 = ({ data, onChange, onBack, onNext, onSkip }: {
  data: LifepathData;
  onChange: (d: LifepathData) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) => (
  <StepWrap>
    <StepTitle step={4} title="LIFEPATH SNAPSHOT" />
    <div style={{ color: 'hsl(var(--text-dim))', fontSize: 11, marginBottom: 20, lineHeight: 1.7 }}>
      Three optional questions. Your answers live in your private operator dossier.<br />
      Never public. Skip anything you're not ready to answer.
    </div>

    <div style={{ display: 'grid', gap: 16 }}>
      {[
        {
          key: 'origin' as const,
          label: 'WHERE DO YOU COME FROM?',
          hint: 'Background, cultural origin, how you got here.',
          placeholder: 'e.g. Self-taught dev from a small town...',
        },
        {
          key: 'personalCode' as const,
          label: 'WHAT DO YOU LIVE BY?',
          hint: 'A principle, a rule, a line you won\'t cross.',
          placeholder: 'e.g. Ship things. Perfect is the enemy of done.',
        },
        {
          key: 'rootAccess' as const,
          label: 'WHAT DOES ROOT ACCESS MEAN TO YOU?',
          hint: 'What would it look like to have full control of your life?',
          placeholder: 'e.g. No alarm clock. Working on my own terms...',
        },
      ].map(q => (
        <div key={q.key}>
          <div style={{ color: 'hsl(var(--accent))', fontSize: 10, marginBottom: 3, letterSpacing: 1 }}>
            {q.label}
          </div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginBottom: 6 }}>{q.hint}</div>
          <textarea
            className="crt-input"
            style={{ width: '100%', minHeight: 60, resize: 'vertical', fontFamily: "'IBM Plex Mono', monospace" }}
            placeholder={q.placeholder}
            value={data[q.key]}
            onChange={e => onChange({ ...data, [q.key]: e.target.value })}
            maxLength={500}
          />
        </div>
      ))}
    </div>

    <NavButtons onBack={onBack} onNext={onNext} onSkip={onSkip} />
  </StepWrap>
);

// ─── STEP 5 — HABITS ─────────────────────────────────────────

const Step5 = ({ selected, onToggle, onAddCustom, onBack, onNext, onSkip }: {
  selected: string[];
  onToggle: (name: string) => void;
  onAddCustom: (name: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) => {
  const [customName, setCustomName] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleAdd = () => {
    if (!customName.trim()) return;
    onAddCustom(customName.trim());
    setCustomName('');
    setShowCustom(false);
  };

  return (
    <StepWrap>
      <StepTitle step={5} title="FIRST HABITS" />
      <div style={{ color: 'hsl(var(--text-dim))', fontSize: 11, marginBottom: 16, lineHeight: 1.7 }}>
        Habits are daily behaviours that build GRIT. Add 1–3 to start.<br />
        Starting small is better than starting ambitious.
      </div>

      <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
        {SUGGESTED_HABITS.map(h => {
          const sel = selected.includes(h.name);
          return (
            <div
              key={h.name}
              onClick={() => onToggle(h.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', cursor: 'pointer',
                background: sel ? 'rgba(255,176,0,0.08)' : 'hsl(var(--bg-secondary))',
                border: `1px solid ${sel ? 'hsl(var(--accent-dim))' : 'transparent'}`,
                transition: 'all 100ms ease',
              }}
            >
              <span style={{
                width: 14, height: 14,
                border: `1px solid ${sel ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: 'hsl(var(--accent))', flexShrink: 0,
              }}>
                {sel ? '×' : ''}
              </span>
              <span style={{ fontSize: 11, color: sel ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))', flex: 1 }}>
                {h.name}
              </span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>+{h.xp} XP/day</span>
            </div>
          );
        })}
      </div>

      {!showCustom ? (
        <button
          className="topbar-btn"
          style={{ color: 'hsl(var(--text-dim))' }}
          onClick={() => setShowCustom(true)}
        >
          + ADD CUSTOM HABIT
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginBottom: 4 }}>HABIT NAME</div>
            <input
              className="crt-input"
              style={{ width: 240 }}
              placeholder="e.g. Evening walk"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <button className="topbar-btn" onClick={handleAdd} disabled={!customName.trim()}>+ ADD</button>
          <button
            className="topbar-btn"
            style={{ color: 'hsl(var(--text-dim))' }}
            onClick={() => { setShowCustom(false); setCustomName(''); }}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* Custom habits added */}
      {selected.filter(n => !SUGGESTED_HABITS.find(h => h.name === n)).map(name => (
        <div key={name} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 10, color: 'hsl(var(--accent))', marginTop: 4,
        }}>
          <span style={{ color: 'hsl(var(--text-dim))' }}>+</span>
          {name}
          <span style={{ color: 'hsl(var(--text-dim))' }}>[CUSTOM]</span>
          <span
            style={{ color: 'hsl(var(--text-dim))', cursor: 'pointer', marginLeft: 'auto' }}
            onClick={() => onToggle(name)}
          >
            ×
          </span>
        </div>
      ))}

      <NavButtons onBack={onBack} onNext={onNext} onSkip={onSkip} />
    </StepWrap>
  );
};

// ─── STEP 6 — LAUNCH PREVIEW ─────────────────────────────────

const Step6 = ({ wizardData, onBack, onLaunch, launching }: {
  wizardData: WizardData;
  onBack: () => void;
  onLaunch: () => void;
  launching: boolean;
}) => {
  const { identity, sliders, skills, habits } = wizardData;
  const totalStatXp = STAT_KEYS.reduce((sum, k) => sum + STAT_LEVEL_XP[sliders[k]], 0);
  const masterXp = Math.floor(totalStatXp * 0.30);
  const master = getMasterLevel(masterXp);
  const activeStats = STAT_KEYS.filter(k => sliders[k] > 0);
  const isMinimal = skills.length === 0 && habits.length === 0 && !identity.callsign;

  return (
    <StepWrap>
      <StepTitle step={6} title="OPERATOR PROFILE PREVIEW" />
      <div style={{ color: 'hsl(var(--text-dim))', fontSize: 11, marginBottom: 20 }}>
        Review your starting profile before going online.
      </div>

      <div style={{
        background: 'hsl(var(--bg-secondary))',
        border: '1px solid hsl(var(--accent-dim))',
        padding: '16px 20px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        lineHeight: 2,
      }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <span style={{ color: 'hsl(var(--text-dim))' }}>CALLSIGN: </span>
            <span style={{ color: 'hsl(var(--accent-bright))' }}>{identity.callsign || '[NOT SET]'}</span>
          </div>
          <div>
            <span style={{ color: 'hsl(var(--text-dim))' }}>THEME: </span>
            <span style={{ color: 'hsl(var(--accent))' }}>{identity.theme}-TTY</span>
          </div>
          <div>
            <span style={{ color: 'hsl(var(--text-dim))' }}>LEVEL: </span>
            <span style={{ color: 'hsl(var(--accent-bright))' }}>LVL {master.level} // {master.title}</span>
          </div>
          <div>
            <span style={{ color: 'hsl(var(--text-dim))' }}>LEGACY XP: </span>
            <span style={{ color: 'hsl(var(--accent))' }}>~{masterXp.toLocaleString()} XP</span>
          </div>
        </div>

        <Divider />

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>STATS</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {STAT_KEYS.map(key => {
              const meta = STAT_META[key];
              const lvl = sliders[key];
              const dormant = lvl === 0;
              const pct = dormant ? 0 : Math.round((lvl / 10) * 100);
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: dormant ? 'hsl(var(--text-dim))' : 'hsl(var(--accent))', width: 16 }}>{meta.icon}</span>
                  <span style={{ color: dormant ? 'hsl(var(--text-dim))' : 'hsl(var(--accent))', width: 50, fontSize: 10 }}>{meta.name}</span>
                  {dormant ? (
                    <span style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>DORMANT</span>
                  ) : (
                    <>
                      <span style={{ color: 'hsl(var(--text-dim))', fontSize: 9, width: 40 }}>LVL {lvl}</span>
                      <div style={{ flex: 1, height: 4, background: '#261600', border: '1px solid hsl(var(--accent-dim))' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'hsl(var(--accent))', boxShadow: '0 0 4px rgba(255,176,0,0.5)' }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Divider />

        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: 'hsl(var(--text-dim))' }}>ACTIVE SKILLS: </span>
            <span style={{ color: 'hsl(var(--accent))' }}>{skills.length}</span>
          </div>
          <div>
            <span style={{ color: 'hsl(var(--text-dim))' }}>ACTIVE HABITS: </span>
            <span style={{ color: 'hsl(var(--accent))' }}>{habits.length}</span>
          </div>
        </div>

        {isMinimal && (
          <>
            <Divider />
            <div style={{ color: 'hsl(var(--accent-bright))', fontSize: 10 }}>
              &gt; WARNING: MINIMAL PROFILE DETECTED<br />
              <span style={{ color: 'hsl(var(--text-dim))' }}>
                Your character sheet will be mostly empty. You can fill it in from the dashboard at any time.
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
        <button className="topbar-btn" style={{ color: 'hsl(var(--text-dim))' }} onClick={onBack}>
          &lt;&lt; BACK
        </button>
        <button
          className="topbar-btn"
          onClick={onLaunch}
          disabled={launching || !identity.callsign}
          style={{ opacity: (!identity.callsign || launching) ? 0.4 : 1 }}
        >
          {launching ? '>> BOOTING...' : '>> BOOT UPLINK'}
        </button>
      </div>
    </StepWrap>
  );
};

// ─── LAUNCH ANIMATION ─────────────────────────────────────────

const LAUNCH_LINES = [
  'SAVING OPERATOR PROFILE................OK',
  'SEEDING LEGACY XP......................OK',
  'CALIBRATING STAT LEVELS................OK',
  'GENERATING CLASS AFFINITY..............OK',
  'MOUNTING WIDGET GRID...................OK',
  '',
];

const LaunchAnimation = ({ callsign, onDone }: { callsign: string; onDone: () => void }) => {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < LAUNCH_LINES.length) {
        setVisibleLines(prev => [...prev, LAUNCH_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
        setShowWelcome(true);
        setTimeout(onDone, 2000);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'hsl(var(--bg-primary))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13,
        color: 'hsl(var(--accent))',
        textShadow: '0 0 8px rgba(255,176,0,0.6)',
        maxWidth: 500,
        width: '100%',
        padding: '0 32px',
      }}>
        {visibleLines.map((line, i) => (
          <div key={i} style={{ lineHeight: '1.8', color: 'hsl(var(--accent))' }}>
            {line || '\u00a0'}
          </div>
        ))}
        {showWelcome && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: 'hsl(var(--accent-bright))', lineHeight: 2 }}>
              &gt; WELCOME, {callsign}.<br />
              &gt; YOUR UPLINK IS ONLINE.<br />
              &gt; SYSTEM READY.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── WIZARD DATA ──────────────────────────────────────────────

interface WizardData {
  identity: Step1Data;
  sliders: StatSliders;
  skills: SelectedSkill[];
  lifepath: LifepathData;
  habits: string[];
}

// ─── MAIN WIZARD ─────────────────────────────────────────────

interface FirstBootWizardProps {
  onComplete: () => void;
}

const FirstBootWizard = ({ onComplete }: FirstBootWizardProps) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<'boot' | 'wizard' | 'launching' | 'done'>('boot');
  const [step, setStep] = useState(1);

  const [wizardData, setWizardData] = useState<WizardData>({
    identity: { callsign: '', displayName: '', birthdate: '', theme: 'AMBER' },
    sliders: { body: 0, wire: 0, mind: 0, cool: 0, grit: 0, flow: 0, ghost: 0 },
    skills: [],
    lifepath: { origin: '', personalCode: '', rootAccess: '' },
    habits: [],
  });

  const [launching, setLaunching] = useState(false);

  const handleSkipAll = async () => {
    // If callsign not set, can't skip entirely — go to step 1
    if (!wizardData.identity.callsign) {
      setStep(1);
      return;
    }
    await launchUplink();
  };

  const launchUplink = async () => {
    if (!user) return;
    setLaunching(true);

    try {
      const { identity, sliders, skills, lifepath, habits } = wizardData;

      // 1. Update profile
      await supabase.from('profiles').update({
        callsign: identity.callsign || 'OPERATOR',
        display_name: identity.displayName || null,
        birthdate: identity.birthdate || null,
        theme: identity.theme.toLowerCase(),
        bootstrap_complete: true,
      }).eq('id', user.id);

      // 2. Seed stat XP for each non-dormant stat
      for (const statKey of STAT_KEYS) {
        const level = sliders[statKey];
        if (level === 0) continue;
        const xpAmount = STAT_LEVEL_XP[level];
        if (xpAmount === 0) continue;

        await supabase.from('stats')
          .update({ xp: xpAmount, level, dormant: false })
          .eq('user_id', user.id)
          .eq('stat_key', statKey);

        await supabase.from('xp_log').insert({
          user_id: user.id,
          source: 'legacy',
          tier: 'stat',
          amount: xpAmount,
          base_amount: xpAmount,
          multiplier: 1.0,
          stat_key: statKey,
          notes: 'Wizard calibration seed',
        });
      }

      // Mark dormant stats
      for (const statKey of STAT_KEYS) {
        if (sliders[statKey] === 0) {
          await supabase.from('stats')
            .update({ dormant: true })
            .eq('user_id', user.id)
            .eq('stat_key', statKey);
        }
      }

      // 3. Seed master XP
      const totalStatXp = STAT_KEYS.reduce((sum, k) => sum + STAT_LEVEL_XP[sliders[k]], 0);
      const masterXp = Math.floor(totalStatXp * 0.30);
      if (masterXp > 0) {
        const master = getMasterLevel(masterXp);
        await supabase.from('master_progress').update({
          total_xp: masterXp,
          level: master.level,
        }).eq('user_id', user.id);

        await supabase.from('xp_log').insert({
          user_id: user.id,
          source: 'legacy',
          tier: 'master',
          amount: masterXp,
          base_amount: masterXp,
          multiplier: 1.0,
          notes: 'Wizard calibration seed',
        });
      }

      // 4. Insert skills
      for (const skill of skills) {
        const statKey = skill.statKeys[0];
        await supabase.from('skills').insert({
        user_id: user.id,
        name: skill.name,
        stat_keys: skill.statKeys,
        default_split: skill.defaultSplit,
        xp: 0,
        level: 1,
        });
      }

      // 5. Insert habits
      for (const habitName of habits) {
        await supabase.from('habits').insert({
          user_id: user.id,
          name: habitName,
          frequency: 'daily',
          active: true,
          streak: 0,
          shields: 0,
        });
      }

      // 6. Save lifepath if any fields filled
      if (lifepath.origin || lifepath.personalCode || lifepath.rootAccess) {
        // Store in profiles as notes or a lifepath table if it exists
        // For now, we'll skip this — lifepath table can be added later
      }

      setPhase('launching');
    } catch (err) {
      console.error('Wizard launch error:', err);
      setLaunching(false);
    }
  };

  const toggleSkill = (template: SkillTemplate) => {
    setWizardData(prev => {
      const exists = prev.skills.some(s => s.name === template.name);
      return {
        ...prev,
        skills: exists
          ? prev.skills.filter(s => s.name !== template.name)
          : [...prev.skills, template],
      };
    });
  };

  const addCustomSkill = (skill: SelectedSkill) => {
    setWizardData(prev => ({
      ...prev,
      skills: [...prev.skills.filter(s => s.name !== skill.name), skill],
    }));
  };

  const toggleHabit = (name: string) => {
    setWizardData(prev => ({
      ...prev,
      habits: prev.habits.includes(name)
        ? prev.habits.filter(h => h !== name)
        : [...prev.habits, name],
    }));
  };

  const addCustomHabit = (name: string) => {
    if (!wizardData.habits.includes(name)) {
      setWizardData(prev => ({ ...prev, habits: [...prev.habits, name] }));
    }
  };

  if (phase === 'boot') {
    return <BootAnimation onDone={() => setPhase('wizard')} />;
  }

  if (phase === 'launching') {
    return (
      <LaunchAnimation
        callsign={wizardData.identity.callsign || 'OPERATOR'}
        onDone={onComplete}
      />
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'hsl(var(--bg-primary))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      padding: '24px 16px',
    }}>
      {/* CRT border effect */}
      <div style={{
        position: 'fixed', inset: 0,
        outline: '1px solid hsl(var(--accent))',
        boxShadow: 'inset 0 0 30px rgba(255,176,0,0.05)',
        pointerEvents: 'none',
        zIndex: 9999,
      }} />

      <div style={{
        width: '100%',
        maxWidth: 640,
        background: 'hsl(var(--bg-secondary))',
        border: '1px solid hsl(var(--accent-dim))',
        boxShadow: '0 0 30px rgba(255,176,0,0.08)',
        padding: '28px 32px',
        fontFamily: "'IBM Plex Mono', monospace",
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
          borderBottom: '1px solid hsl(var(--accent-dim))',
          paddingBottom: 12,
        }}>
          <div style={{
            fontFamily: "'VT323', monospace",
            fontSize: 18,
            color: 'hsl(var(--accent))',
            textShadow: '0 0 8px rgba(255,176,0,0.5)',
            letterSpacing: 2,
          }}>
            [ UPLINK ] // FIRST BOOT
          </div>
          {step > 1 && (
            <button
              className="topbar-btn"
              style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}
              onClick={handleSkipAll}
            >
              SKIP SETUP
            </button>
          )}
        </div>

        <WizardProgressBar step={step} total={6} />

        {/* Steps */}
        {step === 1 && (
          <Step1
            data={wizardData.identity}
            onChange={identity => setWizardData(prev => ({ ...prev, identity }))}
            onNext={() => setStep(2)}
            onSkip={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            sliders={wizardData.sliders}
            onChange={sliders => setWizardData(prev => ({ ...prev, sliders }))}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            onSkip={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            selected={wizardData.skills}
            onToggle={toggleSkill}
            onAddCustom={addCustomSkill}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            onSkip={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <Step4
            data={wizardData.lifepath}
            onChange={lifepath => setWizardData(prev => ({ ...prev, lifepath }))}
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            onSkip={() => setStep(5)}
          />
        )}
        {step === 5 && (
          <Step5
            selected={wizardData.habits}
            onToggle={toggleHabit}
            onAddCustom={addCustomHabit}
            onBack={() => setStep(4)}
            onNext={() => setStep(6)}
            onSkip={() => setStep(6)}
          />
        )}
        {step === 6 && (
          <Step6
            wizardData={wizardData}
            onBack={() => setStep(5)}
            onLaunch={launchUplink}
            launching={launching}
          />
        )}
      </div>
    </div>
  );
};

export default FirstBootWizard;
