import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { STAT_META, StatKey } from '@/types';
import { useToast } from '@/hooks/use-toast';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const bright = 'hsl(var(--accent-bright))';
const dim = 'hsl(var(--text-dim))';
const adim = 'hsl(var(--accent-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';
const bgT = 'hsl(var(--bg-tertiary))';
const TOP_CATEGORIES = ['Physical', 'Knowledge', 'Creation', 'Career', 'Social', 'Exploration', 'Inner Path', 'Home', 'Technology'];
const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

interface ExistingSkill { id: string; name: string; stat_keys: StatKey[]; lifepath_id: string | null; }
interface AddedSkill { type: 'existing' | 'new'; id?: string; name: string; stat_keys: StatKey[]; default_split: number[]; notes?: string; }
interface AddedTool { id: string; name: string; type: string; }
interface Props { onClose: () => void; initialCategory?: string; }

export default function CreateLifepathModal({ onClose, initialCategory }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'skills'>('info');
  const [pickerPage, setPickerPage] = useState<'skills' | 'tools'>('skills');
  const [category, setCategory] = useState(initialCategory ?? 'Physical');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [addedSkills, setAddedSkills] = useState<AddedSkill[]>([]);
  const [addedTools, setAddedTools] = useState<AddedTool[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [toolSearch, setToolSearch] = useState('');
  const [skillStatTab, setSkillStatTab] = useState<StatKey | 'ALL'>('ALL');
  const [toolTypeTab, setToolTypeTab] = useState<string>('ALL');
  const [showNewSkill, setShowNewSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillNotes, setNewSkillNotes] = useState('');
  const [newSkillPrimary, setNewSkillPrimary] = useState<StatKey>('body');
  const [newSkillSecondary, setNewSkillSecondary] = useState<StatKey | ''>('');
  const [newSkillSplit, setNewSkillSplit] = useState(50);
  const [newSkillError, setNewSkillError] = useState('');
  const hasDual = newSkillSecondary !== '';

  const { data: allTools = [] } = useQuery({
    queryKey: ['all-tools-for-lifepath'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query(`SELECT id, name, type FROM tools ORDER BY name;`);
      return res.rows as AddedTool[];
    },
  });

  const { data: allSkills = [] } = useQuery({
    queryKey: ['all-skills-for-lifepath'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<ExistingSkill>(`SELECT id, name, stat_keys, lifepath_id FROM skills ORDER BY name;`);
      return res.rows;
    },
  });

  const pendingNames = new Set(addedSkills.map((s) => s.name.toLowerCase()));
  const toolTypes = ['ALL', ...Array.from(new Set(allTools.map((t) => t.type))).sort()];
  const filteredSkills = allSkills.filter((s) => skillSearch && s.name.toLowerCase().includes(skillSearch.toLowerCase()) && !addedSkills.find((a) => a.id === s.id));
  const filteredTools = allTools.filter((t) => toolSearch && t.name.toLowerCase().includes(toolSearch.toLowerCase()) && !addedTools.find((a) => a.id === t.id));
  const tabbedSkills = allSkills.filter((s) => {
    if (addedSkills.find((a) => a.id === s.id)) return false;
    const keys = Array.isArray(s.stat_keys) ? s.stat_keys : JSON.parse((s.stat_keys as unknown as string) || '[]');
    return skillStatTab === 'ALL' ? true : keys.includes(skillStatTab);
  });
  const tabbedTools = allTools.filter((t) => !addedTools.find((a) => a.id === t.id) && (toolTypeTab === 'ALL' || t.type === toolTypeTab));

  const checkLifepathDupe = async (n: string, cat: string) => {
    const db = await getDB();
    const res = await db.query(`SELECT id FROM lifepaths WHERE LOWER(name) = LOWER($1) AND category = $2 LIMIT 1;`, [n, cat]);
    return res.rows.length > 0;
  };

  const createLifepath = useMutation({
    mutationFn: async () => {
      const db = await getDB();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.query(`INSERT INTO lifepaths (id, name, category, description, active, sort_order) VALUES ($1, $2, $3, $4, true, 0);`, [id, name.trim(), category, description.trim() || null]);
      for (const tool of addedTools) await db.query(`INSERT INTO tool_lifepaths (tool_id, lifepath_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [tool.id, id]);
      for (const skill of addedSkills) {
        if (skill.type === 'existing' && skill.id) {
          await db.exec(`UPDATE skills SET lifepath_id = '${id}', active = true WHERE id = '${skill.id}';`);
        } else {
          const sid = crypto.randomUUID();
          await db.query(
            `INSERT INTO skills (id, name, stat_keys, default_split, lifepath_id, notes, is_custom, active, created_at) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7);`,
            [sid, skill.name, JSON.stringify(skill.stat_keys), JSON.stringify(skill.default_split), id, skill.notes ?? null, now]
          );
        }
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifepaths'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['lifepath-skills-all'] });
      queryClient.invalidateQueries({ queryKey: ['all-skills-for-lifepath'] });
      queryClient.invalidateQueries({ queryKey: ['all-tools-for-lifepath'] });
      queryClient.invalidateQueries({ queryKey: ['tools-for-lifepath'] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast({ title: '✓ LIFEPATH CREATED', description: `${name.trim()} added to ${category}` });
      onClose();
    },
    onError: (err) => toast({ title: 'ERROR', description: String(err) }),
  });

  const handleNext = async () => {
    if (!name.trim()) return setNameError('Name required');
    if (await checkLifepathDupe(name.trim(), category)) return setNameError(`"${name.trim()}" already exists in ${category}`);
    setNameError('');
    setStep('skills');
  };

  const handleAddExisting = (skill: ExistingSkill) => {
    const keys = Array.isArray(skill.stat_keys) ? skill.stat_keys : JSON.parse((skill.stat_keys as unknown as string) || '[]');
    setAddedSkills((prev) => [...prev, { type: 'existing', id: skill.id, name: skill.name, stat_keys: keys, default_split: keys.length === 2 ? [50, 50] : [100] }]);
    setSkillSearch('');
  };

  const handleAddTool = (tool: AddedTool) => {
    setAddedTools((prev) => prev.find((t) => t.id === tool.id) ? prev : [...prev, tool]);
    setToolSearch('');
  };

  const handleAddNewSkill = () => {
    if (!newSkillName.trim()) return;
    if (pendingNames.has(newSkillName.trim().toLowerCase())) return setNewSkillError(`"${newSkillName.trim()}" already added`);
    if (allSkills.find((s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) return setNewSkillError(`"${newSkillName.trim()}" already exists - use search to add it`);
    const statKeys = hasDual ? [newSkillPrimary, newSkillSecondary as StatKey] : [newSkillPrimary];
    const defaultSplit = hasDual ? [newSkillSplit, 100 - newSkillSplit] : [100];
    setAddedSkills((prev) => [...prev, { type: 'new', name: newSkillName.trim(), stat_keys: statKeys, default_split: defaultSplit, notes: newSkillNotes.trim() || undefined }]);
    setNewSkillName('');
    setNewSkillNotes('');
    setNewSkillPrimary('body');
    setNewSkillSecondary('');
    setNewSkillSplit(50);
    setNewSkillError('');
    setShowNewSkill(false);
  };

  const addedSkillList = (
    <div>
      <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>SKILLS ADDED ({addedSkills.length})</div>
      {addedSkills.length === 0 && <div style={{ fontSize: 10, color: dim, padding: '8px 0', opacity: 0.6 }}>No skills added yet - browse by stat, search below, or create a new one.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {addedSkills.map((skill, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(255,176,0,0.05)', border: `1px solid rgba(255,176,0,0.2)` }}>
            <span style={{ fontSize: 8, color: skill.type === 'new' ? '#44ff88' : adim }}>{skill.type === 'new' ? '* NEW' : 'O EXT'}</span>
            <span style={{ flex: 1, fontSize: 11, color: acc }}>{skill.name}</span>
            <span style={{ fontSize: 9, color: adim }}>{skill.stat_keys.map((k) => `${STAT_META[k].icon} ${k.toUpperCase()}`).join(' / ')}</span>
            <button onClick={() => setAddedSkills((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: dim, cursor: 'pointer', fontSize: 12 }}>X</button>
          </div>
        ))}
      </div>
    </div>
  );

  const addedToolList = (
    <div>
      <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>TOOLS ADDED ({addedTools.length})</div>
      {addedTools.length === 0 && <div style={{ fontSize: 10, color: dim, padding: '8px 0', opacity: 0.6 }}>No tools added yet - browse by type or search below.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {addedTools.map((tool, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'rgba(255,176,0,0.04)', border: `1px solid rgba(255,176,0,0.2)` }}>
            <span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px' }}>{tool.type.slice(0, 3).toUpperCase()}</span>
            <span style={{ flex: 1, fontSize: 11, color: acc }}>{tool.name}</span>
            <button onClick={() => setAddedTools((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: dim, cursor: 'pointer', fontSize: 12 }}>X</button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 700, maxWidth: 'calc(100vw - 40px)', maxHeight: '90vh', background: bgP, border: `1px solid ${adim}`, boxShadow: '0 0 40px rgba(255,176,0,0.12)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// LIFEPATH</span>
          <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>CREATE LIFEPATH</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>{['info', 'skills'].map((s) => <div key={s} style={{ width: 24, height: 4, background: step === s ? acc : adim, opacity: step === s ? 1 : 0.4 }} />)}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer', letterSpacing: 1, padding: '2px 8px' }}>X CLOSE</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {step === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>TOP-LEVEL CATEGORY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TOP_CATEGORIES.map((cat) => <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '6px 14px', fontSize: 10, fontFamily: mono, cursor: 'pointer', letterSpacing: 1, border: `1px solid ${category === cat ? acc : adim}`, background: category === cat ? 'rgba(255,176,0,0.1)' : 'transparent', color: category === cat ? acc : dim }}>{cat}</button>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>LIFEPATH NAME <span style={{ opacity: 0.6 }}>(e.g. Strength Training)</span></div>
                <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleNext()} placeholder="Enter lifepath name..." style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${nameError ? 'hsl(0,80%,55%)' : adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
                {nameError && <div style={{ fontSize: 9, color: 'hsl(0,80%,55%)', marginTop: 4 }}>{nameError}</div>}
              </div>
              <div>
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>DESCRIPTION <span style={{ opacity: 0.6 }}>(optional)</span></div>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this lifepath..." rows={3} style={{ width: '100%', padding: '8px 12px', fontSize: 11, resize: 'vertical', boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
              </div>
            </div>
          )}

          {step === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => setPickerPage('skills')} style={{ padding: '6px 14px', fontSize: 10, fontFamily: mono, cursor: 'pointer', letterSpacing: 1, border: `1px solid ${pickerPage === 'skills' ? acc : adim}`, background: pickerPage === 'skills' ? 'rgba(255,176,0,0.1)' : 'transparent', color: pickerPage === 'skills' ? acc : dim }}>SKILLS ({addedSkills.length})</button>
                <button onClick={() => setPickerPage('tools')} style={{ padding: '6px 14px', fontSize: 10, fontFamily: mono, cursor: 'pointer', letterSpacing: 1, border: `1px solid ${pickerPage === 'tools' ? acc : adim}`, background: pickerPage === 'tools' ? 'rgba(255,176,0,0.1)' : 'transparent', color: pickerPage === 'tools' ? acc : dim }}>TOOLS ({addedTools.length})</button>
              </div>

              {pickerPage === 'skills' && (
                <>
                  {addedSkillList}
                  <div style={{ height: 1, background: adim, opacity: 0.3 }} />
                  <div>
                    <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>BROWSE EXISTING SKILLS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      <button onClick={() => setSkillStatTab('ALL')} style={{ padding: '4px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${skillStatTab === 'ALL' ? acc : adim}`, background: skillStatTab === 'ALL' ? 'rgba(255,176,0,0.1)' : 'transparent', color: skillStatTab === 'ALL' ? acc : dim }}>ALL</button>
                      {STAT_KEYS.map((key) => <button key={key} onClick={() => setSkillStatTab(key)} style={{ padding: '4px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${skillStatTab === key ? acc : adim}`, background: skillStatTab === key ? 'rgba(255,176,0,0.1)' : 'transparent', color: skillStatTab === key ? acc : dim }}>{STAT_META[key].icon} {STAT_META[key].name}</button>)}
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${adim}`, background: bgS }}>
                      {tabbedSkills.length === 0 ? <div style={{ padding: '10px 12px', fontSize: 10, color: dim }}>No available skills in this tab.</div> : tabbedSkills.slice(0, 40).map((skill) => <div key={skill.id} onClick={() => handleAddExisting(skill)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid rgba(153,104,0,0.2)` }}><span style={{ flex: 1, fontSize: 11, color: acc }}>{skill.name}</span><span style={{ fontSize: 9, color: adim }}>{(Array.isArray(skill.stat_keys) ? skill.stat_keys : JSON.parse((skill.stat_keys as unknown as string) || '[]')).map((k: StatKey) => `${STAT_META[k].icon} ${k.toUpperCase()}`).join(' / ')}</span><span style={{ fontSize: 9, color: '#44ff88' }}>+ ADD</span></div>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>SEARCH EXISTING SKILLS</div>
                    <input value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="Type to search existing skills..." style={{ width: '100%', padding: '8px 12px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
                    {skillSearch && <div style={{ marginTop: 4, maxHeight: 160, overflowY: 'auto', border: `1px solid ${adim}`, background: bgS }}>{filteredSkills.length === 0 ? <div style={{ padding: '10px 12px', fontSize: 10, color: dim }}>No matching skills - create one below</div> : filteredSkills.slice(0, 20).map((skill) => <div key={skill.id} onClick={() => handleAddExisting(skill)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid rgba(153,104,0,0.2)` }}><span style={{ flex: 1, fontSize: 11, color: acc }}>{skill.name}</span><span style={{ fontSize: 9, color: adim }}>{(Array.isArray(skill.stat_keys) ? skill.stat_keys : JSON.parse((skill.stat_keys as unknown as string) || '[]')).map((k: StatKey) => `${STAT_META[k].icon} ${k.toUpperCase()}`).join(' / ')}</span><span style={{ fontSize: 9, color: '#44ff88' }}>+ ADD</span></div>)}</div>}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 9, color: adim, letterSpacing: 2 }}>CREATE NEW SKILL</div>
                      <button onClick={() => { setShowNewSkill(!showNewSkill); setNewSkillError(''); }} style={{ padding: '3px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1, border: `1px solid ${showNewSkill ? adim : acc}`, background: 'transparent', color: showNewSkill ? dim : acc }}>{showNewSkill ? '- CANCEL' : '+ NEW SKILL'}</button>
                    </div>
                    {showNewSkill && <div style={{ padding: '16px', background: bgS, border: `1px solid ${adim}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div><div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>SKILL NAME <span style={{ color: acc }}>*</span></div><input autoFocus value={newSkillName} onChange={(e) => { setNewSkillName(e.target.value); setNewSkillError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleAddNewSkill()} placeholder="Skill name..." style={{ width: '100%', padding: '7px 10px', fontSize: 11, boxSizing: 'border-box', background: bgP, border: `1px solid ${newSkillError ? 'hsl(0,80%,55%)' : adim}`, color: acc, fontFamily: mono, outline: 'none' }} />{newSkillError && <div style={{ fontSize: 9, color: 'hsl(0,80%,55%)', marginTop: 4 }}>{newSkillError}</div>}</div>
                      <div><div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>PRIMARY STAT <span style={{ color: acc }}>*</span></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{STAT_KEYS.map((key) => <button key={key} className="topbar-btn" onClick={() => { setNewSkillPrimary(key); if (newSkillSecondary === key) setNewSkillSecondary(''); }} style={{ border: `1px solid ${newSkillPrimary === key ? acc : adim}`, color: newSkillPrimary === key ? bright : dim, boxShadow: newSkillPrimary === key ? '0 0 6px rgba(255,176,0,0.3)' : 'none' }}>{STAT_META[key].icon} {STAT_META[key].name}</button>)}</div></div>
                      <div><div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>SECONDARY STAT <span style={{ color: dim }}>(optional)</span></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}><button className="topbar-btn" onClick={() => setNewSkillSecondary('')} style={{ border: `1px solid ${newSkillSecondary === '' ? acc : adim}`, color: newSkillSecondary === '' ? bright : dim }}>NONE</button>{STAT_KEYS.filter((key) => key !== newSkillPrimary).map((key) => <button key={key} className="topbar-btn" onClick={() => setNewSkillSecondary(key)} style={{ border: `1px solid ${newSkillSecondary === key ? acc : adim}`, color: newSkillSecondary === key ? bright : dim, boxShadow: newSkillSecondary === key ? '0 0 6px rgba(255,176,0,0.3)' : 'none' }}>{STAT_META[key].icon} {STAT_META[key].name}</button>)}</div></div>
                      {hasDual && <div><div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 8 }}>DEFAULT SPLIT</div><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 10, color: acc, width: 80 }}>{STAT_META[newSkillSecondary as StatKey].icon} {STAT_META[newSkillSecondary as StatKey].name}</span><input type="range" className="ql-split-slider" min={10} max={90} step={5} value={newSkillSplit} onChange={(e) => setNewSkillSplit(Number(e.target.value))} style={{ flex: 1 }} /><span style={{ fontSize: 10, color: acc, width: 80, textAlign: 'right' }}>{STAT_META[newSkillPrimary].icon} {STAT_META[newSkillPrimary].name}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: dim, marginTop: 4 }}><span>{100 - newSkillSplit}%</span><span>{newSkillSplit}%</span></div></div>}
                      <div><div style={{ fontSize: 9, color: adim, letterSpacing: 1, marginBottom: 6 }}>NOTES <span style={{ color: dim }}>(optional)</span></div><input value={newSkillNotes} onChange={(e) => setNewSkillNotes(e.target.value)} placeholder="Any notes about this skill..." style={{ width: '100%', padding: '7px 10px', fontSize: 11, boxSizing: 'border-box', background: bgP, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} /></div>
                      <button onClick={handleAddNewSkill} disabled={!newSkillName.trim()} style={{ padding: '7px 16px', fontSize: 10, alignSelf: 'flex-start', letterSpacing: 1, border: `1px solid ${newSkillName.trim() ? acc : adim}`, background: newSkillName.trim() ? 'rgba(255,176,0,0.1)' : 'transparent', color: newSkillName.trim() ? acc : dim, fontFamily: mono, cursor: newSkillName.trim() ? 'pointer' : 'not-allowed' }}>+ ADD SKILL</button>
                    </div>}
                  </div>
                </>
              )}

              {pickerPage === 'tools' && (
                <>
                  {addedToolList}
                  <div style={{ height: 1, background: adim, opacity: 0.3 }} />
                  <div>
                    <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>BROWSE EXISTING TOOLS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>{toolTypes.map((type) => <button key={type} onClick={() => setToolTypeTab(type)} style={{ padding: '4px 10px', fontSize: 9, fontFamily: mono, cursor: 'pointer', border: `1px solid ${toolTypeTab === type ? acc : adim}`, background: toolTypeTab === type ? 'rgba(255,176,0,0.1)' : 'transparent', color: toolTypeTab === type ? acc : dim }}>{type.toUpperCase()}</button>)}</div>
                    <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${adim}`, background: bgS }}>{tabbedTools.length === 0 ? <div style={{ padding: '10px 12px', fontSize: 10, color: dim }}>No available tools in this tab.</div> : tabbedTools.slice(0, 40).map((tool) => <div key={tool.id} onClick={() => handleAddTool(tool)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', borderBottom: `1px solid rgba(153,104,0,0.2)` }}><span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px' }}>{tool.type.slice(0, 3).toUpperCase()}</span><span style={{ flex: 1, fontSize: 11, color: acc }}>{tool.name}</span><span style={{ fontSize: 9, color: '#44ff88' }}>+ ADD</span></div>)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 8 }}>SEARCH EXISTING TOOLS</div>
                    <input value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} placeholder="Search existing tools..." style={{ width: '100%', padding: '7px 10px', fontSize: 11, boxSizing: 'border-box', background: bgS, border: `1px solid ${adim}`, color: acc, fontFamily: mono, outline: 'none' }} />
                    {toolSearch && <div style={{ maxHeight: 140, overflowY: 'auto', border: `1px solid ${adim}`, borderTop: 'none', background: bgS }}>{filteredTools.length === 0 ? <div style={{ padding: '8px 10px', fontSize: 10, color: dim }}>No matching tools - add via Tools page first</div> : filteredTools.slice(0, 15).map((tool) => <div key={tool.id} onClick={() => handleAddTool(tool)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', borderBottom: `1px solid rgba(153,104,0,0.2)` }}><span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px' }}>{tool.type.slice(0, 3).toUpperCase()}</span><span style={{ flex: 1, fontSize: 11, color: acc }}>{tool.name}</span><span style={{ fontSize: 9, color: '#44ff88' }}>+ ADD</span></div>)}</div>}
                  </div>
                </>
              )}

              <div style={{ opacity: 0.4 }}>
                <div style={{ height: 1, background: adim, opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 4 }}>ADD AUGMENTS</div>
                <div style={{ fontSize: 10, color: dim }}>Augments system coming soon.</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${adim}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {step === 'skills' && <button onClick={() => setStep('info')} style={{ padding: '7px 16px', fontSize: 10, fontFamily: mono, cursor: 'pointer', letterSpacing: 1, border: `1px solid ${adim}`, background: 'transparent', color: dim }}>{'< BACK'}</button>}
          <div style={{ flex: 1 }} />
          {step === 'info' ? (
            <>
              <button onClick={async () => { if (!name.trim()) return setNameError('Name required'); if (await checkLifepathDupe(name.trim(), category)) return setNameError(`"${name.trim()}" already exists in ${category}`); createLifepath.mutate(); }} disabled={!name.trim() || createLifepath.isPending} style={{ padding: '7px 20px', fontSize: 10, fontFamily: mono, letterSpacing: 1, border: `1px solid ${adim}`, background: 'transparent', color: dim, cursor: name.trim() ? 'pointer' : 'not-allowed' }}>CREATE EMPTY</button>
              <button onClick={handleNext} disabled={!name.trim()} style={{ padding: '7px 20px', fontSize: 10, fontFamily: mono, letterSpacing: 1, border: `1px solid ${name.trim() ? acc : adim}`, background: name.trim() ? 'rgba(255,176,0,0.1)' : 'transparent', color: name.trim() ? acc : dim, cursor: name.trim() ? 'pointer' : 'not-allowed' }}>{'ADD SKILLS >'}</button>
            </>
          ) : (
            <>
              <button onClick={() => createLifepath.mutate()} disabled={createLifepath.isPending} style={{ padding: '7px 20px', fontSize: 10, fontFamily: mono, letterSpacing: 1, border: `1px solid ${adim}`, background: 'transparent', color: dim, cursor: 'pointer' }}>SKIP - CREATE EMPTY</button>
              <button onClick={() => createLifepath.mutate()} disabled={createLifepath.isPending} style={{ padding: '7px 20px', fontSize: 10, fontFamily: mono, letterSpacing: 1, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, cursor: 'pointer' }}>{createLifepath.isPending ? 'CREATING...' : `CREATE WITH ${addedSkills.length} SKILL${addedSkills.length !== 1 ? 'S' : ''}${addedTools.length ? ` / ${addedTools.length} TOOL${addedTools.length !== 1 ? 'S' : ''}` : ''}`}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
