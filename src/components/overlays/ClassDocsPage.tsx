import { useMemo, useState } from 'react';
import type { StatKey } from '@/types';

interface Props {
  onClose: () => void;
}

interface ClassDoc {
  name: string;
  stats: [StatKey, StatKey];
  description: string;
  careers: string[];
}

const STAT_TABS: { key: StatKey; label: string }[] = [
  { key: 'body', label: 'BODY' },
  { key: 'wire', label: 'WIRE' },
  { key: 'mind', label: 'MIND' },
  { key: 'cool', label: 'COOL' },
  { key: 'grit', label: 'GRIT' },
  { key: 'flow', label: 'FLOW' },
  { key: 'ghost', label: 'GHOST' },
];

const CLASS_DOCS: ClassDoc[] = [
  {
    name: 'OPERATOR',
    stats: ['body', 'wire'],
    description: "Mastery of the interface between human effort and machine precision. You don't just use tools; you become an extension of them.",
    careers: ['Drone Pilot', 'Heavy Machinery Operator', 'Laparoscopic Surgeon'],
  },
  {
    name: 'PRACTITIONER',
    stats: ['body', 'mind'],
    description: 'Theoretical knowledge translated into physical skill. This class is about the "how" and "why" of movement.',
    careers: ['Physical Therapist', 'Yoga Instructor', 'Biometric Researcher'],
  },
  {
    name: 'PERFORMER',
    stats: ['body', 'cool'],
    description: 'The body as a tool for social influence and public engagement. High presence paired with high physical capability.',
    careers: ['Professional Athlete', 'Stunt Performer', 'Stage Actor'],
  },
  {
    name: 'LABORER',
    stats: ['body', 'grit'],
    description: 'The epitome of physical resilience. This class excels at high-volume, repetitive physical tasks that require mental toughness.',
    careers: ['Firefighter', 'Construction Foreman', 'Long-distance Mover'],
  },
  {
    name: 'ARTIST',
    stats: ['body', 'flow'],
    description: 'Using the physical form or manual dexterity to create aesthetic or emotional resonance.',
    careers: ['Sculptor', 'Contemporary Dancer', 'Professional Chef'],
  },
  {
    name: 'MONK',
    stats: ['body', 'ghost'],
    description: 'Total mastery over the nervous system. The goal is internal regulation and the union of breath and movement.',
    careers: ['Martial Arts Sensei', 'Breathwork Coach', 'Free Diver'],
  },
  {
    name: 'ANALYST',
    stats: ['wire', 'mind'],
    description: 'Navigating complex data structures to find logic. You see the "ghost in the machine" and understand how the parts form the whole.',
    careers: ['Data Scientist', 'Cybersecurity Researcher', 'Financial Quant'],
  },
  {
    name: 'COMMUNICATOR',
    stats: ['wire', 'cool'],
    description: 'Using digital platforms to lead, influence, or manage groups. You are the bridge between the tech and the people.',
    careers: ['Social Media Strategist', 'Digital PR Manager', 'Technical Evangelist'],
  },
  {
    name: 'TECHNICIAN',
    stats: ['wire', 'grit'],
    description: 'The disciplined maintenance of systems. You ensure things stay running through consistency and troubleshooting.',
    careers: ['Systems Administrator', 'IT Support Lead', 'Quality Assurance Tester'],
  },
  {
    name: 'DESIGNER',
    stats: ['wire', 'flow'],
    description: 'The marriage of digital tools and creative vision. You build the aesthetics of the digital world.',
    careers: ['UX/UI Designer', 'Motion Graphics Artist', 'Front-end Developer'],
  },
  {
    name: 'OBSERVER',
    stats: ['wire', 'ghost'],
    description: 'Quietly navigating the digital landscape. You find patterns or truth within systems through detached awareness.',
    careers: ['Digital Ethicist', 'OSINT (Open Source Intelligence) Researcher', 'Archivist'],
  },
  {
    name: 'SCHOLAR',
    stats: ['mind', 'cool'],
    description: 'The bridge between complex ideas and public understanding. You take what you know and make it accessible.',
    careers: ['University Professor', 'Science Communicator', 'Policy Advisor'],
  },
  {
    name: 'STUDENT',
    stats: ['mind', 'grit'],
    description: 'The relentless pursuit of mastery. This class is defined by the discipline required to tackle steep learning curves.',
    careers: ['PhD Candidate', 'Medical Resident', 'Language Translator'],
  },
  {
    name: 'ARCHITECT',
    stats: ['mind', 'flow'],
    description: 'Translating deep research or intellectual concepts into something new and tangible.',
    careers: ['Investigative Journalist', 'Game Designer', 'Non-Fiction Author'],
  },
  {
    name: 'PHILOSOPHER',
    stats: ['mind', 'ghost'],
    description: 'Seeking the big picture. You use your intellect to explore consciousness, ethics, and the nature of reality.',
    careers: ['Ethicist', 'Theoretical Physicist', 'Meditation Researcher'],
  },
  {
    name: 'PROFESSIONAL',
    stats: ['cool', 'grit'],
    description: 'The standard for reliability in the workplace. You maintain a high-status presence through consistent, disciplined output.',
    careers: ['Corporate Lawyer', 'Project Manager', 'Account Executive'],
  },
  {
    name: 'DIRECTOR',
    stats: ['cool', 'flow'],
    description: 'Creative output designed for public consumption. You create with the audience in mind.',
    careers: ['Creative Director', 'Fashion Designer', 'Content Creator'],
  },
  {
    name: 'GUIDE',
    stats: ['cool', 'ghost'],
    description: 'Leadership through empathy and stillness. You influence others by providing clarity and a calm presence.',
    careers: ['Therapist', 'Executive Coach', 'Chaplain'],
  },
  {
    name: 'BUILDER',
    stats: ['grit', 'flow'],
    description: 'The grind meets the muse. You produce creative work through sheer volume and a do-not-quit attitude.',
    careers: ['Indie Developer', 'Novelist', 'Carpenter'],
  },
  {
    name: 'SURVIVOR',
    stats: ['grit', 'ghost'],
    description: 'Maintaining inner peace and mental toughness during periods of extreme isolation or hardship.',
    careers: ['Humanitarian Aid Worker', 'Park Ranger', 'Crisis Counselor'],
  },
  {
    name: 'VISIONARY',
    stats: ['flow', 'ghost'],
    description: 'Pure inspiration rooted in the subconscious. You bring ideas from the void into reality through high-level creative intuition.',
    careers: ['Concept Artist', 'Futurist', 'Composer'],
  },
];

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';

