import React from 'react';

interface Props {
  onClose: () => void;
}

interface XpRow {
  level: string;
  title: string;
  xpForLevel: string;
  totalXp: string;
}

const MASTER_TITLES = [
  'Novice', 'Apprentice', 'Initiate', 'Adept', 'Specialist', 
  'Senior', 'Lead', 'Expert', 'Master', 'Principal', 
  'Elite', 'Exalted', 'Grandmaster',
];

const getTitle = (lvl: number) => {
  if (lvl >= 60) return 'Grandmaster';
  const idx = Math.floor(lvl / 5);
  return MASTER_TITLES[idx] ?? 'Novice';
};

const XP_ROWS: XpRow[] = [
  { level: '0', title: getTitle(0), xpForLevel: '—', totalXp: '0' },
  { level: '1', title: getTitle(1), xpForLevel: '1,400', totalXp: '1,400' },
  { level: '2', title: getTitle(2), xpForLevel: '1,600', totalXp: '3,000' },
  { level: '3', title: getTitle(3), xpForLevel: '1,800', totalXp: '4,800' },
  { level: '4', title: getTitle(4), xpForLevel: '2,000', totalXp: '6,800' },
  { level: '5', title: getTitle(5), xpForLevel: '2,200', totalXp: '9,000' },
  { level: '6', title: getTitle(6), xpForLevel: '2,400', totalXp: '11,400' },
  { level: '7', title: getTitle(7), xpForLevel: '2,600', totalXp: '14,000' },
  { level: '8', title: getTitle(8), xpForLevel: '2,800', totalXp: '16,800' },
  { level: '9', title: getTitle(9), xpForLevel: '3,000', totalXp: '19,800' },
  { level: '10', title: getTitle(10), xpForLevel: '3,200', totalXp: '23,000' },
  { level: '11', title: getTitle(11), xpForLevel: '3,400', totalXp: '26,400' },
  { level: '12', title: getTitle(12), xpForLevel: '3,600', totalXp: '30,000' },
  { level: '13', title: getTitle(13), xpForLevel: '3,800', totalXp: '33,800' },
  { level: '14', title: getTitle(14), xpForLevel: '4,000', totalXp: '37,800' },
  { level: '15', title: getTitle(15), xpForLevel: '4,200', totalXp: '42,000' },
  { level: '16', title: getTitle(16), xpForLevel: '4,400', totalXp: '46,400' },
  { level: '17', title: getTitle(17), xpForLevel: '4,600', totalXp: '51,000' },
  { level: '18', title: getTitle(18), xpForLevel: '4,800', totalXp: '55,800' },
  { level: '19', title: getTitle(19), xpForLevel: '5,000', totalXp: '60,800' },
  { level: '20', title: getTitle(20), xpForLevel: '5,200', totalXp: '66,000' },
  { level: '21', title: getTitle(21), xpForLevel: '5,400', totalXp: '71,400' },
  { level: '22', title: getTitle(22), xpForLevel: '5,600', totalXp: '77,000' },
  { level: '23', title: getTitle(23), xpForLevel: '5,800', totalXp: '82,800' },
  { level: '24', title: getTitle(24), xpForLevel: '6,000', totalXp: '88,800' },
  { level: '25', title: getTitle(25), xpForLevel: '6,200', totalXp: '95,000' },
  { level: '26', title: getTitle(26), xpForLevel: '6,400', totalXp: '101,400' },
  { level: '27', title: getTitle(27), xpForLevel: '6,600', totalXp: '108,000' },
  { level: '28', title: getTitle(28), xpForLevel: '6,800', totalXp: '114,800' },
  { level: '29', title: getTitle(29), xpForLevel: '7,000', totalXp: '121,800' },
  { level: '30', title: getTitle(30), xpForLevel: '7,200', totalXp: '129,000' },
  { level: '31', title: getTitle(31), xpForLevel: '7,400', totalXp: '136,400' },
  { level: '32', title: getTitle(32), xpForLevel: '7,600', totalXp: '144,000' },
  { level: '33', title: getTitle(33), xpForLevel: '7,800', totalXp: '151,800' },
  { level: '34', title: getTitle(34), xpForLevel: '8,000', totalXp: '159,800' },
  { level: '35', title: getTitle(35), xpForLevel: '8,200', totalXp: '168,000' },
  { level: '36', title: getTitle(36), xpForLevel: '8,400', totalXp: '176,400' },
  { level: '37', title: getTitle(37), xpForLevel: '8,600', totalXp: '185,000' },
  { level: '38', title: getTitle(38), xpForLevel: '8,800', totalXp: '193,800' },
  { level: '39', title: getTitle(39), xpForLevel: '9,000', totalXp: '202,800' },
  { level: '40', title: getTitle(40), xpForLevel: '9,200', totalXp: '212,000' },
  { level: '41', title: getTitle(41), xpForLevel: '9,400', totalXp: '221,400' },
  { level: '42', title: getTitle(42), xpForLevel: '9,600', totalXp: '231,000' },
  { level: '43', title: getTitle(43), xpForLevel: '9,800', totalXp: '240,800' },
  { level: '44', title: getTitle(44), xpForLevel: '10,000', totalXp: '250,800' },
  { level: '45', title: getTitle(45), xpForLevel: '10,200', totalXp: '261,000' },
  { level: '46', title: getTitle(46), xpForLevel: '10,400', totalXp: '271,400' },
  { level: '47', title: getTitle(47), xpForLevel: '10,600', totalXp: '282,000' },
  { level: '48', title: getTitle(48), xpForLevel: '10,800', totalXp: '292,800' },
  { level: '49', title: getTitle(49), xpForLevel: '11,000', totalXp: '303,800' },
  { level: '50', title: getTitle(50), xpForLevel: '11,200', totalXp: '315,000' },
  { level: '51', title: getTitle(51), xpForLevel: '11,400', totalXp: '326,400' },
  { level: '52', title: getTitle(52), xpForLevel: '11,600', totalXp: '338,000' },
  { level: '53', title: getTitle(53), xpForLevel: '11,800', totalXp: '349,800' },
  { level: '54', title: getTitle(54), xpForLevel: '12,000', totalXp: '361,800' },
  { level: '55', title: getTitle(55), xpForLevel: '12,200', totalXp: '374,000' },
  { level: '56', title: getTitle(56), xpForLevel: '12,400', totalXp: '386,400' },
  { level: '57', title: getTitle(57), xpForLevel: '12,600', totalXp: '399,000' },
  { level: '58', title: getTitle(58), xpForLevel: '12,800', totalXp: '411,800' },
  { level: '59', title: getTitle(59), xpForLevel: '13,000', totalXp: '424,800' },
  { level: '60', title: getTitle(60), xpForLevel: '13,200', totalXp: '438,000' },
  { level: '61+', title: 'Grandmaster', xpForLevel: '13,200 (flat)', totalXp: '∞' },
];

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 16, color: acc, marginBottom: 10, fontFamily: vt, lineHeight: 1 }}>
      {children}
    </div>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: dim, lineHeight: 1.8 }}>
      {children}
    </div>
  );
}

