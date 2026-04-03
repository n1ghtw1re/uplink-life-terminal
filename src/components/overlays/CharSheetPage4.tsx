import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOperator } from '@/hooks/useOperator';
import { supabase } from '@/integrations/supabase/client';

const CharSheetPage4 = () => {
  const queryClient = useQueryClient();
  const { data: op } = useOperator();
  
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const mono = "'IBM Plex Mono', monospace";
  const acc = 'hsl(var(--accent))';
  const accDim = 'hsl(var(--accent-dim))';
  const dim = 'hsl(var(--text-dim))';
  const bgT = 'hsl(var(--bg-tertiary))';

  const startEdit = (field: string, currentValue: string | null | undefined) => {
    setEditingField(field);
    setEditValue(currentValue ?? '');
  };

  const saveEdit = async (field: string) => {
    const dbFieldMap: Record<string, string> = {
      'origin': 'origin',
      'personalCode': 'personal_code',
      'birthdate': 'birthdate',
      'location': 'location',
      'affiliations': 'affiliations',
      'lifeGoal': 'life_goal',
      'currentFocus': 'current_focus',
      'height': 'height',
      'weight': 'weight',
      'bloodType': 'blood_type',
      'intelLog': 'intel_log',
    };
    
    const dbField = dbFieldMap[field];
    if (dbField) {
      await supabase.from('profile').update({ [dbField]: editValue.trim() || null }).eq('id', 1);
      queryClient.invalidateQueries({ queryKey: ['operator'] });
    }
    setEditingField(null);
    setEditValue('');
  };

  const FieldRow = ({ 
    label, 
    value, 
    field, 
    multiline = false,
    isDate = false 
  }: { 
    label: string; 
    value: string | null | undefined; 
    field: string;
    multiline?: boolean;
    isDate?: boolean;
  }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, color: accDim, marginBottom: 4, letterSpacing: 1 }}>{label}</div>
      {editingField === field ? (
        <div style={{ display: 'flex', gap: 6 }}>
          {multiline ? (
            <textarea
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setEditingField(null); }}
              autoFocus
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: 10,
                background: bgT,
                border: `1px solid ${acc}`,
                color: acc,
                fontFamily: mono,
                outline: 'none',
                minHeight: 60,
                resize: 'vertical',
              }}
            />
          ) : (
            <input
              type={isDate ? 'date' : 'text'}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !multiline) saveEdit(field); if (e.key === 'Escape') setEditingField(null); }}
              autoFocus
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: 10,
                background: bgT,
                border: `1px solid ${acc}`,
                color: acc,
                fontFamily: mono,
                outline: 'none',
              }}
            />
          )}
          <button
            onClick={() => saveEdit(field)}
            style={{
              padding: '4px 8px',
              fontSize: 9,
              background: 'transparent',
              border: `1px solid ${acc}`,
              color: acc,
              fontFamily: mono,
              cursor: 'pointer',
            }}
          >[OK]</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 8 }}>
          <div 
            style={{ 
              flex: 1, 
              fontSize: 10, 
              color: value ? dim : accDim,
              fontStyle: value ? 'normal' : 'italic',
              cursor: 'pointer',
              ...(multiline ? { whiteSpace: 'pre-wrap' } : {}),
            }}
            onClick={() => startEdit(field, value)}
          >
            {value || '— click to set —'}
          </div>
          <button
            onClick={() => startEdit(field, value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: accDim,
              fontSize: 8,
              cursor: 'pointer',
              padding: 0,
            }}
          >[edit]</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', gap: 16, padding: '0 4px' }}>
      {/* LEFT COLUMN - THE IDENTITY */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ fontSize: 9, color: dim, marginBottom: 8, letterSpacing: 1 }}>// THE IDENTITY</div>
        
        <div style={{ padding: 10, background: bgT, border: `1px solid ${accDim}`, marginBottom: 12 }}>
          <FieldRow label="ORIGIN" value={op?.origin} field="origin" multiline />
        </div>

        <FieldRow label="PERSONAL CODE" value={op?.personalCode} field="personalCode" />

        <FieldRow label="CHRONO_MARK" value={op?.birthdate} field="birthdate" isDate />

        <FieldRow label="LOCATION" value={op?.location} field="location" />

        <div style={{ padding: 10, background: bgT, border: `1px solid ${accDim}` }}>
          <div style={{ fontSize: 9, color: accDim, marginBottom: 8, letterSpacing: 1 }}>VITAL_SIGNS</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, color: accDim, marginBottom: 2 }}>HEIGHT</div>
              <div 
                style={{ fontSize: 10, color: op?.height ? dim : accDim, cursor: 'pointer' }}
                onClick={() => startEdit('height', op?.height)}
              >
                {op?.height || '—'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, color: accDim, marginBottom: 2 }}>WEIGHT</div>
              <div 
                style={{ fontSize: 10, color: op?.weight ? dim : accDim, cursor: 'pointer' }}
                onClick={() => startEdit('weight', op?.weight)}
              >
                {op?.weight || '—'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, color: accDim, marginBottom: 2 }}>BLOOD TYPE</div>
              <div 
                style={{ fontSize: 10, color: op?.bloodType ? dim : accDim, cursor: 'pointer' }}
                onClick={() => startEdit('bloodType', op?.bloodType)}
              >
                {op?.bloodType || '—'}
              </div>
            </div>
          </div>
          {editingField === 'height' && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <input 
                value={editValue} 
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit('height'); if (e.key === 'Escape') setEditingField(null); }}
                placeholder={`e.g. 5'10"`}
                style={{ flex: 1, padding: '2px 4px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${acc}`, color: acc, fontFamily: mono }}
              />
              <button onClick={() => saveEdit('height')} style={{ padding: '2px 6px', fontSize: 8, background: 'transparent', border: `1px solid ${acc}`, color: acc, fontFamily: mono }}>OK</button>
            </div>
          )}
          {editingField === 'weight' && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <input 
                value={editValue} 
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit('weight'); if (e.key === 'Escape') setEditingField(null); }}
                placeholder="e.g. 170lbs"
                style={{ flex: 1, padding: '2px 4px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${acc}`, color: acc, fontFamily: mono }}
              />
              <button onClick={() => saveEdit('weight')} style={{ padding: '2px 6px', fontSize: 8, background: 'transparent', border: `1px solid ${acc}`, color: acc, fontFamily: mono }}>OK</button>
            </div>
          )}
          {editingField === 'bloodType' && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <input 
                value={editValue} 
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit('bloodType'); if (e.key === 'Escape') setEditingField(null); }}
                placeholder="e.g. O+"
                style={{ flex: 1, padding: '2px 4px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${acc}`, color: acc, fontFamily: mono }}
              />
              <button onClick={() => saveEdit('bloodType')} style={{ padding: '2px 6px', fontSize: 8, background: 'transparent', border: `1px solid ${acc}`, color: acc, fontFamily: mono }}>OK</button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN - THE ALIGNMENT */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ fontSize: 9, color: dim, marginBottom: 8, letterSpacing: 1 }}>// THE ALIGNMENT</div>

        <FieldRow label="NETWORKS" value={op?.affiliations} field="affiliations" multiline />

        <FieldRow label="LIFE GOAL" value={op?.lifeGoal} field="lifeGoal" />

        <FieldRow label="CURRENT FOCUS" value={op?.currentFocus} field="currentFocus" />

        <div style={{ flex: 0.4, minHeight: 120, padding: 10, background: bgT, border: `1px solid ${accDim}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 9, color: accDim, marginBottom: 8, letterSpacing: 1 }}>INTEL_LOG</div>
          {editingField === 'intelLog' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: 10,
                  background: 'hsl(var(--bg-secondary))',
                  border: `1px solid ${acc}`,
                  color: acc,
                  fontFamily: mono,
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button 
                  onClick={() => setEditingField(null)}
                  style={{ padding: '4px 8px', fontSize: 8, background: 'transparent', border: `1px solid ${accDim}`, color: dim, fontFamily: mono }}
                >CANCEL</button>
                <button 
                  onClick={() => saveEdit('intelLog')}
                  style={{ padding: '4px 8px', fontSize: 8, background: 'transparent', border: `1px solid ${acc}`, color: acc, fontFamily: mono }}
                >SAVE</button>
              </div>
            </div>
          ) : (
            <div 
              style={{ 
                flex: 1, 
                fontSize: 10, 
                color: op?.intelLog ? dim : accDim,
                cursor: 'pointer',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
              }}
              onClick={() => startEdit('intelLog', op?.intelLog)}
            >
              {op?.intelLog || '— click to add notes —'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharSheetPage4;