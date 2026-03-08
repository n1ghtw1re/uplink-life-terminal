import { toast } from 'sonner';

interface LifepathField {
  label: string;
  content: string | null; // null = redacted
}

const fields: LifepathField[] = [
  { label: 'ORIGIN', content: null },
  { label: 'PERSONAL CODE', content: 'Stay curious. Ship things. Keep the streak.\nNever stop building. The work is the reward.' },
  { label: 'LIFE GOAL', content: 'Build UPLINK into a product used by 10,000 operators.\nLaunch something real. Leave something behind.' },
  { label: 'CURRENT FOCUS', content: 'Shipping UPLINK v1. Learning TypeScript properly.\nMaintaining consistency across all 7 stats.' },
  { label: 'WHAT ROOT ACCESS MEANS', content: null },
  { label: 'BEFORE THE UPLINK', content: 'Years of scattered notebooks, abandoned habit trackers,\nand productivity systems that never stuck. The problem\nwas never the tools — it was the lack of stakes.\n\nUPLINK is the first system that makes the work feel real.' },
];

const CharSheetPage5 = () => {
  const handleEdit = () => {
    toast('Field editing coming soon', {
      description: 'Lifepath editing will be available in a future update.',
    });
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 4 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="font-display" style={{ fontSize: 22, color: 'hsl(var(--accent-bright))', textShadow: '0 0 12px rgba(255,176,0,0.4)' }}>
          // LIFEPATH
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'hsl(var(--text-dim))', letterSpacing: 3, marginTop: 4 }}>
          PRIVATE — NOT TRANSMITTED — EYES ONLY
        </div>
      </div>

      {/* Fields */}
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map((field) => (
          <div key={field.label} style={{ background: '#1a0f00', border: '1px solid #261600', padding: '14px 16px', transition: 'border-color 200ms' }} className="lifepath-card">
            {/* Label row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'hsl(var(--text-dim))', letterSpacing: 2 }}>
                {field.label}
              </span>
              <button
                onClick={handleEdit}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'hsl(var(--text-dim))', opacity: 0.5, border: '1px solid #261600', background: 'none', padding: '2px 8px', cursor: 'pointer', letterSpacing: 1 }}
                className="lifepath-edit-btn"
              >
                [ EDIT ]
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#261600', margin: '8px 0' }} />

            {/* Content */}
            {field.content ? (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--accent))', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {field.content}
              </div>
            ) : (
              <span style={{ color: '#996800', opacity: 0.4, letterSpacing: 3, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", userSelect: 'none' }}>
                [REDACTED]
              </span>
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#332200' }}>
          // END OF FILE — UPLINK OPERATOR DOSSIER — CLASSIFICATION: EYES ONLY
        </div>
      </div>
    </div>
  );
};

export default CharSheetPage5;