export default function XpDocsPage({ onClose }: Props) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: bgP,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: mono,
    }}>
      <div style={{
        height: 56,
        flexShrink: 0,
        borderBottom: `1px solid ${adim}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
      }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// DOCS</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>XP &amp; LEVELLING</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: `1px solid ${adim}`,
            color: dim,
            fontFamily: mono,
            fontSize: 10,
            cursor: 'pointer',
            padding: '6px 12px',
            letterSpacing: 1,
          }}
        >
          [ CLOSE ]
        </button>
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)',
        gap: 18,
        padding: 18,
      }}>
        <div style={{
          minHeight: 0,
          overflowY: 'auto',
          background: bgS,
          border: `1px solid rgba(153,104,0,0.35)`,
          padding: 20,
        }}>
          <div style={{ fontSize: 10, color: adim, letterSpacing: 2, marginBottom: 14 }}>
            // SYSTEM OVERVIEW
          </div>

          <SectionTitle>The Three Core XP Streams</SectionTitle>
          <BodyText>
            Everything you do earns XP. Depending on how you log your activity, that experience flows into three different buckets:
          </BodyText>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <div style={{ padding: 12, border: `1px solid ${adim}`, background: bgT }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 4 }}>1. MAIN XP</div>
              <BodyText>Power up your Character Level, your 7 Core Stats, and your specific Skills.</BodyText>
            </div>
            <div style={{ padding: 12, border: `1px solid ${adim}`, background: bgT }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 4 }}>2. TOOL XP</div>
              <BodyText>Increase your proficiency with specific hardware or software such as Photoshop or a Road Bike.</BodyText>
            </div>
            <div style={{ padding: 12, border: `1px solid ${adim}`, background: bgT }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 4 }}>3. AUGMENT XP</div>
              <BodyText>Track your mastery of specialized AI enhancements or systems you’ve integrated into your life, such as ChatGPT, Claude Code, or Midjourney.</BodyText>
            </div>
          </div>

          <div style={{ height: 1, background: `rgba(153,104,0,0.3)`, margin: '20px 0' }} />

          <SectionTitle>How to Log: The Quicklog</SectionTitle>
          <BodyText>
            To start earning, you only need two pieces of information: <span style={{ color: acc }}>what you are doing</span> and <span style={{ color: acc }}>how long you did it</span>.
          </BodyText>

          <div style={{ marginTop: 16, padding: 16, border: `1px solid ${adim}`, background: bgT }}>
            <div style={{ fontSize: 12, color: acc, marginBottom: 8 }}>Basic Rewards: The 10 / 10 / 10 Rule</div>
            <BodyText>
              For every minute you log, the system generates XP at a base rate of 10 per category.
            </BodyText>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: acc, marginBottom: 6 }}>Main XP: 10 per minute</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <BodyText>50% goes directly to the Skill used.</BodyText>
                  <BodyText>25% goes to the Stat associated with that skill.</BodyText>
                  <BodyText>25% goes to your overall Character Level.</BodyText>
                  <BodyText>
                    If a skill uses multiple stats, the XP is split evenly between them. You can use the stat sliders in your settings to customize this split.
                  </BodyText>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: acc, marginBottom: 6 }}>Tool XP: 10 per minute</div>
                <BodyText>Earned if you tag a Tool. If you tag multiple tools, the 10 XP is split between them.</BodyText>
              </div>
              <div>
                <div style={{ fontSize: 10, color: acc, marginBottom: 6 }}>Augment XP: 10 per minute</div>
                <BodyText>Earned if you tag an Augment. If you tag multiple augments, the 10 XP is split between them.</BodyText>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: `rgba(153,104,0,0.3)`, margin: '20px 0' }} />

          <SectionTitle>Bonus XP &amp; Milestones</SectionTitle>
          <BodyText>
            Logging time is the grind, but completing objectives is where burst XP comes in.
          </BodyText>

          <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
            <div style={{ padding: 14, border: `1px solid ${adim}`, background: bgT }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 8 }}>Media &amp; Learning</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <BodyText>When you add Media or a Course, a progress bar appears.</BodyText>
                <BodyText>Completion Bonus: finishing media grants a significant Main XP boost.</BodyText>
                <BodyText>Tiered Rewards: books grant the highest bonus, followed by films and albums, with TV shows granting the least.</BodyText>
                <BodyText>Legacy Logging: marking something as LEGACY grants 50% of the total XP immediately to backfill your history.</BodyText>
              </div>
            </div>

            <div style={{ padding: 14, border: `1px solid ${adim}`, background: bgT }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 8 }}>Projects &amp; Courses</div>
              <BodyText>
                When you finish a module in a course or a phase of a project, you receive bonus Main XP, Tool XP, and Augment XP based on the tags you used.
              </BodyText>
            </div>
          </div>

          <div style={{ height: 1, background: `rgba(153,104,0,0.3)`, margin: '20px 0' }} />

          <SectionTitle>Leveling &amp; Progression</SectionTitle>
          <div style={{ display: 'grid', gap: 10 }}>
            <BodyText>
              The system is designed for the long haul. There are no level caps. Your potential is infinite.
            </BodyText>
            <BodyText>
              <span style={{ color: acc }}>No Resets:</span> when you level up, your XP count keeps climbing. If Level 2 requires 1,000 XP, reaching it means your next minute of work puts you at 1,010 XP toward Level 3.
            </BodyText>
            <BodyText>
              <span style={{ color: acc }}>Total Mastery:</span> in addition to individual tool and augment levels, the app tracks your Overall Tool Level and Overall Augment Level by summing all XP earned in those categories.
            </BodyText>
          </div>

          <div style={{
            marginTop: 18,
            padding: 14,
            border: `1px solid ${acc}`,
            background: 'rgba(255,176,0,0.08)',
          }}>
            <div style={{ fontSize: 10, color: acc, marginBottom: 6, letterSpacing: 1 }}>PRO TIP</div>
            <BodyText>
              If you’re working on a complex project, tag your Tools and Augments before you start. It’s the fastest way to level up your entire build simultaneously.
            </BodyText>
          </div>
        </div>

        <div style={{
          minHeight: 0,
          overflowY: 'auto',
          background: bgS,
          border: `1px solid rgba(153,104,0,0.35)`,
          padding: 16,
        }}>
          <div style={{ fontSize: 10, color: adim, letterSpacing: 2, marginBottom: 12 }}>
            // XP LEVEL PROGRESS CHART
          </div>
          <div style={{ border: `1px solid ${adim}`, background: bgT, overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '50px 90px 1fr 1fr',
              padding: '10px 12px',
              borderBottom: `1px solid ${adim}`,
              fontSize: 9,
              color: adim,
              letterSpacing: 1,
              position: 'sticky',
              top: 0,
              background: bgT,
              zIndex: 2,
            }}>
              <div>LVL</div>
              <div>TITLE</div>
              <div>XP FOR LEVEL</div>
              <div>TOTAL XP TO REACH</div>
            </div>

            {XP_ROWS.map((row, index) => (
              <div
                key={row.level}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 90px 1fr 1fr',
                  padding: '9px 12px',
                  fontSize: 10,
                  color: index % 2 === 0 ? dim : acc,
                  borderBottom: index === XP_ROWS.length - 1 ? 'none' : '1px solid rgba(153,104,0,0.18)',
                  background: row.level === '61+' ? 'rgba(255,176,0,0.06)' : 'transparent',
                }}
              >
                <div style={{ color: acc }}>{row.level}</div>
                <div style={{ color: acc }}>{row.title}</div>
                <div>{row.xpForLevel}</div>
                <div>{row.totalXp}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
