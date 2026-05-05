import React from 'react';

interface Props {
  onClose: () => void;
}

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

const COMMANDS = [
  { name: 'clear', desc: 'Clear terminal output', syntax: 'clear' },
  { name: 'close', desc: 'Close a widget', syntax: 'close [widget_name]' },
  { name: 'drawer', desc: 'Open or close drawer', syntax: 'drawer [name] | drawer close' },
  { name: 'habits', desc: 'Check-in/out a habit', syntax: 'habits [name]' },
  { name: 'help', desc: 'Show available commands', syntax: 'help' },
  { name: 'list', desc: 'List items (skills, tools, etc.)', syntax: 'list [type]' },
  { name: 'log', desc: 'Log a session against a skill', syntax: 'log [duration] [skill] [flags]' },
  { name: 'open', desc: 'Open a widget', syntax: 'open [widget_name]' },
  { name: 'status', desc: 'Show operator status', syntax: 'status' },
];

export default function TerminalDocsPage({ onClose }: Props) {
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
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>TERMINAL</span>
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

          <SectionTitle>Terminal Interface</SectionTitle>
          <BodyText>
            The UPLINK Terminal is your command-line interface for quick actions. Access it via the sidebar or open the Terminal widget. Type <span style={{ color: acc }}>help</span> to see available commands.
          </BodyText>

          <div style={{ height: 1, background: `rgba(153,104,0,0.3)`, margin: '20px 0' }} />

          <SectionTitle>Quick Tips</SectionTitle>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <div style={{ padding: 12, border: `1px solid ${adim}`, background: bgT }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 4 }}>AUTOCOMPLETE</div>
              <BodyText>Press <span style={{ color: acc }}>Tab</span> to autocomplete commands and arguments.</BodyText>
            </div>
            <div style={{ padding: 12, border: `1px solid ${adim}`, background: bgT }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 4 }}>HISTORY</div>
              <BodyText>Use <span style={{ color: acc }}>↑/↓</span> arrow keys to navigate through command history.</BodyText>
            </div>
            <div style={{ padding: 12, border: `1px solid ${adim}`, background: bgT }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 4 }}>SHARED HISTORY</div>
              <BodyText>Sidebar and widget terminals share the same command history.</BodyText>
            </div>
            <div style={{ padding: 12, border: `1px solid ${acc}`, background: `rgba(153,104,0,0.15)` }}>
              <div style={{ fontSize: 10, color: acc, marginBottom: 8, fontWeight: 'bold' }}>TAGGING SYSTEM</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <BodyText>
                  Tag related items when logging skills using flags:
                </BodyText>
                <div style={{ fontSize: 9, color: acc, fontFamily: mono, padding: '4px 0' }}>
                  -t [tool]      Tag a tool (multiple allowed)<br />
                  -a [augment]   Tag an augment (multiple allowed)<br />
                  -m [media]     Tag a media item (book, movie, etc.)<br />
                  -c [course]    Tag an active course<br />
                  -p [project]   Tag an active project
                </div>
                <BodyText>
                  Example: <span style={{ color: acc }}>log 1h coding -t vscode -p uplink</span>
                </BodyText>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          minHeight: 0,
          overflowY: 'auto',
          background: bgS,
          border: `1px solid rgba(153,104,0,0.35)`,
          padding: 20,
        }}>
          <div style={{ fontSize: 10, color: adim, letterSpacing: 2, marginBottom: 14 }}>
            // COMMANDS
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {COMMANDS.map((cmd) => (
              <div key={cmd.name} style={{ padding: 10, border: `1px solid ${adim}`, background: bgT }}>
                <div style={{ fontSize: 12, color: acc, fontFamily: vt, marginBottom: 4 }}>{cmd.name}</div>
                <div style={{ fontSize: 10, color: dim, marginBottom: 4 }}>{cmd.desc}</div>
                <div style={{ fontSize: 9, color: adim, fontFamily: mono }}>{cmd.syntax}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
