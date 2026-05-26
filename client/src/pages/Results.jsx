import { useState, useEffect } from 'react';
import { resultService, examService } from '../services/api';

const AVAILABLE_UNITS = [
  'HQ BEG','21 Engr Regt','22 Engr Regt','A Coy','B Coy','C Coy',
  'HQ Coy','Support Coy','Field Coy','Workshop','Signals Platoon'
];

const G   = 'var(--gold)';
const Dim = 'var(--tx-mute)';

export default function Results() {
  const [results,         setResults]         = useState([]);
  const [exams,           setExams]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [loadingSheet,    setLoadingSheet]    = useState(false);

  // Override modal state
  const [overrideModalOpen,     setOverrideModalOpen]     = useState(false);
  const [overrideTarget,        setOverrideTarget]        = useState(null);
  const [newQuizScore,          setNewQuizScore]          = useState('');
  const [newPracticalMarks,     setNewPracticalMarks]     = useState('');
  const [newVivaMarks,          setNewVivaMarks]          = useState('');
  const [newSubjectiveMarks,    setNewSubjectiveMarks]    = useState('');
  const [overrideReason,        setOverrideReason]        = useState('Administrative marks allocation');
  const [overrideError,         setOverrideError]         = useState('');
  const [overrideSubmitting,    setOverrideSubmitting]    = useState(false);

  // Filter states
  const [searchQuery,  setSearchQuery]  = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const handleOpenOverrideModal = (attempt) => {
    setOverrideTarget(attempt);
    setNewQuizScore(attempt.quizScore !== undefined ? attempt.quizScore : (attempt.score - (attempt.practicalMarks||0) - (attempt.vivaMarks||0) - (attempt.subjectiveMarks||0)));
    setNewPracticalMarks(attempt.practicalMarks !== undefined ? attempt.practicalMarks : 0);
    setNewVivaMarks(attempt.vivaMarks !== undefined ? attempt.vivaMarks : 0);
    setNewSubjectiveMarks(attempt.subjectiveMarks !== undefined ? attempt.subjectiveMarks : 0);
    setOverrideReason('Administrative marks allocation');
    setOverrideError('');
    setOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async (e, inlineAttemptId = null) => {
    if (e) e.preventDefault();
    setOverrideError('');
    const parsedQuiz       = parseInt(newQuizScore);
    const parsedPractical  = parseInt(newPracticalMarks);
    const parsedViva       = parseInt(newVivaMarks);
    const parsedSubjective = parseInt(newSubjectiveMarks);
    const targetId = inlineAttemptId || (overrideTarget ? overrideTarget.id : null);
    const maxQuiz  = selectedAttempt ? selectedAttempt.exam.totalMarks : (overrideTarget ? overrideTarget.quizMax : 10);

    if (!targetId)                                          { setOverrideError('Invalid attempt target.'); return; }
    if (isNaN(parsedQuiz)||parsedQuiz<0||parsedQuiz>maxQuiz) { setOverrideError(`Quiz score must be 0–${maxQuiz}.`); return; }
    if (isNaN(parsedPractical)||parsedPractical<0||parsedPractical>20) { setOverrideError('Practical marks must be 0–20.'); return; }
    if (isNaN(parsedViva)||parsedViva<0||parsedViva>20)     { setOverrideError('Viva marks must be 0–20.'); return; }
    if (isNaN(parsedSubjective)||parsedSubjective<0||parsedSubjective>20) { setOverrideError('Subjective marks must be 0–20.'); return; }
    if (!overrideReason.trim()||overrideReason.trim().length<3) { setOverrideError('Please provide a reason (≥3 chars).'); return; }

    try {
      setOverrideSubmitting(true);
      await resultService.overrideMarks(targetId, {
        newMarks: parsedQuiz, practicalMarks: parsedPractical,
        vivaMarks: parsedViva, subjectiveMarks: parsedSubjective,
        reason: overrideReason.trim()
      });
      if (selectedAttempt && selectedAttempt.id === targetId) {
        const detailRes = await resultService.getResultDetail(targetId);
        setSelectedAttempt(detailRes.data?.attempt || null);
      }
      setOverrideModalOpen(false); setOverrideTarget(null);
      fetchResultsData();
    } catch (err) { setOverrideError(err.response?.data?.message || 'Failed to update marks.'); }
    finally { setOverrideSubmitting(false); }
  };

  const fetchResultsData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedExam) params.examId = selectedExam;
      if (selectedUnit) params.unit   = selectedUnit;
      if (searchQuery)  params.search = searchQuery;
      const [resultsRes, examsRes] = await Promise.all([resultService.getResults(params), examService.getExams()]);
      const allResults = resultsRes.data?.results || [];
      setResults(allResults.filter(r => r.practicalMarks !== null && r.vivaMarks !== null));
      setExams(examsRes.data?.exams || []);
    } catch (err) { console.error('Failed to load results:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResultsData(); }, [selectedExam, selectedUnit]);

  const handleSearchSubmit = (e) => { e.preventDefault(); fetchResultsData(); };
  const handleClearFilters = () => { setSearchQuery(''); setSelectedExam(''); setSelectedUnit(''); };

  const handleViewSheet = async (attemptId) => {
    try {
      setLoadingSheet(true);
      const res = await resultService.getResultDetail(attemptId);
      const attempt = res.data?.attempt;
      setSelectedAttempt(attempt || null);
      if (attempt) {
        const quizMax = attempt.exam.totalMarks ?? 10;
        setOverrideTarget({ id: attempt.id, armyNumber: attempt.candidate.armyNumber, rankName: `${attempt.candidate.rank} ${attempt.candidate.name}`, examTitle: attempt.exam.title, quizMax, score: attempt.totalMarks, totalMarks: attempt.exam.totalMarks });
        setNewQuizScore(attempt.totalMarks ?? 0);
        setNewPracticalMarks(attempt.practicalMarks ?? 0);
        setNewVivaMarks(attempt.vivaMarks ?? 0);
        setNewSubjectiveMarks(attempt.subjectiveMarks ?? 0);
        setOverrideReason(attempt.reason || 'Administrative marks allocation');
        setOverrideError('');
      }
    } catch (err) { alert('Failed to load evaluation sheet: ' + (err.response?.data?.message || err.message)); }
    finally { setLoadingSheet(false); }
  };

  const totalEvaluated = results.length;
  const passedCount    = results.filter(r => r.isPassed).length;
  const passRate       = totalEvaluated > 0 ? Math.round((passedCount / totalEvaluated) * 100) : 0;
  const avgScore       = totalEvaluated > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / totalEvaluated) : 0;
  const highestScore   = totalEvaluated > 0 ? Math.max(...results.map(r => r.percentage)) : 0;

  const statCards = [
    { label: 'Total Evaluated',  value: totalEvaluated, sub: 'Candidates completed',     color: 'var(--gold)' },
    { label: 'Pass Rate',        value: `${passRate}%`, sub: `${passedCount} of ${totalEvaluated} passed`, color: '#22c55e' },
    { label: 'Average Score',    value: `${avgScore}%`, sub: 'Class aggregate average',  color: '#818cf8' },
    { label: 'Highest Score',    value: `${highestScore}%`, sub: 'Top performer score',  color: '#38bdf8' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <div className="page-title">Results &amp; Evaluations</div>
        <div className="page-subtitle">Performance Analysis · Individual Sheets · Auditing</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="card border-t-2 relative overflow-hidden" style={{ borderTopColor: s.color }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: Dim }}>{s.label}</div>
            <div className="text-[36px] font-black leading-none mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: Dim }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form onSubmit={handleSearchSubmit} className="card !py-3 !px-4 flex flex-wrap items-center gap-3">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search candidate name or army number..." className="form-input flex-1 min-w-[200px]" />
        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="form-input w-[200px]">
          <option value="">All Examinations</option>
          {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
        </select>
        <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="form-input w-[160px]">
          <option value="">All Units</option>
          {AVAILABLE_UNITS.map(ut => <option key={ut} value={ut}>{ut}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary px-5 py-2 uppercase tracking-widest text-[11px]">Search</button>
          {(searchQuery || selectedExam || selectedUnit) && (
            <button type="button" onClick={handleClearFilters} className="btn btn-secondary px-4 py-2 uppercase tracking-widest text-[11px]">Clear</button>
          )}
        </div>
      </form>

      {loading && <div className="text-center py-12 text-[13px]" style={{ color: Dim }}>Fetching results...</div>}

      {/* Results table */}
      {!loading && (
        <div className="card !p-0 overflow-x-auto">
          {results.length === 0 ? (
            <div className="p-10 text-center text-[13px]" style={{ color: Dim }}>No matching evaluation results found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Army No · Rank · Name</th>
                  <th>Unit</th>
                  <th>Trade</th>
                  <th>Examination</th>
                  <th className="text-center">Score</th>
                  <th className="text-center">%</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Sheet</th>
                </tr>
              </thead>
              <tbody>
                {results.map(row => (
                  <tr key={row.id}>
                    <td>
                      <span className="font-semibold" style={{ color: G }}>{row.armyNumber}</span>
                      <span className="text-[11px] ml-1.5" style={{ color: Dim }}>· {row.rankName}</span>
                    </td>
                    <td className="font-medium" style={{ color: 'var(--tx)' }}>{row.unit}</td>
                    <td style={{ color: Dim }}>{row.trade}</td>
                    <td>
                      <div className="font-semibold text-[13px] max-w-[200px] truncate" style={{ color: G }}>{row.examTitle}</div>
                      <div className="font-mono text-[10px] mt-0.5" style={{ color: Dim }}>{row.examCode}</div>
                    </td>
                    <td className="text-center">
                      <div className="font-bold text-[15px]" style={{ color: 'var(--tx)' }}>{row.score} / {row.totalMarks}</div>
                      <div className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: Dim }}>
                        S:{row.quizScore} P:{row.practicalMarks} V:{row.vivaMarks}
                      </div>
                    </td>
                    <td className="text-center font-black text-[16px]">
                      <span style={{ color: row.isPassed ? '#22c55e' : '#f43f5e' }}>{row.percentage}%</span>
                    </td>
                    <td className="text-center">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        row.isPassed
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                          : 'bg-rose-900/40 text-rose-400 border border-rose-700/40'
                      }`}>{row.isPassed ? 'Passed' : 'Failed'}</span>
                    </td>
                    <td className="text-right">
                      <button onClick={() => handleViewSheet(row.id)}
                        className="btn text-[11px] uppercase tracking-wider px-4 py-2"
                        style={{ background: 'rgba(201,162,39,0.1)', color: G, border: '1px solid rgba(201,162,39,0.3)' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(201,162,39,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background='rgba(201,162,39,0.1)'}>
                        🔍 View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Detailed Scorecard Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          style={{ background: 'rgba(10,26,16,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-2xl border"
            style={{ background: 'var(--bg-3)', borderColor: 'rgba(201,162,39,0.4)' }}>

            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.2)' }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[3px] px-3 py-1 rounded"
                  style={{ background: 'rgba(201,162,39,0.1)', color: G, border: '1px solid rgba(201,162,39,0.25)' }}>
                  🛡️ Candidate Transcript Ledger
                </span>
                <h2 className="text-[24px] font-black uppercase tracking-wide mt-2" style={{ color: G }}>
                  Candidate Evaluation Scorecard
                </h2>
              </div>
              <button onClick={() => setSelectedAttempt(null)}
                className="text-[24px] font-bold cursor-pointer transition-colors p-2"
                style={{ color: Dim }}
                onMouseEnter={e => e.currentTarget.style.color='var(--tx)'}
                onMouseLeave={e => e.currentTarget.style.color=Dim}>✕</button>
            </div>

            <div className="p-6 space-y-6">

              {/* Candidate info */}
              <div className="card grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Army Number', selectedAttempt.candidate.armyNumber],
                  ['Rank & Name', `${selectedAttempt.candidate.rank} ${selectedAttempt.candidate.name}`],
                  ['Assigned Unit', selectedAttempt.candidate.unit],
                  ['Trade Specialist', selectedAttempt.candidate.trade],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: Dim }}>{k}</span>
                    <span className="font-bold text-[14px] uppercase" style={{ color: G }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Score meter */}
              {(() => {
                const quizScore     = selectedAttempt.totalMarks ?? 0;
                const quizMax       = selectedAttempt.exam.totalMarks ?? 10;
                const practicalScore= selectedAttempt.practicalMarks ?? 0;
                const vivaScore     = selectedAttempt.vivaMarks ?? 0;
                const totalScore    = quizScore + practicalScore + vivaScore;
                const maxMarks      = quizMax + 40;
                const percentage    = Math.round((totalScore / maxMarks) * 100);
                const passingScore  = selectedAttempt.exam.passingMarks
                  ? (selectedAttempt.exam.passingMarks + 20)
                  : Math.ceil(maxMarks * 0.5);
                const isPassed = totalScore >= passingScore;

                return (
                  <div className="card flex flex-col md:flex-row items-center gap-8">
                    {/* Circle */}
                    <div className="text-center flex-shrink-0">
                      <div className="text-[10px] font-black uppercase tracking-[3px] mb-3" style={{ color: Dim }}>Composite Result</div>
                      <div className="w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center"
                        style={{ borderColor: isPassed ? '#22c55e' : '#f43f5e', background: 'rgba(0,0,0,0.3)' }}>
                        <span className="text-[42px] font-black leading-none" style={{ color: isPassed ? '#22c55e' : '#f43f5e' }}>{percentage}%</span>
                      </div>
                      <span className={`mt-3 inline-block px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                        isPassed ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                                 : 'bg-rose-900/40 text-rose-400 border border-rose-700/40'
                      }`}>{isPassed ? '✔ Passed' : '✘ Failed'}</span>
                    </div>

                    {/* Bars */}
                    <div className="flex-1 w-full space-y-4">
                      {[
                        { label: '1. Subjective (Written)', score: quizScore, max: quizMax, color: '#818cf8' },
                        { label: '2. Practical Evaluation', score: practicalScore, max: 20, color: G },
                        { label: '3. Viva Voce', score: vivaScore, max: 20, color: '#38bdf8' },
                      ].map(({ label, score, max, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-[12px] font-bold mb-1.5">
                            <span style={{ color }}>{label}</span>
                            <span style={{ color }}>{score} / {max} M</span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(score/max)*100}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-3 border-t text-[13px] font-black uppercase" style={{ borderColor: 'var(--border)', color: G }}>
                        <span>Total Composite Marks</span>
                        <span>{totalScore} / {maxMarks} Marks</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Response breakdown */}
              <div className="card !p-4 max-h-[450px] overflow-y-auto">
                <div className="text-[12px] font-black uppercase tracking-widest mb-4 pb-3 border-b" style={{ color: G, borderColor: 'var(--border)' }}>
                  Detailed Response Sheet Analysis
                </div>
                <div className="space-y-4">
                  {selectedAttempt.responses.map((res, index) => {
                    const isCorrect   = res.marksAwarded > 0;
                    const q           = res.question;
                    const candidateAns= res.selectedOption;
                    const correctAns  = q.correctOptions;

                    return (
                      <div key={res.id} className="p-4 rounded-lg border text-[13px]"
                        style={{ background: isCorrect ? 'rgba(34,197,94,0.04)' : 'rgba(244,63,94,0.04)', borderColor: isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)' }}>
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="font-bold mr-2 text-[14px]" style={{ color: G }}>Q{index+1}.</span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex-shrink-0"
                                style={{
                                  background: q.category === 'Must Know' ? 'rgba(244,63,94,0.1)' : q.category === 'Could Know' ? 'rgba(56,189,248,0.1)' : 'rgba(245,158,11,0.1)',
                                  color: q.category === 'Must Know' ? '#f43f5e' : q.category === 'Could Know' ? '#38bdf8' : '#f59e0b',
                                  border: `1px solid ${q.category === 'Must Know' ? '#f43f5e30' : q.category === 'Could Know' ? '#38bdf830' : '#f59e0b30'}`
                                }}>
                                {q.category || 'Must Know'}
                              </span>
                            </div>
                            <span className="font-medium leading-relaxed" style={{ color: 'var(--tx)' }}>{q.text}</span>
                          </div>
                          <span className={`flex-shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isCorrect ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40'
                                      : 'text-rose-400 bg-rose-900/30 border-rose-700/40'
                          }`}>{isCorrect ? '✔ Correct' : '✘ Wrong'}</span>
                        </div>

                        {(q.optionA || q.optionB || q.optionC || q.optionD) ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-5 mt-2">
                            {['A','B','C','D'].map(opt => {
                              const optText = q[`option${opt}`];
                              if (!optText) return null;
                              const isCandidateChoice = candidateAns === opt;
                              const isCorrectChoice   = correctAns === opt;
                              let style = { background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border)', color: Dim };
                              if (isCandidateChoice && isCorrect)   style = { background: 'rgba(34,197,94,0.15)',  borderColor: '#22c55e', color: '#22c55e' };
                              if (isCandidateChoice && !isCorrect)  style = { background: 'rgba(244,63,94,0.15)',  borderColor: '#f43f5e', color: '#f43f5e' };
                              if (!isCandidateChoice && isCorrectChoice) style = { background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' };
                              return (
                                <div key={opt} className="p-2.5 rounded border flex items-center justify-between text-[12px]"
                                  style={{ ...style, borderWidth: '1px' }}>
                                  <span>{opt}. {optText}</span>
                                  {isCandidateChoice && <span className="text-[9px] font-black uppercase tracking-wide">{isCorrect ? '✔ Your answer' : '✘ Your answer'}</span>}
                                  {!isCandidateChoice && isCorrectChoice && <span className="text-[9px] font-black uppercase tracking-wide text-emerald-400">✔ Correct</span>}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="pl-5 mt-2 space-y-1.5 text-[12px] font-mono">
                            <div><span className="font-bold mr-2" style={{ color: Dim }}>Your answer:</span><span style={{ color: isCorrect ? '#22c55e' : '#f43f5e' }}>{candidateAns || '[No Answer]'}</span></div>
                            <div><span className="font-bold mr-2" style={{ color: Dim }}>Correct:</span><span style={{ color: '#22c55e' }}>{correctAns}</span></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-5 border-t" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.2)' }}>
              <button onClick={() => setSelectedAttempt(null)} className="btn btn-secondary px-6 py-2.5 uppercase tracking-widest text-[12px]">
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
