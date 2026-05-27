import { useState, useEffect, useRef } from 'react';
import { examService, questionService, candidateService, resultService } from '../services/api';

const AVAILABLE_UNITS = [
  'HQ BEG', '21 Engr Regt', '22 Engr Regt', 'A Coy', 'B Coy', 'C Coy',
  'HQ Coy', 'Support Coy', 'Field Coy', 'Workshop', 'Signals Platoon'
];

const DEFAULT_FORM = {
  title: '', code: '', subject: '', course: '',
  durationMinutes: 30, allowedAttempts: 1, units: [],
  randomizeOrder: true, shuffleOptions: false, showResult: true,
  instructions: '1. All questions are compulsory.\n2. Do not switch tabs during the exam.\n3. Submit before timer expires.',
  questionIds: [], mcqMustKnowCount: '', mcqCouldKnowCount: '', mcqMayKnowCount: '', fillblankMustKnowCount: '', fillblankCouldKnowCount: '', fillblankMayKnowCount: '', truefalseMustKnowCount: '', truefalseCouldKnowCount: '', truefalseMayKnowCount: ''
};

const G = 'var(--gold)';
const Dim = 'var(--tx-mute)';

const Toggle = ({ value, onChange, label }) => (
  <div className="flex items-center gap-2.5">
    <button type="button" onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${value ? 'bg-emerald-600' : 'bg-neutral-700'}`}>
      <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: Dim }}>{label}</span>
  </div>
);

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Grading console state
  const [gradingConsoleOpen, setGradingConsoleOpen] = useState(false);
  const [selectedGradingExam, setSelectedGradingExam] = useState(null);
  const [allCandidatesList, setAllCandidatesList] = useState([]);
  const [examAttemptsList, setExamAttemptsList] = useState([]);
  const [gradingSearchQuery, setGradingSearchQuery] = useState('');
  const [gradingUnitFilter, setGradingUnitFilter] = useState('');
  const [loadingGradingData, setLoadingGradingData] = useState(false);
  const [activeGradingCandidate, setActiveGradingCandidate] = useState(null);
  const [gradingQuizScore, setGradingQuizScore] = useState(0);
  const [gradingPracticalMarks, setGradingPracticalMarks] = useState(0);
  const [gradingVivaMarks, setGradingVivaMarks] = useState(0);
  const [gradingSubjectiveMarks, setGradingSubjectiveMarks] = useState(0);
  const [gradingReason, setGradingReason] = useState('First time grading');
  const [gradingError, setGradingError] = useState('');
  const [gradingSubmitting, setGradingSubmitting] = useState(false);

  // ── CSV import ────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      setUploading(true);
      const res = await questionService.uploadQuestions(fd);
      e.target.value = null;
      if (res.data?.questions) {
        const nq = res.data.questions;
        await fetchData();
        let mcqMustKnow = 0, mcqCouldKnow = 0, mcqMayKnow = 0, fillMustKnow = 0, fillCouldKnow = 0, fillMayKnow = 0, tfMustKnow = 0, tfCouldKnow = 0, tfMayKnow = 0;
        nq.forEach(q => {
          if (q.type === 'mcq') {
            if (q.category === 'Must Know') mcqMustKnow++;
            else if (q.category === 'Could Know') mcqCouldKnow++;
            else if (q.category === 'May Know') mcqMayKnow++;
          }
          else if (q.type === 'fillblank') {
            if (q.category === 'Must Know') fillMustKnow++;
            else if (q.category === 'Could Know') fillCouldKnow++;
            else if (q.category === 'May Know') fillMayKnow++;
          }
          else if (q.type === 'truefalse') {
            if (q.category === 'Must Know') tfMustKnow++;
            else if (q.category === 'Could Know') tfCouldKnow++;
            else if (q.category === 'May Know') tfMayKnow++;
          }
        });
        setFormData(p => ({
          ...p,
          questionIds: nq.map(q => q.id),
          randomizeOrder: true,
          mcqMustKnowCount: mcqMustKnow,
          mcqCouldKnowCount: mcqCouldKnow,
          mcqMayKnowCount: mcqMayKnow,
          fillblankMustKnowCount: fillMustKnow,
          fillblankCouldKnowCount: fillCouldKnow,
          fillblankMayKnowCount: fillMayKnow,
          truefalseMustKnowCount: tfMustKnow,
          truefalseCouldKnowCount: tfCouldKnow,
          truefalseMayKnowCount: tfMayKnow
        }));
        alert(`Imported ${res.data.count} questions. MCQ (Must Know): ${mcqMustKnow}, MCQ (Could Know): ${mcqCouldKnow}, MCQ (May Know): ${mcqMayKnow}, Fill (Must Know): ${fillMustKnow}, Fill (Could Know): ${fillCouldKnow}, Fill (May Know): ${fillMayKnow}, T/F (Must Know): ${tfMustKnow}, T/F (Could Know): ${tfCouldKnow}, T/F (May Know): ${tfMayKnow}`);
      } else alert('Imported but no records received.');
    } catch (err) { alert(err.response?.data?.message || 'Failed to upload'); }
    finally { setUploading(false); }
  };

  const handleTemplateDownload = () => {
    const h = ['type', 'text', 'option_A', 'option_B', 'option_C', 'option_D', 'correct_options(A,B,C...)', 'category', 'subject', 'marks'];
    const rows = [
      ['mcq', 'Which CSS property changes text color?', 'font-color', 'text-color', 'color', 'background-color', 'C', 'Must Know', 'CSS', '1'],
      ['mcq', 'Which company developed React?', 'Google', 'Meta', 'Microsoft', 'Amazon', 'B', 'Must Know', 'React', '1'],
      ['truefalse', 'JavaScript can be used for backend development.', 'TRUE', 'FALSE', '', '', 'A', 'Must Know', 'JavaScript', '1'],
      ['fillblank', 'The img tag is used to insert an image in HTML.', '', '', '', '', 'img', 'Must Know', 'HTML', '1']
    ];
    const csv = 'data:text/csv;charset=utf-8,' + [h.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = encodeURI(csv); a.download = 'quizflow_question_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Grading console ───────────────────────────────────────────────────────
  const handleOpenGradingConsole = async (exam) => {
    setSelectedGradingExam(exam); setGradingConsoleOpen(true); setLoadingGradingData(true);
    setGradingSearchQuery(''); setGradingUnitFilter(''); setActiveGradingCandidate(null);
    try {
      const [cRes, rRes] = await Promise.all([candidateService.getCandidates({ limit: 1000 }), resultService.getResults({ examId: exam.id })]);
      setAllCandidatesList(cRes.data?.candidates || []);
      setExamAttemptsList(rRes.data?.results || []);
    } catch (err) { alert('Failed to load grading roster: ' + (err.response?.data?.message || err.message)); }
    finally { setLoadingGradingData(false); }
  };

  const handleOpenCandidateGradeForm = (candidate, existing = null) => {
    setActiveGradingCandidate(candidate); setGradingError('');
    setGradingReason(existing?.reason || 'Administrative marks allocation');
    setGradingQuizScore(existing?.quizScore ?? 0);
    setGradingPracticalMarks(existing?.practicalMarks ?? 0);
    setGradingVivaMarks(existing?.vivaMarks ?? 0);
    setGradingSubjectiveMarks(existing?.subjectiveMarks ?? 0);
  };

  const handleSaveCandidateGrades = async (e) => {
    e.preventDefault();
    if (!activeGradingCandidate || !selectedGradingExam) return;
    setGradingError('');
    const pQ = parseInt(gradingQuizScore), pP = parseInt(gradingPracticalMarks), pV = parseInt(gradingVivaMarks);
    if (isNaN(pQ) || pQ < 0 || pQ > selectedGradingExam.totalMarks) { setGradingError(`Written score must be 0–${selectedGradingExam.totalMarks}.`); return; }
    if (isNaN(pP) || pP < 0 || pP > 20) { setGradingError('Practical must be 0–20.'); return; }
    if (isNaN(pV) || pV < 0 || pV > 20) { setGradingError('Viva must be 0–20.'); return; }
    try {
      setGradingSubmitting(true);
      let attempt = examAttemptsList.find(a => a.candidateId === activeGradingCandidate.id);
      let attemptId;
      if (!attempt) { const ir = await resultService.initializeAttempt({ candidateId: activeGradingCandidate.id, examId: selectedGradingExam.id }); attemptId = ir.data?.attempt?.id; }
      else { attemptId = attempt.id; }
      await resultService.overrideMarks(attemptId, { newMarks: pQ, practicalMarks: pP, vivaMarks: pV, subjectiveMarks: 0, reason: gradingReason.trim() });
      const rRes = await resultService.getResults({ examId: selectedGradingExam.id });
      setExamAttemptsList(rRes.data?.results || []);
      setActiveGradingCandidate(null);
    } catch (err) { setGradingError(err.response?.data?.message || 'Failed to save grades.'); }
    finally { setGradingSubmitting(false); }
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const [eRes, qRes] = await Promise.allSettled([examService.getExams(), questionService.getQuestions()]);
      if (eRes.status === 'fulfilled') setExams(eRes.value.data?.exams || []);
      if (qRes.status === 'fulfilled') setQuestions(qRes.value.data?.questions || []);
    } catch (err) { console.error('Error loading exams data:', err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (showModal) fetchData(); }, [showModal]);

  const handleToggleActive = async (id) => {
    try { await examService.toggleExamStatus(id); fetchData(); }
    catch (err) { alert('Failed to toggle: ' + (err.response?.data?.message || err.message)); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this examination?')) return;
    try { await examService.deleteExam(id); fetchData(); }
    catch (err) { alert('Failed to delete: ' + (err.response?.data?.message || err.message)); }
  };

  const handleUnitClick = (unit) => {
    setFormData(p => ({ ...p, units: p.units.includes(unit) ? p.units.filter(u => u !== unit) : [...p.units, unit] }));
  };

  const handleEditClick = (exam) => {
    const qIds = exam.questions.map(eq => eq.questionId);
    const units = exam.units ? exam.units.split(', ').map(u => u.trim()) : [];
    let mcqMustKnow = 0, mcqCouldKnow = 0, mcqMayKnow = 0, fillMustKnow = 0, fillCouldKnow = 0, fillMayKnow = 0, tfMustKnow = 0, tfCouldKnow = 0, tfMayKnow = 0;
    exam.questions.forEach(eq => {
      const q = eq.question;
      if (q) {
        if (q.type === 'mcq') {
          if (q.category === 'Must Know') mcqMustKnow++;
          else if (q.category === 'Could Know') mcqCouldKnow++;
          else if (q.category === 'May Know') mcqMayKnow++;
        }
        else if (q.type === 'fillblank') {
          if (q.category === 'Must Know') fillMustKnow++;
          else if (q.category === 'Could Know') fillCouldKnow++;
          else if (q.category === 'May Know') fillMayKnow++;
        }
        else if (q.type === 'truefalse') {
          if (q.category === 'Must Know') tfMustKnow++;
          else if (q.category === 'Could Know') tfCouldKnow++;
          else if (q.category === 'May Know') tfMayKnow++;
        }
      }
    });
    setFormData({
      title: exam.title || '', code: exam.code || '', subject: exam.subject || '', course: exam.course || '',
      durationMinutes: exam.durationMinutes || 30, allowedAttempts: exam.allowedAttempts || 1, units,
      randomizeOrder: exam.randomizeOrder ?? true, shuffleOptions: exam.shuffleOptions ?? false, showResult: exam.showResult ?? true,
      instructions: exam.instructions || '', questionIds: qIds,
      mcqMustKnowCount: mcqMustKnow, mcqCouldKnowCount: mcqCouldKnow, mcqMayKnowCount: mcqMayKnow,
      fillblankMustKnowCount: fillMustKnow, fillblankCouldKnowCount: fillCouldKnow, fillblankMayKnowCount: fillMayKnow,
      truefalseMustKnowCount: tfMustKnow, truefalseCouldKnowCount: tfCouldKnow, truefalseMayKnowCount: tfMayKnow
    });
    setEditingExamId(exam.id); setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert('Exam title is required.');
    const shuffle = (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[c[i], c[j]] = [c[j], c[i]]; } return c; };
    const chosen = [
      ...shuffle(questions.filter(q => q.type === 'mcq' && q.category === 'Must Know')).slice(0, parseInt(formData.mcqMustKnowCount) || 0),
      ...shuffle(questions.filter(q => q.type === 'mcq' && q.category === 'Could Know')).slice(0, parseInt(formData.mcqCouldKnowCount) || 0),
      ...shuffle(questions.filter(q => q.type === 'mcq' && q.category === 'May Know')).slice(0, parseInt(formData.mcqMayKnowCount) || 0),
      ...shuffle(questions.filter(q => q.type === 'fillblank' && q.category === 'Must Know')).slice(0, parseInt(formData.fillblankMustKnowCount) || 0),
      ...shuffle(questions.filter(q => q.type === 'fillblank' && q.category === 'Could Know')).slice(0, parseInt(formData.fillblankCouldKnowCount) || 0),
      ...shuffle(questions.filter(q => q.type === 'fillblank' && q.category === 'May Know')).slice(0, parseInt(formData.fillblankMayKnowCount) || 0),
      ...shuffle(questions.filter(q => q.type === 'truefalse' && q.category === 'Must Know')).slice(0, parseInt(formData.truefalseMustKnowCount) || 0),
      ...shuffle(questions.filter(q => q.type === 'truefalse' && q.category === 'Could Know')).slice(0, parseInt(formData.truefalseCouldKnowCount) || 0),
      ...shuffle(questions.filter(q => q.type === 'truefalse' && q.category === 'May Know')).slice(0, parseInt(formData.truefalseMayKnowCount) || 0),
    ].map(q => q.id);
    if (chosen.length === 0) return alert('Please specify at least one question type count > 0.');
    try {
      setSubmitting(true);
      if (editingExamId) await examService.updateExam(editingExamId, { ...formData, questionIds: chosen });
      else await examService.createExam({ ...formData, questionIds: chosen });
      setShowModal(false); setFormData(DEFAULT_FORM); setEditingExamId(null); fetchData();
    } catch (err) { alert(`Failed to ${editingExamId ? 'update' : 'create'} exam: ` + (err.response?.data?.message || err.message)); }
    finally { setSubmitting(false); }
  };

  const getSelectedStats = () => {
    let totalQuestions = 0;
    let totalMarks = 0;

    const configs = [
      { key: 'mcqMustKnowCount', type: 'mcq', category: 'Must Know' },
      { key: 'mcqCouldKnowCount', type: 'mcq', category: 'Could Know' },
      { key: 'mcqMayKnowCount', type: 'mcq', category: 'May Know' },
      { key: 'fillblankMustKnowCount', type: 'fillblank', category: 'Must Know' },
      { key: 'fillblankCouldKnowCount', type: 'fillblank', category: 'Could Know' },
      { key: 'fillblankMayKnowCount', type: 'fillblank', category: 'May Know' },
      { key: 'truefalseMustKnowCount', type: 'truefalse', category: 'Must Know' },
      { key: 'truefalseCouldKnowCount', type: 'truefalse', category: 'Could Know' },
      { key: 'truefalseMayKnowCount', type: 'truefalse', category: 'May Know' },
    ];

    configs.forEach(({ key, type, category }) => {
      const count = parseInt(formData[key]) || 0;
      if (count > 0) {
        totalQuestions += count;
        const matchingQ = questions.filter(q => q.type === type && q.category === category);
        if (matchingQ.length > 0) {
          const avgMarks = matchingQ.reduce((sum, q) => sum + (q.marks || 1), 0) / matchingQ.length;
          totalMarks += Math.round(avgMarks * count); 3
        } else {
          totalMarks += count;
        }
      }
    });

    return { totalQuestions, totalMarks };
  };
  ``
  // ── Render ─────────────────────────────────────────────────────────────────
  const { totalQuestions, totalMarks } = getSelectedStats();

  return (
    <div className="space-y-5 animate-fade-in">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" className="hidden" />

      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="page-title">Examinations</div>
          <div className="page-subtitle">Create · Schedule · Activate · Manage</div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary px-5 py-2.5 uppercase tracking-widest text-[12px]">
          + Create Examination
        </button>
      </div>

      {loading && <div className="text-center py-12 text-[13px]" style={{ color: Dim }}>Loading examinations...</div>}

      {!loading && exams.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-[15px] font-bold uppercase tracking-wide mb-2" style={{ color: G }}>No Examinations Scheduled</div>
          <p className="text-[13px]" style={{ color: Dim }}>Click "Create Examination" to set up your first exam.</p>
        </div>
      )}

      {/* Exam cards */}
      <div className="space-y-3">
        {!loading && exams.map(exam => (
          <div key={exam.id} className="card relative overflow-hidden border-l-4"
            style={{ borderLeftColor: exam.isActive ? '#22c55e' : '#4b5563' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[18px] font-black uppercase tracking-wide leading-tight mb-1" style={{ color: G }}>{exam.title}</div>
                <div className="text-[12px] font-semibold" style={{ color: Dim }}>
                  <span style={{ color: G }}>{exam.code}</span>
                  {' · '}{exam.questions.length}Q · {exam.totalMarks}M · {exam.durationMinutes}min
                  {exam.createdBy && ` · By ${exam.createdBy}`}
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-3">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${exam.isActive ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                    : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/40'
                  }`}>{exam.isActive ? 'Live' : 'Inactive'}</span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold" style={{ color: Dim }}>Activate</span>
                  <button onClick={() => handleToggleActive(exam.id)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${exam.isActive ? 'bg-emerald-600' : 'bg-neutral-700'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${exam.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <button onClick={() => handleOpenGradingConsole(exam)}
                  className="btn text-[11px] uppercase tracking-wider px-3 py-1.5"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                  📊 Add Marks
                </button>
                <button onClick={() => handleEditClick(exam)}
                  className="btn btn-secondary text-[11px] uppercase tracking-wider px-3 py-1.5">
                  Review / Edit
                </button>
                <button onClick={() => handleDelete(exam.id)} className="btn btn-danger text-[11px] uppercase tracking-wider px-3 py-1.5">
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex flex-wrap gap-x-6 gap-y-1.5 text-[11px] font-semibold" style={{ borderColor: 'var(--border)', color: Dim }}>
              <span>Units: <span style={{ color: G }}>{exam.units}</span></span>
              <span>Attempts: <span style={{ color: G }}>{exam.allowedAttempts}</span></span>
              <span>Randomize: <span style={{ color: exam.randomizeOrder ? '#22c55e' : Dim }}>{exam.randomizeOrder ? 'Yes' : 'No'}</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* ── CREATE / EDIT EXAM MODAL ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(10,26,16,0.9)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl border p-8 animate-fade-in"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-center mb-6">
              <div className="text-[22px] font-black uppercase tracking-wide" style={{ color: G }}>
                {editingExamId ? 'Review & Edit Examination' : 'Create Examination'}
              </div>
              <button onClick={() => { setShowModal(false); setFormData(DEFAULT_FORM); setEditingExamId(null); }}
                className="text-[20px] cursor-pointer" style={{ color: Dim }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--tx)'} onMouseLeave={e => e.currentTarget.style.color = Dim}>✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Exam Title *</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Combat Engineering Fundamentals" className="form-input" required /></div>
                <div><label className="form-label">Exam Code</label>
                  <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="Auto-generated if blank" className="form-input" /></div>
              </div>
              <div>
                <label className="form-label">Subject</label>
                <input type="text" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Combat Engineering" className="form-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Duration (Minutes)</label>
                  <input type="number" value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 })} className="form-input" required /></div>
                <div><label className="form-label">Allowed Attempts</label>
                  <input type="number" value={formData.allowedAttempts} onChange={e => setFormData({ ...formData, allowedAttempts: parseInt(e.target.value) || 1 })} className="form-input" required /></div>
              </div>

              {/* Units */}
              <div>
                <label className="form-label mb-2">Assign to Units</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_UNITS.map(unit => {
                    const sel = formData.units.includes(unit);
                    return (
                      <button key={unit} type="button" onClick={() => handleUnitClick(unit)}
                        className="py-1.5 px-3 rounded text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer"
                        style={sel ? { background: 'rgba(201,162,39,0.15)', borderColor: G, color: G } : { background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border)', color: Dim }}>
                        {unit}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 py-3 border-y" style={{ borderColor: 'var(--border)' }}>
                <Toggle value={formData.randomizeOrder} onChange={v => setFormData({ ...formData, randomizeOrder: v })} label="Randomize Q Order" />
                <Toggle value={formData.shuffleOptions} onChange={v => setFormData({ ...formData, shuffleOptions: v })} label="Shuffle Options" />
                <Toggle value={formData.showResult} onChange={v => setFormData({ ...formData, showResult: v })} label="Show Result After Submit" />
              </div>

              {/* Instructions */}
              <div>
                <label className="form-label">Instructions</label>
                <textarea rows="3" value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Exam instructions..." className="form-input resize-none" />
              </div>

              {/* Question auto-select */}
              <div className="border-t pt-5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-[13px] font-bold uppercase tracking-wide" style={{ color: G }}>Auto-Select Questions from Pool</div>
                    <div className="text-[11px] font-semibold uppercase mt-0.5" style={{ color: Dim }}>Specify counts to randomly choose questions</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleTemplateDownload} className="btn btn-secondary py-1.5 px-3 text-[10px] uppercase">Template</button>
                    <button type="button" onClick={() => fileInputRef.current.click()} disabled={uploading} className="btn py-1.5 px-3 text-[10px] uppercase font-bold"
                      style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                      {uploading ? 'Uploading...' : 'Import CSV'}
                    </button>
                  </div>
                </div>

                {/* Draft Exam Roster Summary Banner */}
                <div className="flex items-center justify-between p-4 rounded-xl mb-4 border" style={{ background: 'rgba(201,162,39,0.06)', borderColor: 'var(--border)' }}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: Dim }}>Draft Examination Roster Summary</span>
                    <div className="flex gap-8 mt-1.5">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Questions Selected</span>
                        <div className="text-[20px] font-black leading-none mt-1.5" style={{ color: G }}>{totalQuestions} Questions</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Draft Total Marks</span>
                        <div className="text-[20px] font-black leading-none mt-1.5" style={{ color: G }}>{totalMarks} Marks</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                      ✓ Ready for deployment
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
                  {[
                    { label: 'MCQ (Must Know)', key: 'mcqMustKnowCount', type: 'mcq', category: 'Must Know' },
                    { label: 'MCQ (Could Know)', key: 'mcqCouldKnowCount', type: 'mcq', category: 'Could Know' },
                    { label: 'MCQ (May Know)', key: 'mcqMayKnowCount', type: 'mcq', category: 'May Know' },
                    { label: 'Fill (Must Know)', key: 'fillblankMustKnowCount', type: 'fillblank', category: 'Must Know' },
                    { label: 'Fill (Could Know)', key: 'fillblankCouldKnowCount', type: 'fillblank', category: 'Could Know' },
                    { label: 'Fill (May Know)', key: 'fillblankMayKnowCount', type: 'fillblank', category: 'May Know' },
                    { label: 'T/F (Must Know)', key: 'truefalseMustKnowCount', type: 'truefalse', category: 'Must Know' },
                    { label: 'T/F (Could Know)', key: 'truefalseCouldKnowCount', type: 'truefalse', category: 'Could Know' },
                    { label: 'T/F (May Know)', key: 'truefalseMayKnowCount', type: 'truefalse', category: 'May Know' },
                  ].map(({ label, key, type, category }) => (
                    <div key={key}>
                      <label className="form-label">{label}</label>
                      <input type="number" min="0" value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} className="form-input" />
                      <div className="text-[10px] mt-1.5 font-semibold" style={{ color: Dim }}>
                        Available: <span style={{ color: G }}>{
                          questions.filter(q => q.type === type && q.category === category).length
                        }</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <button type="button" onClick={() => { setShowModal(false); setFormData(DEFAULT_FORM); setEditingExamId(null); }}
                  className="btn btn-secondary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">
                  {submitting ? (editingExamId ? 'Saving...' : 'Creating...') : (editingExamId ? 'Save Changes' : 'Create Exam')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── GRADING CONSOLE MODAL ────────────────────────────────────────── */}
      {gradingConsoleOpen && selectedGradingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(10,26,16,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-2xl border p-6 animate-fade-in"
            style={{ background: 'var(--bg-3)', borderColor: 'rgba(201,162,39,0.4)' }}>
            <div className="flex justify-between items-center pb-5 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[3px] px-3 py-1 rounded"
                  style={{ background: 'rgba(201,162,39,0.1)', color: G, border: '1px solid rgba(201,162,39,0.25)' }}>
                  🛡️ Secure Grading Console
                </span>
                <h3 className="text-[22px] font-black uppercase tracking-wide mt-2.5 leading-none" style={{ color: G }}>
                  Manual Marks — {selectedGradingExam.title}
                </h3>
              </div>
              <button onClick={() => setGradingConsoleOpen(false)} className="text-[24px] font-bold cursor-pointer p-2 transition-colors"
                style={{ color: Dim }} onMouseEnter={e => e.currentTarget.style.color = 'var(--tx)'} onMouseLeave={e => e.currentTarget.style.color = Dim}>✕</button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="md:col-span-2">
                <label className="form-label">Search Candidate</label>
                <input type="text" value={gradingSearchQuery} onChange={e => setGradingSearchQuery(e.target.value)}
                  placeholder="Filter by name, army number, unit, trade..." className="form-input" />
              </div>
              <div>
                <label className="form-label">Filter by Unit</label>
                <select value={gradingUnitFilter} onChange={e => setGradingUnitFilter(e.target.value)} className="form-input">
                  <option value="">All Units</option>
                  {AVAILABLE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {/* Candidate table */}
            {loadingGradingData ? (
              <div className="text-center py-12 text-[13px]" style={{ color: Dim }}>Loading squad registry...</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border mb-5" style={{ borderColor: 'var(--border)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Army Number</th>
                      <th>Rank &amp; Name</th>
                      <th>Unit</th>
                      <th>Trade</th>
                      <th className="text-center">Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = allCandidatesList.filter(c => {
                        const sl = gradingSearchQuery.toLowerCase();
                        const ms = c.name.toLowerCase().includes(sl) || c.armyNumber.toLowerCase().includes(sl) || c.rank.toLowerCase().includes(sl) || c.unit.toLowerCase().includes(sl) || c.trade.toLowerCase().includes(sl);
                        return ms && (!gradingUnitFilter || c.unit === gradingUnitFilter);
                      });
                      if (filtered.length === 0) return <tr><td colSpan="6" className="py-10 text-center text-[13px]" style={{ color: Dim }}>No candidates found.</td></tr>;
                      return filtered.map(candidate => {
                        const attempt = examAttemptsList.find(a => a.candidateId === candidate.id);
                        return (
                          <tr key={candidate.id}>
                            <td className="font-mono font-bold" style={{ color: G }}>{candidate.armyNumber}</td>
                            <td className="uppercase font-semibold" style={{ color: 'var(--tx)' }}>{candidate.rank} {candidate.name}</td>
                            <td className="uppercase" style={{ color: Dim }}>{candidate.unit}</td>
                            <td style={{ color: Dim }}>{candidate.trade}</td>
                            <td className="text-center">
                              {attempt ? (
                                <div className="space-y-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-900/40 text-emerald-400 border border-emerald-700/40">
                                    Graded ({attempt.score}/{attempt.totalMarks})
                                  </span>
                                  <div className="text-[10px]" style={{ color: Dim }}>
                                    S:{attempt.quizScore} P:{attempt.practicalMarks} V:{attempt.vivaMarks}
                                  </div>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-neutral-800/60 text-neutral-400 border border-neutral-700/40">Not Taken</span>
                              )}
                            </td>
                            <td className="text-right">
                              {attempt ? (
                                <button onClick={() => handleOpenCandidateGradeForm(candidate, attempt)}
                                  className="btn text-[11px] uppercase tracking-wider px-4 py-1.5"
                                  style={{ background: 'rgba(201,162,39,0.1)', color: G, border: '1px solid rgba(201,162,39,0.3)' }}>
                                  ✎ Edit Marks
                                </button>
                              ) : (
                                <button onClick={() => handleOpenCandidateGradeForm(candidate, null)}
                                  className="btn text-[11px] uppercase tracking-wider px-4 py-1.5"
                                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                                  ✍ Add Marks
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setGradingConsoleOpen(false)} className="btn btn-secondary px-6 py-2.5 uppercase tracking-widest text-[12px]">Close Console</button>
            </div>
          </div>
        </div>
      )}

      {/* ── INLINE GRADE FORM MODAL ──────────────────────────────────────── */}
      {activeGradingCandidate && selectedGradingExam && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(10,26,16,0.92)', backdropFilter: 'blur(6px)' }}>
          <form onSubmit={handleSaveCandidateGrades}
            className="w-full max-w-lg rounded-2xl border p-7 animate-fade-in"
            style={{ background: 'var(--bg-3)', borderColor: 'rgba(201,162,39,0.4)' }}>
            <div className="pb-4 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-black uppercase tracking-[3px]" style={{ color: G }}>Roster Grade Entry Form</span>
              <h4 className="text-[20px] font-black uppercase tracking-wide mt-1" style={{ color: G }}>Grade Candidate</h4>
            </div>

            <div className="card !p-3 mb-5 space-y-1.5">
              <div>
                <span className="form-label">Candidate Details</span>
                <span className="text-[13px] font-bold uppercase" style={{ color: G }}>{activeGradingCandidate.armyNumber} · {activeGradingCandidate.rank} {activeGradingCandidate.name}</span>
              </div>
              <div>
                <span className="form-label">Assessment</span>
                <span className="text-[13px] font-bold" style={{ color: G }}>{selectedGradingExam.title} ({selectedGradingExam.code})</span>
              </div>
            </div>

            {gradingError && <div className="alert-error mb-4">⚠ {gradingError}</div>}

            <div className="space-y-4 mb-5">
              <div>
                <label className="form-label">Subjective / Written Score (Max {selectedGradingExam.totalMarks})</label>
                <input type="number" min="0" max={selectedGradingExam.totalMarks} value={gradingQuizScore}
                  onChange={e => setGradingQuizScore(e.target.value)} className="form-input" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Practical (Max 20)</label>
                  <input type="number" min="0" max="20" value={gradingPracticalMarks}
                    onChange={e => setGradingPracticalMarks(e.target.value)} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">Viva (Max 20)</label>
                  <input type="number" min="0" max="20" value={gradingVivaMarks}
                    onChange={e => setGradingVivaMarks(e.target.value)} className="form-input" required />
                </div>
              </div>
              <div>
                <label className="form-label">Audit Justification *</label>
                <textarea value={gradingReason} onChange={e => setGradingReason(e.target.value)} rows="3"
                  placeholder="e.g. Assessment and manual evaluation entry..." className="form-input resize-none" required />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setActiveGradingCandidate(null)} className="btn btn-secondary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">Cancel</button>
              <button type="submit" disabled={gradingSubmitting} className="btn btn-primary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">
                {gradingSubmitting ? 'Saving...' : '✓ Save Grades'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
