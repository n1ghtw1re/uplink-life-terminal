// ============================================================
// src/components/auth/LoginScreen.tsx
// ============================================================
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'login' | 'signup' | 'magic';

interface Props {
  onAuthenticated: () => void;
}

export default function LoginScreen({ onAuthenticated }: Props) {
  const [mode, setMode]             = useState<Mode>('login');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const clearMessage = () => setMessage(null);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    clearMessage();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      onAuthenticated();
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!email || !password) return;
    setLoading(true);
    clearMessage();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'CHECK YOUR EMAIL TO CONFIRM YOUR ACCOUNT', type: 'success' });
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    clearMessage();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: `ACCESS LINK TRANSMITTED TO ${email.toUpperCase()}`, type: 'success' });
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'login') handleLogin();
      else if (mode === 'signup') handleSignup();
      else handleMagicLink();
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid hsl(41, 100%, 30%)',
    color: 'hsl(41, 100%, 69%)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    padding: '4px 0',
    outline: 'none',
    width: '100%',
    caretColor: 'hsl(41, 100%, 69%)',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: 'hsl(41, 100%, 30%)',
    letterSpacing: 2,
    marginBottom: 6,
    display: 'block',
  };

  const btnStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid hsl(41, 100%, 35%)',
    color: 'hsl(41, 100%, 60%)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    padding: '6px 16px',
    cursor: 'pointer',
    letterSpacing: 1,
    transition: 'all 150ms ease',
  };

  const btnPrimaryStyle: React.CSSProperties = {
    ...btnStyle,
    border: '1px solid hsl(41, 100%, 60%)',
    color: 'hsl(41, 100%, 75%)',
    boxShadow: '0 0 8px rgba(255, 176, 0, 0.2)',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '1px solid hsl(41, 100%, 60%)' : '1px solid transparent',
    color: active ? 'hsl(41, 100%, 69%)' : 'hsl(41, 100%, 30%)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    padding: '4px 12px',
    cursor: 'pointer',
    letterSpacing: 1,
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0d0800',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      {/* CRT effects */}
      <div className="crt-scanlines crt-vignette crt-flicker"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
      />

      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: 480,
        padding: '0 32px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontFamily: "'VT323', monospace",
            fontSize: 32,
            color: 'hsl(41, 100%, 69%)',
            textShadow: '0 0 12px hsla(41, 100%, 50%, 0.8), 0 0 30px hsla(41, 100%, 50%, 0.4)',
            marginBottom: 4,
          }}>
            UPLINK OS v1.0.0
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: 'hsl(41, 100%, 25%)',
            letterSpacing: 4,
            marginBottom: 24,
          }}>
            N1GHTW1RE COLLECTIVE
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: 'hsl(41, 100%, 40%)',
          }}>
            &gt; AUTHENTICATION REQUIRED
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid hsl(41, 100%, 15%)' }}>
          <button style={tabStyle(mode === 'login')} onClick={() => { setMode('login'); clearMessage(); }}>
            LOGIN
          </button>
          <button style={tabStyle(mode === 'signup')} onClick={() => { setMode('signup'); clearMessage(); }}>
            NEW OPERATOR
          </button>
          <button style={tabStyle(mode === 'magic')} onClick={() => { setMode('magic'); clearMessage(); }}>
            MAGIC LINK
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gap: 20 }}>

          {/* Email */}
          <div>
            <span style={labelStyle}>
              {mode === 'magic' ? 'OPERATOR EMAIL' : 'EMAIL'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'hsl(41, 100%, 40%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
                &gt;
              </span>
              <input
                style={inputStyle}
                type="email"
                placeholder="operator@domain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password — hidden for magic link mode */}
          {mode !== 'magic' && (
            <div>
              <span style={labelStyle}>ACCESS CODE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'hsl(41, 100%, 40%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
                  &gt;
                </span>
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: message.type === 'error' ? '#ff4400' : '#44ff88',
              textShadow: message.type === 'error'
                ? '0 0 6px rgba(255, 68, 0, 0.5)'
                : '0 0 6px rgba(68, 255, 136, 0.5)',
              lineHeight: 1.5,
            }}>
              &gt; {message.text}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            {mode === 'login' && (
              <>
                <button
                  style={btnPrimaryStyle}
                  onClick={handleLogin}
                  disabled={!email || !password || loading}
                >
                  {loading ? '>> AUTHENTICATING...' : '>> AUTHENTICATE'}
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                style={btnPrimaryStyle}
                onClick={handleSignup}
                disabled={!email || !password || loading}
              >
                {loading ? '>> CREATING ACCOUNT...' : '>> CREATE OPERATOR'}
              </button>
            )}
            {mode === 'magic' && (
              <button
                style={btnPrimaryStyle}
                onClick={handleMagicLink}
                disabled={!email || loading}
              >
                {loading ? '>> TRANSMITTING...' : '>> SEND ACCESS LINK'}
              </button>
            )}
          </div>

          {/* Helper text */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: 'hsl(41, 100%, 20%)',
            lineHeight: 1.6,
            marginTop: 8,
          }}>
            {mode === 'login' && '> ENTER YOUR EMAIL AND ACCESS CODE TO AUTHENTICATE'}
            {mode === 'signup' && '> CREATE A NEW OPERATOR ACCOUNT. CHECK EMAIL TO CONFIRM.'}
            {mode === 'magic' && '> ENTER YOUR EMAIL. WE\'LL SEND A ONE-TIME ACCESS LINK.'}
          </div>
        </div>
      </div>
    </div>
  );
}