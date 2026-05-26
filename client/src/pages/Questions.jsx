import { useState, useEffect, useRef } from 'react';
import { questionService } from '../services/api';

const G = 'var(--gold)';
const Dim = 'var(--tx-mute)';

const DEFAULT_Q = {
  type: 'mcq', category: 'Must Know', subject: 'Combat Engineering',
  bloom: 'Knowledge', marks: 1,
  text: '', optionA: '', optionB: '', optionC: '', optionD: '',
  correctOptions: '', explanation: ''
};

export default function Questions() {
  const [questions,    setQuestions]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [uploading,    setUploading]    = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [formQ,        setFormQ]        = useState(DEFAULT_Q);
  const [submitting,   setSubmitting]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [notification, setNotification] = useState(null); // { message: '', type: 'success' | 'error' }
  const [editingId,    setEditingId]    = useState(null);
  const fileInputRef = useRef(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await questionService.getQuestions();
      setQuestions(res.data.questions || []); setError('');
    } catch { setError('Failed to load questions.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchQuestions(); }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      setUploading(true);
      setNotification(null);
      const startTime = Date.now();
      const res = await questionService.uploadQuestions(fd);
      
      const elapsed = Date.now() - startTime;
      const minDelay = 2000;
      if (elapsed < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
      }

      e.target.value = null; 
      fetchQuestions();
      const count = res.data?.count || 0;
      setNotification({ message: `${count} questions uploaded successfully`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) { 
      setNotification({ message: err.response?.data?.message || 'Failed to upload', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally { 
      setUploading(false); 
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete ALL questions? This cannot be undone.')) return;
    try { await questionService.deleteAllQuestions(); fetchQuestions(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to clear'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try { await questionService.deleteQuestion(id); fetchQuestions(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  const handleEdit = (q) => {
    setFormQ({
      type: q.type || 'mcq',
      category: q.category || 'Must Know',
      subject: q.subject || 'Combat Engineering',
      bloom: q.bloom || 'Knowledge',
      marks: q.marks || 1,
      text: q.text || '',
      optionA: q.optionA || '',
      optionB: q.optionB || '',
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      correctOptions: q.correctOptions || '',
      explanation: q.explanation || ''
    });
    setEditingId(q.id);
    setShowModal(true);
  };

  const handleTemplateDownload = () => {
    const headers = ['type','text','option_A','option_B','option_C','option_D','correct_options(A,B,C...)','category','subject','marks'];
    const rows = [
      ['mcq','Which CSS property changes text color?','font-color','text-color','color','background-color','C','Must Know','CSS','1'],
      ['mcq','Which company developed React?','Google','Meta','Microsoft','Amazon','B','Must Know','React','1'],
      ['truefalse','JavaScript can be used for backend development.','TRUE','FALSE','','','A','Must Know','JavaScript','1'],
      ['fillblank','The img tag is used to insert an image in HTML.','','','','','img','Must Know','HTML','1']
    ];
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(c => `"${(c||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = encodeURI(csv); a.download = 'quizflow_question_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const toggleCorrectOption = (opt) => {
    let curr = formQ.correctOptions ? formQ.correctOptions.split(',') : [];
    curr = curr.includes(opt) ? curr.filter(x => x !== opt) : [...curr, opt];
    setFormQ({ ...formQ, correctOptions: curr.join(',') });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formQ.text.trim()) { alert('Question text is required'); return; }
    if (formQ.type === 'mcq' && (!formQ.optionA || !formQ.optionB)) { alert('Options A and B required for MCQ'); return; }
    if (!formQ.correctOptions) { alert('Please mark at least one correct answer'); return; }
    try {
      setSubmitting(true);
      if (editingId) {
        await questionService.updateQuestion(editingId, formQ);
      } else {
        await questionService.createQuestion(formQ);
      }
      setShowModal(false); setFormQ(DEFAULT_Q); setEditingId(null); fetchQuestions();
    } catch (err) { alert(err.response?.data?.message || 'Failed to submit question'); }
    finally { setSubmitting(false); }
  };

  const filtered = questions.filter(q => {
    const matchSearch = !searchQuery.trim() || q.text.toLowerCase().includes(searchQuery.toLowerCase()) || q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = selectedType === 'all' || q.type === selectedType;
    const matchCategory = selectedCategory === 'all' || q.category === selectedCategory;
    return matchSearch && matchType && matchCategory;
  });

  const typeBadge = { mcq: { color: '#818cf8', bg: 'rgba(129,140,248,0.1)', label: 'MCQ' }, truefalse: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'T/F' }, fillblank: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Fill' } };
  const diffBadge = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#f43f5e' };

  return (
    <div className="space-y-5 animate-fade-in">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" className="hidden" />

      {/* Full-Screen Circular Spinning Loader Overlay */}
      {uploading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center font-sans select-none animate-fade-in" 
          style={{ background: 'rgba(8,23,12,0.92)', backdropFilter: 'blur(8px)' }}>
          <div className="text-center p-10 border max-w-md w-full rounded-2xl relative overflow-hidden" 
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
            <div className="w-16 h-16 border-4 border-dashed border-[#c9a227] rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-[20px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--gold)' }}>Syncing Question Pool</h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--tx-mute)' }}>
              Processing question roster import file. Please wait, compiling secure database questions...
            </p>
          </div>
        </div>
      )}

      {notification && (
        <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-between shadow-lg ${
          notification.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' 
            : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
        }`}>
          <span className="text-[13px] font-black uppercase tracking-wider flex items-center gap-2">
            {notification.type === 'success' ? '✓' : '⚠️'} {notification.message}
          </span>
          <button onClick={() => setNotification(null)} className="text-[14px] font-bold hover:text-white cursor-pointer select-none focus:outline-none">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="page-title">Question Bank</div>
          <div className="page-subtitle">{filtered.length} of {questions.length} questions · MCQ · True/False · Fill in Blanks</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleTemplateDownload} className="btn btn-secondary uppercase tracking-widest text-[11px] px-4 py-2">⬇ Template</button>
          <button onClick={handleClearAll} disabled={questions.length === 0} className="btn btn-danger uppercase tracking-widest text-[11px] px-4 py-2">✕ Clear All</button>
          <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="btn btn-secondary uppercase tracking-widest text-[11px] px-4 py-2">
            ⬆ {uploading ? 'Uploading...' : 'Import CSV'}
          </button>
          <button onClick={() => { setEditingId(null); setFormQ(DEFAULT_Q); setShowModal(true); }} className="btn btn-primary uppercase tracking-widest text-[11px] px-4 py-2">+ Add New</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input type="text" placeholder="Search questions..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)} className="form-input max-w-xs" />
        <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="form-input max-w-[180px]">
          <option value="all">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="truefalse">True/False</option>
          <option value="fillblank">Fill in Blanks</option>
        </select>
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="form-input max-w-[180px]">
          <option value="all">All Categories</option>
          <option value="Must Know">Must Know</option>
          <option value="Could Know">Could Know</option>
          <option value="May Know">May Know</option>
        </select>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Table */}
      <div className="card !p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Question</th>
              <th>Type</th>
              <th>Marks</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="py-12 text-center text-[13px]" style={{ color: Dim }}>Loading questions...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" className="py-12 text-center text-[13px]" style={{ color: Dim }}>No matching questions found.</td></tr>
            ) : filtered.map((q, idx) => {
              const tb = typeBadge[q.type] || typeBadge.mcq;
              return (
                <tr key={q.id}>
                  <td className="font-mono text-[11px]" style={{ color: Dim }}>{(idx+1).toString().padStart(2,'0')}</td>
                  <td>
                    <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--tx)' }}>{q.text}</div>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: Dim }}>{q.subject}</div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: tb.bg, color: tb.color, border: `1px solid ${tb.color}30` }}>{tb.label}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                        style={{
                          background: q.category === 'Must Know' ? 'rgba(244,63,94,0.1)' : q.category === 'Could Know' ? 'rgba(56,189,248,0.1)' : q.category === 'May Know' ? 'rgba(168,85,247,0.1)' : 'rgba(245,158,11,0.1)',
                          color: q.category === 'Must Know' ? '#f43f5e' : q.category === 'Could Know' ? '#38bdf8' : q.category === 'May Know' ? '#a855f7' : '#f59e0b',
                          border: `1px solid ${q.category === 'Must Know' ? '#f43f5e30' : q.category === 'Could Know' ? '#38bdf830' : q.category === 'May Know' ? '#a855f730' : '#f59e0b30'}`
                        }}>
                        {q.category}
                      </span>
                    </div>
                  </td>
                  <td className="font-mono font-bold" style={{ color: G }}>{q.marks}</td>
                  <td className="text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => handleEdit(q)} className="btn btn-secondary py-1.5 px-3 text-[11px] uppercase">Edit</button>
                      <button onClick={() => handleDelete(q.id)} className="btn btn-danger py-1.5 px-3 text-[11px] uppercase">Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          style={{ background: 'rgba(10,26,16,0.9)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-2xl border p-8 relative"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-center mb-6">
              <div className="text-[20px] font-black uppercase tracking-wide" style={{ color: G }}>{editingId ? 'Edit Question' : 'Add Question'}</div>
              <button onClick={() => setShowModal(false)} className="text-[18px] cursor-pointer transition-colors"
                style={{ color: Dim }} onMouseEnter={e => e.currentTarget.style.color='var(--tx)'} onMouseLeave={e => e.currentTarget.style.color=Dim}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Question Type</label>
                  <select value={formQ.type} onChange={e => setFormQ({ ...formQ, type: e.target.value, correctOptions: '' })} className="form-input">
                    <option value="mcq">MCQ (Single/Multi)</option>
                    <option value="truefalse">True / False</option>
                    <option value="fillblank">Fill in Blanks</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select value={formQ.category} onChange={e => setFormQ({ ...formQ, category: e.target.value })} className="form-input">
                    <option value="Must Know">Must Know</option>
                    <option value="Could Know">Could Know</option>
                    <option value="May Know">May Know</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Subject</label>
                <input type="text" value={formQ.subject} onChange={e => setFormQ({ ...formQ, subject: e.target.value })} placeholder="e.g. Combat Engineering" className="form-input" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="form-label">Marks</label>
                  <input type="number" value={formQ.marks} onChange={e => setFormQ({ ...formQ, marks: parseInt(e.target.value)||1 })} className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">Question Text *</label>
                <textarea rows="3" value={formQ.text} onChange={e => setFormQ({ ...formQ, text: e.target.value })}
                  placeholder="Type question content here..." className="form-input resize-none" required />
              </div>

              {formQ.type === 'mcq' && (
                <div>
                  <label className="form-label mb-2">Options — click the letter to mark correct answer(s)</label>
                  <div className="space-y-2.5">
                    {['A','B','C','D'].map(opt => {
                      const isCorrect = formQ.correctOptions.split(',').includes(opt);
                      return (
                        <div key={opt} className="flex items-center gap-3">
                          <button type="button" onClick={() => toggleCorrectOption(opt)}
                            className="w-9 h-9 flex items-center justify-center font-black rounded-lg border text-[14px] transition-all flex-shrink-0 cursor-pointer"
                            style={isCorrect ? { background: G, color: '#0a1a10', border: `1px solid ${G}` } : { background: 'rgba(0,0,0,0.3)', color: Dim, border: 'var(--border) 1px solid' }}>
                            {opt}
                          </button>
                          <input type="text" value={formQ[`option${opt}`]} onChange={e => setFormQ({ ...formQ, [`option${opt}`]: e.target.value })}
                            placeholder={`Option ${opt}`} className="form-input flex-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formQ.type === 'truefalse' && (
                <div>
                  <label className="form-label mb-2">Select Correct Option</label>
                  <div className="flex gap-3">
                    {['A','B'].map(opt => {
                      const isCorrect = formQ.correctOptions === opt;
                      return (
                        <button key={opt} type="button"
                          onClick={() => setFormQ({ ...formQ, optionA: 'True', optionB: 'False', correctOptions: opt })}
                          className="py-3 px-6 rounded-lg font-bold border text-[13px] uppercase tracking-widest transition-all cursor-pointer"
                          style={isCorrect ? { background: G, color: '#0a1a10', border: `1px solid ${G}` } : { background: 'rgba(0,0,0,0.3)', color: Dim, border: '1px solid var(--border)' }}>
                          {opt === 'A' ? 'True (A)' : 'False (B)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {formQ.type === 'fillblank' && (
                <div>
                  <label className="form-label">Correct Answer</label>
                  <input type="text" value={formQ.correctOptions} onChange={e => setFormQ({ ...formQ, correctOptions: e.target.value })}
                    placeholder="Enter correct answer word or value..." className="form-input" required />
                </div>
              )}



              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">
                  {submitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Save Changes' : 'Add Question')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
