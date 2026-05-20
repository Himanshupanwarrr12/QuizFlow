import { useState, useEffect } from 'react';
import { resultService, examService, superAdminService } from '../services/api';

const AVAILABLE_UNITS = [
  'HQ BEG', '21 Engr Regt', '22 Engr Regt', 'A Coy', 'B Coy', 'C Coy', 
  'HQ Coy', 'Support Coy', 'Field Coy', 'Workshop', 'Signals Platoon'
];

export default function Results() {
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [loadingSheet, setLoadingSheet] = useState(false);

  // Score Override modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [newQuizScore, setNewQuizScore] = useState('');
  const [newPracticalMarks, setNewPracticalMarks] = useState('');
  const [newVivaMarks, setNewVivaMarks] = useState('');
  const [newSubjectiveMarks, setNewSubjectiveMarks] = useState('');
  const [overrideReason, setOverrideReason] = useState('Administrative marks allocation');
  const [overrideError, setOverrideError] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const handleOpenOverrideModal = (attempt) => {
    setOverrideTarget(attempt);
    setNewQuizScore(attempt.quizScore !== undefined ? attempt.quizScore : (attempt.score - (attempt.practicalMarks || 0) - (attempt.vivaMarks || 0) - (attempt.subjectiveMarks || 0)));
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

    const parsedQuiz = parseInt(newQuizScore);
    const parsedPractical = parseInt(newPracticalMarks);
    const parsedViva = parseInt(newVivaMarks);
    const parsedSubjective = parseInt(newSubjectiveMarks);

    const targetId = inlineAttemptId || (overrideTarget ? overrideTarget.id : null);
    const maxQuiz = selectedAttempt ? selectedAttempt.exam.totalMarks : (overrideTarget ? overrideTarget.quizMax : 10);

    if (!targetId) {
      setOverrideError('Invalid attempt target selected.');
      return;
    }

    if (isNaN(parsedQuiz) || parsedQuiz < 0 || parsedQuiz > maxQuiz) {
      setOverrideError(`Quiz score must be between 0 and ${maxQuiz}.`);
      return;
    }

    if (isNaN(parsedPractical) || parsedPractical < 0 || parsedPractical > 20) {
      setOverrideError('Practical marks must be between 0 and 20.');
      return;
    }

    if (isNaN(parsedViva) || parsedViva < 0 || parsedViva > 20) {
      setOverrideError('Viva marks must be between 0 and 20.');
      return;
    }

    if (isNaN(parsedSubjective) || parsedSubjective < 0 || parsedSubjective > 20) {
      setOverrideError('Subjective marks must be between 0 and 20.');
      return;
    }

    if (!overrideReason.trim() || overrideReason.trim().length < 3) {
      setOverrideError('Please provide a reason (at least 3 characters).');
      return;
    }

    try {
      setOverrideSubmitting(true);
      await resultService.overrideMarks(targetId, {
        newMarks: parsedQuiz,
        practicalMarks: parsedPractical,
        vivaMarks: parsedViva,
        subjectiveMarks: parsedSubjective,
        reason: overrideReason.trim()
      });

      // If we are currently viewing this attempt, live reload its details so the visual gauges update immediately!
      if (selectedAttempt && selectedAttempt.id === targetId) {
        const detailRes = await resultService.getResultDetail(targetId);
        setSelectedAttempt(detailRes.data?.attempt || null);
      }

      setOverrideModalOpen(false);
      setOverrideTarget(null);
      fetchResultsData();
    } catch (err) {
      setOverrideError(err.response?.data?.message || 'Failed to update candidate marks.');
    } finally {
      setOverrideSubmitting(false);
    }
  };
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const fetchResultsData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedExam) params.examId = selectedExam;
      if (selectedUnit) params.unit = selectedUnit;
      if (searchQuery) params.search = searchQuery;

      const [resultsRes, examsRes] = await Promise.all([
        resultService.getResults(params),
        examService.getExams()
      ]);

      const allResults = resultsRes.data?.results || [];
      const fullyGradedResults = allResults.filter(
        row => row.practicalMarks !== null && row.vivaMarks !== null
      );
      setResults(fullyGradedResults);
      setExams(examsRes.data?.exams || []);
    } catch (err) {
      console.error("Failed to load evaluations data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResultsData();
  }, [selectedExam, selectedUnit]); // Automatically fetch when dropdown filters change

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResultsData();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedExam('');
    setSelectedUnit('');
  };

  const handleViewSheet = async (attemptId) => {
    try {
      setLoadingSheet(true);
      const res = await resultService.getResultDetail(attemptId);
      const attempt = res.data?.attempt;
      setSelectedAttempt(attempt || null);
      if (attempt) {
        // Initialize the editing states so the inline save/edit form works 100% perfectly!
        const quizMax = attempt.exam.totalMarks ?? 10;
        setOverrideTarget({
          id: attempt.id,
          armyNumber: attempt.candidate.armyNumber,
          rankName: `${attempt.candidate.rank} ${attempt.candidate.name}`,
          examTitle: attempt.exam.title,
          quizMax,
          score: attempt.totalMarks,
          totalMarks: attempt.exam.totalMarks
        });
        setNewQuizScore(attempt.totalMarks !== null && attempt.totalMarks !== undefined ? attempt.totalMarks : 0);
        setNewPracticalMarks(attempt.practicalMarks !== null && attempt.practicalMarks !== undefined ? attempt.practicalMarks : 0);
        setNewVivaMarks(attempt.vivaMarks !== null && attempt.vivaMarks !== undefined ? attempt.vivaMarks : 0);
        setNewSubjectiveMarks(attempt.subjectiveMarks !== null && attempt.subjectiveMarks !== undefined ? attempt.subjectiveMarks : 0);
        setOverrideReason(attempt.reason || 'Administrative marks allocation');
        setOverrideError('');
      }
    } catch (err) {
      alert("Failed to load evaluation response sheet: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingSheet(false);
    }
  };

  // Compute summary stats from results
  const totalEvaluated = results.length;
  const passedCount = results.filter(r => r.isPassed).length;
  const passRate = totalEvaluated > 0 ? Math.round((passedCount / totalEvaluated) * 100) : 0;
  const avgScore = totalEvaluated > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalEvaluated) : 0;
  const highestScore = totalEvaluated > 0 ? Math.max(...results.map(r => r.percentage)) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="font-hd text-[34px] tracking-[3px] text-kh leading-none">RESULTS & EVALUATIONS</div>
        <div className="font-mn text-[10px] text-txd mt-1 tracking-[1px] uppercase">
          PERFORMANCE ANALYSIS · INDIVIDUAL SHEETS · AUDITING
        </div>
      </div>

      {/* Aggregate Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-sf border border-br rounded-md p-5 relative overflow-hidden">
          <div className="font-mn text-[10px] text-txm uppercase tracking-[1.5px]">Total Evaluated</div>
          <div className="font-hd text-[36px] text-kh mt-1 leading-none">{totalEvaluated}</div>
          <div className="font-mn text-[9px] text-txd mt-2">CANDIDATES COMPLETED</div>
          <div className="absolute right-4 bottom-2 text-am/10 font-hd text-[48px]">★</div>
        </div>

        <div className="bg-sf border border-br rounded-md p-5 relative overflow-hidden">
          <div className="font-mn text-[10px] text-txm uppercase tracking-[1.5px]">Overall Pass Rate</div>
          <div className="font-hd text-[36px] text-green-500 mt-1 leading-none">{passRate}%</div>
          <div className="font-mn text-[9px] text-txd mt-2">{passedCount} OUT OF {totalEvaluated} PASSED</div>
          <div className="absolute right-4 bottom-2 text-green-500/10 font-hd text-[48px]">✔</div>
        </div>

        <div className="bg-sf border border-br rounded-md p-5 relative overflow-hidden">
          <div className="font-mn text-[10px] text-txm uppercase tracking-[1.5px]">Average Score</div>
          <div className="font-hd text-[36px] text-am mt-1 leading-none">{avgScore}%</div>
          <div className="font-mn text-[9px] text-txd mt-2">CLASS AGGREGATE AVERAGE</div>
          <div className="absolute right-4 bottom-2 text-am/10 font-hd text-[48px]">🗲</div>
        </div>

        <div className="bg-sf border border-br rounded-md p-5 relative overflow-hidden">
          <div className="font-mn text-[10px] text-txm uppercase tracking-[1.5px]">Highest Score</div>
          <div className="font-hd text-[36px] text-[#3498db] mt-1 leading-none">{highestScore}%</div>
          <div className="font-mn text-[9px] text-txd mt-2">TOP PERFORMER SCORE</div>
          <div className="absolute right-4 bottom-2 text-[#3498db]/10 font-hd text-[48px]">🏆</div>
        </div>
      </div>

      {/* Filters Form */}
      <form onSubmit={handleSearchSubmit} className="bg-sf border border-br rounded-md p-4 mb-6 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:space-x-4">
        <div className="flex-1">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name or army number..."
            className="form-input bg-sf text-[12px] h-[38px] w-full"
          />
        </div>

        <div className="w-full lg:w-[220px]">
          <select 
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="form-input bg-sf text-white text-[12px] h-[38px] w-full"
          >
            <option value="">All Examinations</option>
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.title}</option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-[180px]">
          <select 
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="form-input bg-sf text-white text-[12px] h-[38px] w-full"
          >
            <option value="">All Units</option>
            {AVAILABLE_UNITS.map(ut => (
              <option key={ut} value={ut}>{ut}</option>
            ))}
          </select>
        </div>

        <div className="flex space-x-2">
          <button 
            type="submit" 
            className="btn bg-am hover:bg-am/90 text-oldd transition-colors h-[38px] px-5 rounded font-mn text-[11px] tracking-[1px] uppercase flex items-center justify-center"
          >
            Search
          </button>
          
          {(searchQuery || selectedExam || selectedUnit) && (
            <button 
              type="button"
              onClick={handleClearFilters}
              className="btn bg-neutral-800 hover:bg-neutral-700 text-kh transition-colors h-[38px] px-4 rounded font-mn text-[11px] uppercase border border-br"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Loading state */}
      {loading && <div className="text-center py-12 font-mn text-txm">Fetching candidate result lists...</div>}

      {/* Main Results Table */}
      {!loading && (
        <div className="bg-sf border border-br rounded-md overflow-x-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center font-mn text-txm">
              No matching evaluation results found.
            </div>
          ) : (
            <table className="w-full border-collapse text-left font-mn">
              <thead>
                <tr className="border-b border-br bg-sf2 text-kh text-[13px] tracking-[1.5px] uppercase">
                  <th className="p-5">Army No · Rank · Name</th>
                  <th className="p-5">Assigned Unit</th>
                  <th className="p-5">Trade Specialist</th>
                  <th className="p-5">Examination Title</th>
                  <th className="p-5">Duration</th>
                  <th className="p-5 text-center">Score Ratio</th>
                  <th className="p-5 text-center">Percentage</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-right">Composite Grading</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-br text-[15px] text-txm">
                {results.map((row) => {
                  const hasNoManualMarks = row.practicalMarks === 0 && row.vivaMarks === 0 && row.subjectiveMarks === 0;

                  return (
                    <tr key={row.id} className="hover:bg-am/5 transition-colors border-b border-br/45">
                      <td className="p-5 font-semibold text-kh whitespace-nowrap">
                        {row.armyNumber} <span className="font-normal text-txm">· {row.rankName}</span>
                      </td>
                      <td className="p-5 whitespace-nowrap font-medium text-tx">{row.unit}</td>
                      <td className="p-5 whitespace-nowrap font-medium text-tx">{row.trade}</td>
                      <td className="p-5">
                        <div className="font-semibold text-kh truncate max-w-[240px] text-[15.5px]">{row.examTitle}</div>
                        <div className="text-[10px] text-txd mt-0.5 tracking-[0.5px] uppercase font-bold">{row.examCode}</div>
                      </td>
                      <td className="p-5 whitespace-nowrap">{row.durationMinutes} min</td>
                      <td className="p-5 text-center whitespace-nowrap">
                        <div className="font-bold text-kh text-[16px]">{row.score} / {row.totalMarks}</div>
                        <div className="font-mn text-[10px] text-txd tracking-[0.5px] mt-1 uppercase">
                          Subj: {row.quizScore} | Prac: {row.practicalMarks} | Viva: {row.vivaMarks}
                        </div>
                      </td>
                      <td className="p-5 text-center font-bold text-[16.5px]">
                        <span className={row.isPassed ? "text-green-400" : "text-rose-400"}>{row.percentage}%</span>
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded font-mn text-[10.5px] uppercase tracking-[1.5px] inline-block font-bold ${
                          row.isPassed 
                            ? 'bg-green-950 text-green-400 border border-green-800' 
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {row.isPassed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="p-5 text-right whitespace-nowrap">
                        <button 
                          onClick={() => handleViewSheet(row.id)}
                          className="btn bg-am/15 border border-am/35 hover:bg-am/30 text-am transition-all py-2.5 px-5 rounded font-mn text-[12.5px] uppercase tracking-[1px] font-bold"
                        >
                          🔍 View Sheet
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* COMPOSITE TACTICAL SCORECARD VIEW-ONLY LEDGER */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-sf border-2 border-am/40 rounded-lg w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl relative animate-fade-in font-mn">
            
            {/* Top Header Banner */}
            <div className="bg-sf2 border-b border-br p-6 flex justify-between items-center relative">
              <div>
                <span className="px-3 py-1 rounded font-mn text-[10.5px] uppercase tracking-[1.5px] bg-am/15 text-kh border border-am/25 font-bold">
                  🛡️ candidate transcript ledger
                </span>
                <h2 className="font-hd text-[30px] text-kh uppercase tracking-[1.5px] mt-2.5 leading-none">
                  Candidate Evaluation Scorecard
                </h2>
              </div>
              <button 
                onClick={() => setSelectedAttempt(null)}
                className="text-txd hover:text-kh text-3xl font-bold transition-colors p-2"
              >
                ✕
              </button>
            </div>

            {/* Main Content Layout */}
            <div className="p-6 space-y-6">
              
              {/* Scorecard visualization container */}
              <div className="space-y-6">
                
                {/* Candidate Information Card */}
                <div className="bg-sf2 border border-br rounded-md p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-txm">
                  <div>
                    <span className="text-txd block uppercase text-[10px] tracking-[0.5px]">Army Number</span>
                    <span className="text-kh font-bold text-[15px] uppercase">{selectedAttempt.candidate.armyNumber}</span>
                  </div>
                  <div>
                    <span className="text-txd block uppercase text-[10px] tracking-[0.5px]">Rank & Name</span>
                    <span className="text-kh font-bold text-[15px] uppercase">{selectedAttempt.candidate.rank} {selectedAttempt.candidate.name}</span>
                  </div>
                  <div>
                    <span className="text-txd block uppercase text-[10px] tracking-[0.5px]">Assigned Unit</span>
                    <span className="text-kh font-bold text-[15px] uppercase">{selectedAttempt.candidate.unit}</span>
                  </div>
                  <div>
                    <span className="text-txd block uppercase text-[10px] tracking-[0.5px]">Trade Specialist</span>
                    <span className="text-kh font-bold text-[15px] uppercase">{selectedAttempt.candidate.trade}</span>
                  </div>
                </div>

                {/* Big Composite Marks Meter */}
                {(() => {
                  const quizScore = selectedAttempt.totalMarks ?? 0;
                  const quizMax = selectedAttempt.exam.totalMarks ?? 10; // Dynamic maximum marks based on online quiz questions
                  const practicalScore = selectedAttempt.practicalMarks ?? 0;
                  const vivaScore = selectedAttempt.vivaMarks ?? 0;

                  const totalScore = quizScore + practicalScore + vivaScore;
                  const maxMarks = quizMax + 40; // Dynamic QuizMax + 20 Practical + 20 Viva
                  const percentage = Math.round((totalScore / maxMarks) * 100);
                  const passingScore = selectedAttempt.exam.passingMarks 
                    ? (selectedAttempt.exam.passingMarks + 20)
                    : Math.ceil(maxMarks * 0.5);
                  const isPassed = totalScore >= passingScore;

                  return (
                    <div className="bg-sf2 border border-br rounded-md p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      {/* Big circle/badge percentage */}
                      <div className="text-center md:border-r md:border-br md:pr-10">
                        <div className="font-mn text-[11px] text-txd uppercase tracking-[2px] mb-2 font-bold">composite result</div>
                        <div className="inline-flex flex-col items-center justify-center p-6 rounded-full border-4 border-br bg-sf" style={{ borderColor: isPassed ? '#10b981' : '#f43f5e' }}>
                          <span className="font-hd text-[54px] leading-none" style={{ color: isPassed ? '#10b981' : '#f43f5e' }}>
                            {percentage}%
                          </span>
                        </div>
                        <span className={`mt-3 px-3 py-1 rounded font-mn text-[11px] uppercase tracking-[1.5px] inline-block font-bold ${
                          isPassed ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {isPassed ? '✔ PASSED' : '✘ FAILED'}
                        </span>
                      </div>

                      {/* Weightage breakdowns */}
                      <div className="flex-1 w-full space-y-4 font-mn">
                        <div>
                          <div className="flex justify-between text-[13px] mb-1 font-bold">
                            <span className="text-kh">1. SUBJECTIVE EVALUATION (WRITTEN):</span>
                            <span className="text-kh">{quizScore} / {quizMax} M</span>
                          </div>
                          <div className="w-full bg-sf border border-br h-2.5 rounded-full overflow-hidden">
                            <div className="bg-[#7c3aed] h-full transition-all duration-300" style={{ width: `${(quizScore / quizMax) * 100}%` }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[13px] mb-1 font-bold">
                            <span className="text-am">2. PRACTICAL EVALUATION:</span>
                            <span className="text-am">{practicalScore} / 20 M</span>
                          </div>
                          <div className="w-full bg-sf border border-br h-2.5 rounded-full overflow-hidden">
                            <div className="bg-am h-full transition-all duration-300" style={{ width: `${(practicalScore / 20) * 100}%` }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[13px] mb-1 font-bold">
                            <span className="text-[#3498db]">3. VIVA VOCE:</span>
                            <span className="text-[#3498db]">{vivaScore} / 20 M</span>
                          </div>
                          <div className="w-full bg-sf border border-br h-2.5 rounded-full overflow-hidden">
                            <div className="bg-[#3498db] h-full transition-all duration-300" style={{ width: `${(vivaScore / 20) * 100}%` }}></div>
                          </div>
                        </div>

                        <div className="flex justify-between border-t border-br pt-3 text-[14px] font-bold text-kh uppercase">
                          <span>Total Composite Marks:</span>
                          <span>{totalScore} / {maxMarks} Marks</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Response Breakdown list */}
                <div className="bg-sf2 border border-br rounded-md p-4 max-h-[500px] overflow-y-auto">
                  <div className="font-mn text-[13px] text-kh uppercase tracking-[1px] border-b border-br pb-2 mb-3 font-bold">
                    Detailed Response Sheet Analysis
                  </div>
                  
                  <div className="space-y-4">
                    {selectedAttempt.responses.map((res, index) => {
                      const isCorrect = res.marksAwarded > 0;
                      const q = res.question;
                      const candidateAns = res.selectedOption;
                      const correctAns = q.correctOptions;

                      return (
                        <div key={res.id} className={`p-4 rounded border text-[13px] ${
                          isCorrect ? 'bg-green-950/5 border-green-900/30' : 'bg-rose-950/5 border-rose-900/30'
                        }`}>
                          {/* Header */}
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <div>
                              <span className="font-bold text-kh mr-2">Q{index + 1}.</span>
                              <span className="text-white font-medium text-[13.5px] leading-relaxed">{q.text}</span>
                            </div>
                            <span className={`shrink-0 font-mn font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${
                              isCorrect 
                                ? 'text-green-400 bg-green-950/30 border-green-800' 
                                : 'text-rose-400 bg-rose-950/30 border-rose-800'
                            }`}>
                              {isCorrect ? '✔ CORRECT' : '✘ INCORRECT'}
                            </span>
                          </div>

                          {/* Options Grid */}
                          {(q.optionA || q.optionB || q.optionC || q.optionD) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pl-6">
                              {q.optionA && (
                                <div className={`p-2 rounded border text-[12px] flex items-center justify-between transition-all ${
                                  candidateAns === 'A'
                                    ? isCorrect 
                                      ? 'bg-green-950/45 border-green-500 text-green-300 font-bold' 
                                      : 'bg-rose-950/45 border-rose-500 text-rose-300 font-bold'
                                    : correctAns === 'A'
                                      ? 'bg-green-950/20 border-green-800/60 text-green-400'
                                      : 'bg-sf border-br text-txm'
                                }`}>
                                  <span>A. {q.optionA}</span>
                                  {candidateAns === 'A' && (
                                    <span className="text-[9.5px] uppercase font-bold tracking-[0.5px] px-1.5 py-0.5 rounded bg-black/45">
                                      {isCorrect ? '✔ Your Choice' : '✘ Your Choice'}
                                    </span>
                                  )}
                                  {correctAns === 'A' && candidateAns !== 'A' && (
                                    <span className="text-[9.5px] uppercase font-bold tracking-[0.5px] px-1.5 py-0.5 rounded bg-green-900/60 text-green-400">
                                      ✔ Correct
                                    </span>
                                  )}
                                </div>
                              )}

                              {q.optionB && (
                                <div className={`p-2 rounded border text-[12px] flex items-center justify-between transition-all ${
                                  candidateAns === 'B'
                                    ? isCorrect 
                                      ? 'bg-green-950/45 border-green-500 text-green-300 font-bold' 
                                      : 'bg-rose-950/45 border-rose-500 text-rose-300 font-bold'
                                    : correctAns === 'B'
                                      ? 'bg-green-950/20 border-green-800/60 text-green-400'
                                      : 'bg-sf border-br text-txm'
                                }`}>
                                  <span>B. {q.optionB}</span>
                                  {candidateAns === 'B' && (
                                    <span className="text-[9.5px] uppercase font-bold tracking-[0.5px] px-1.5 py-0.5 rounded bg-black/45">
                                      {isCorrect ? '✔ Your Choice' : '✘ Your Choice'}
                                    </span>
                                  )}
                                  {correctAns === 'B' && candidateAns !== 'B' && (
                                    <span className="text-[9.5px] uppercase font-bold tracking-[0.5px] px-1.5 py-0.5 rounded bg-green-900/60 text-green-400">
                                      ✔ Correct
                                    </span>
                                  )}
                                </div>
                              )}

                              {q.optionC && (
                                <div className={`p-2 rounded border text-[12px] flex items-center justify-between transition-all ${
                                  candidateAns === 'C'
                                    ? isCorrect 
                                      ? 'bg-green-950/45 border-green-500 text-green-300 font-bold' 
                                      : 'bg-rose-950/45 border-rose-500 text-rose-300 font-bold'
                                    : correctAns === 'C'
                                      ? 'bg-green-950/20 border-green-800/60 text-green-400'
                                      : 'bg-sf border-br text-txm'
                                }`}>
                                  <span>C. {q.optionC}</span>
                                  {candidateAns === 'C' && (
                                    <span className="text-[9.5px] uppercase font-bold tracking-[0.5px] px-1.5 py-0.5 rounded bg-black/45">
                                      {isCorrect ? '✔ Your Choice' : '✘ Your Choice'}
                                    </span>
                                  )}
                                  {correctAns === 'C' && candidateAns !== 'C' && (
                                    <span className="text-[9.5px] uppercase font-bold tracking-[0.5px] px-1.5 py-0.5 rounded bg-green-900/60 text-green-400">
                                      ✔ Correct
                                    </span>
                                  )}
                                </div>
                              )}

                              {q.optionD && (
                                <div className={`p-2 rounded border text-[12px] flex items-center justify-between transition-all ${
                                  candidateAns === 'D'
                                    ? isCorrect 
                                      ? 'bg-green-950/45 border-green-500 text-green-300 font-bold' 
                                      : 'bg-rose-950/45 border-rose-500 text-rose-300 font-bold'
                                    : correctAns === 'D'
                                      ? 'bg-green-950/20 border-green-800/60 text-green-400'
                                      : 'bg-sf border-br text-txm'
                                }`}>
                                  <span>D. {q.optionD}</span>
                                  {candidateAns === 'D' && (
                                    <span className="text-[9.5px] uppercase font-bold tracking-[0.5px] px-1.5 py-0.5 rounded bg-black/45">
                                      {isCorrect ? '✔ Your Choice' : '✘ Your Choice'}
                                    </span>
                                  )}
                                  {correctAns === 'D' && candidateAns !== 'D' && (
                                    <span className="text-[9.5px] uppercase font-bold tracking-[0.5px] px-1.5 py-0.5 rounded bg-green-900/60 text-green-400">
                                      ✔ Correct
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Fallback for true/false or written inputs */
                            <div className="mt-2 pl-6 space-y-1.5 text-[12px] font-mono">
                              <div>
                                <span className="text-txd mr-2 uppercase font-bold">Selected Answer:</span>
                                <span className={`font-bold ${isCorrect ? 'text-green-400' : 'text-rose-400'}`}>
                                  {candidateAns || "[No Answer Given]"}
                                </span>
                              </div>
                              <div>
                                <span className="text-txd mr-2 uppercase font-bold">Correct Solution:</span>
                                <span className="text-green-400 font-bold">{correctAns}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-br bg-sf2">
              <button 
                onClick={() => setSelectedAttempt(null)}
                className="btn bg-neutral-800 hover:bg-neutral-700 text-kh transition-colors py-2.5 px-6 rounded font-mn text-[12.5px] uppercase border border-br font-bold"
              >
                Close Scorecard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* (Manual override modal removed) */}
    </div>
  );
}