export default function ClassDocsPage({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<StatKey>('body');

  const filteredClasses = useMemo(
    () => CLASS_DOCS.filter((cls) => cls.stats.includes(activeTab)).sort((a, b) => a.name.localeCompare(b.name)),
    [activeTab]
  );

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
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>CLASSES</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>{filteredClasses.length} linked to {activeTab.toUpperCase()}</span>
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
        borderBottom: `1px solid ${adim}`,
        padding: '10px 24px',
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        {STAT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '4px 10px',
              fontSize: 10,
              fontFamily: mono,
              cursor: 'pointer',
              letterSpacing: 1,
              border: `1px solid ${activeTab === tab.key ? acc : adim}`,
              background: activeTab === tab.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: activeTab === tab.key ? acc : dim,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px 28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 14,
      }}>
        {filteredClasses.map((cls) => (
          <div
            key={cls.name}
            style={{
              background: bgS,
              border: `1px solid rgba(153,104,0,0.35)`,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              minHeight: 220,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontFamily: vt, fontSize: 24, color: acc, lineHeight: 1 }}>
                {cls.name}
              </div>
              <div style={{
                fontSize: 9,
                color: adim,
                border: `1px solid ${adim}`,
                padding: '3px 6px',
                letterSpacing: 1,
                flexShrink: 0,
              }}>
                {cls.stats[0].toUpperCase()} / {cls.stats[1].toUpperCase()}
              </div>
            </div>

            <div style={{ fontSize: 10, color: dim, lineHeight: 1.7 }}>
              {cls.description}
            </div>

            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>
                // CAREER EXAMPLES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cls.careers.map((career) => (
                  <div key={career} style={{ fontSize: 10, color: acc }}>
                    &gt; {career}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
