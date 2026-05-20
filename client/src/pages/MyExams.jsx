import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { examService, candidateService } from '../services/api';

export default function MyExams({ hideHeader = false }) {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Exam session states
  const [activeSession, setActiveSession] = useState(null); // { attempt, exam, questions }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: answer }
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [submittingExam, setSubmittingExam] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Result sheet popup after submit
  const [gradeResult, setGradeResult] = useState(null);

  const fetchExamsAndAttempts = async () => {
    try {
      setLoading(true);
      const [examsRes, attemptsRes] = await Promise.all([
        examService.getExams(),
        candidateService.getAttempts()
      ]);
      
      const allExams = examsRes.data?.exams || [];
      const allAttempts = attemptsRes.data?.attempts || [];
      
      // Filter exams to only active ones matching candidate's unit
      const candidateUnit = user?.unit || "";
      const filtered = allExams.filter(exam => {
        if (!exam.isActive) return false;
        
        const examUnits = (exam.units || "All Units").toLowerCase();
        return examUnits.includes("all units") || examUnits.includes(candidateUnit.toLowerCase());
      });

      setExams(filtered);
      setAttempts(allAttempts);
    } catch (err) {
      console.error("Failed to fetch candidate assessment data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsAndAttempts();
  }, []);

  // Exam Timer Countdown
  useEffect(() => {
    if (!activeSession || timeLeft <= 0) {
      if (activeSession && timeLeft === 0) {
        // Auto-submit when time expires!
        handleSubmitExam(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession, timeLeft]);

  // Keyboard shortcut listener: Enter key moves to next question or finishes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeSession) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        
        const questionsList = activeSession.questions || [];
        const isLast = currentIdx === questionsList.length - 1;
        
        if (isLast) {
          if (showConfirmSubmit) {
            handleSubmitExam(false);
          } else {
            setShowConfirmSubmit(true);
          }
        } else {
          setCurrentIdx(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession, currentIdx, showConfirmSubmit, selectedAnswers]);

  const handleStartExam = async (exam) => {
    try {
      const res = await candidateService.startAttempt(exam.id);
      if (res.data) {
        const attempt = res.data.attempt;
        const fullExam = res.data.exam;
        
        // Extract flat questions from junction list, filtering out any null/undefined questions
        const questionsList = (fullExam.questions || [])
          .map(eq => eq.question)
          .filter(q => q !== null && q !== undefined);
        
        setActiveSession({
          attempt,
          exam: fullExam,
          questions: questionsList
        });
        setCurrentIdx(0);
        setSelectedAnswers({});
        setTimeLeft(fullExam.durationMinutes * 60);
      }
    } catch (err) {
      alert("Failed to start assessment: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSelectOption = (questionId, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (!activeSession) return;
    
    try {
      setSubmittingExam(true);
      
      // Format answers for API
      const responses = activeSession.questions.map(q => ({
        questionId: q.id,
        selectedOption: selectedAnswers[q.id] || ""
      }));

      const res = await candidateService.submitAttempt(activeSession.attempt.id, responses);
      if (res.data) {
        setGradeResult({
          score: res.data.score,
          totalMarks: res.data.totalMarks,
          isPassed: res.data.score >= (activeSession.exam.passingMarks || Math.ceil(res.data.totalMarks * 0.5)),
          questions: activeSession.questions,
          selectedAnswers,
          examTitle: activeSession.exam.title
        });
        setActiveSession(null);
        setShowConfirmSubmit(false);
        fetchExamsAndAttempts(); // Refresh rosters
      }
    } catch (err) {
      alert("Failed to submit assessment answers: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingExam(false);
    }
  };

  const getAttemptStatus = (examId) => {
    const attempt = attempts.find(att => att.examId === examId && att.status === 'submitted');
    if (!attempt) return { completed: false };

    const quizScore = attempt.totalMarks ?? 0;
    const practicalScore = attempt.practicalMarks ?? 0;
    const vivaScore = attempt.vivaMarks ?? 0;
    const subjectiveScore = attempt.subjectiveMarks ?? 0;
    const totalScore = quizScore + practicalScore + vivaScore + subjectiveScore;

    return { 
      completed: true, 
      score: totalScore,
      quizScore,
      practicalMarks: practicalScore,
      vivaMarks: vivaScore,
      subjectiveMarks: subjectiveScore
    };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-12 font-mn text-txm">Syncing assigned evaluations...</div>;
  }

  // ── FULLSCREEN ASSESSMENT SESSION MODE ──────────────────────────────
  if (activeSession) {
    const questionsList = activeSession.questions || [];
    
    if (questionsList.length === 0) {
      return (
        <div className="fixed inset-0 z-50 bg-bg flex flex-col font-mn items-center justify-center p-6 text-center">
          <div className="bg-sf border border-br rounded-md max-w-md w-full p-8 shadow-2xl relative animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-rose-500 animate-pulse"></div>
            <div className="text-4xl mb-4">⚠️</div>
            <div className="font-hd text-[22px] text-kh uppercase tracking-[1px] mb-3">
              No Questions Configured
            </div>
            <p className="font-mn text-[12px] text-txm leading-relaxed mb-6">
              This examination has no questions assigned to it yet. Please contact your Exam Officer.
            </p>
            <button
              onClick={() => setActiveSession(null)}
              className="btn w-full bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 rounded font-mn text-[11px] uppercase font-bold tracking-[1px]"
            >
              ◀ Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    const currentQuestion = questionsList[currentIdx];
    const isLastQuestion = currentIdx === questionsList.length - 1;

    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-bg flex flex-col font-mn">
        {/* Header Block */}
        <div className="bg-sf border-b border-br px-6 py-4 flex justify-between items-center shrink-0">
          {/* Top Left: Previous Button */}
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(prev => prev - 1)}
            className="btn bg-sf border border-br text-txm hover:border-kh transition-colors py-2 px-4 rounded font-mn text-[11px] uppercase disabled:opacity-30 flex items-center space-x-1.5"
          >
            <span>◀</span> <span>PREVIOUS</span>
          </button>

          {/* Center Info and Timer */}
          <div className="flex flex-col items-center text-center">
            <div className="font-hd text-[26px] tracking-[2px] text-kh uppercase font-bold">
              {activeSession.exam.title}
            </div>
            <div className="text-[14px] text-khl mt-1.5 tracking-[1px] uppercase flex items-center space-x-3 font-mn">
              <span>SUBJECT: <strong className="text-white">{activeSession.exam.subject}</strong></span>
              <span className="text-br">•</span>
              <span className="flex items-center space-x-1.5">
                <span>TIME LEFT:</span>
                <strong className={`text-[15px] px-2.5 py-0.5 rounded border font-mono tracking-[1.5px] ${
                  timeLeft < 60 
                    ? 'text-rose-400 bg-rose-950/40 border-rose-800 animate-pulse' 
                    : 'text-am bg-am/10 border-am/30 font-bold'
                }`}>
                  {formatTime(timeLeft)}
                </strong>
              </span>
            </div>
          </div>

          {/* Top Right: Next / Finish Button */}
          {isLastQuestion ? (
            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="btn bg-am hover:bg-am/90 text-oldd transition-all py-2 px-4 rounded font-mn text-[11px] uppercase font-bold tracking-[1px] flex items-center"
            >
              FINISH ASSESSMENT ⚡
            </button>
          ) : (
            <button
              onClick={() => setCurrentIdx(prev => prev + 1)}
              className="btn bg-sf border border-br text-kh hover:border-kh transition-colors py-2 px-4 rounded font-mn text-[11px] uppercase flex items-center space-x-1.5"
            >
              <span>NEXT QUESTION</span> <span>▶</span>
            </button>
          )}
        </div>

        {/* Workspace Grid */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Area */}
          <div className="flex-1 p-10 overflow-y-auto flex flex-col justify-between">
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {/* Question metadata badge */}
              <div className="flex justify-between items-center text-[16px] font-bold uppercase tracking-[1.5px] text-khl border-b border-br/60 pb-3.5 font-hd">
                <span>QUESTION {currentIdx + 1} OF {activeSession.questions.length}</span>
                <span className="px-2.5 py-0.5 bg-am/15 border border-am/30 text-am rounded text-[11px] font-mn tracking-[0.5px] font-bold">
                  1 MARK
                </span>
              </div>

              {/* Question text */}
              <div className="font-hd text-[24px] text-kh leading-relaxed font-bold tracking-[0.5px] py-1">
                {currentQuestion.text}
              </div>

              {/* Answer options */}
              <div className="space-y-4 pt-4">
                {currentQuestion.type === 'mcq' && (
                  ['A', 'B', 'C', 'D'].map(opt => {
                    const labelKey = `option${opt}`;
                    const optText = currentQuestion[labelKey];
                    if (!optText) return null;

                    const isSelected = selectedAnswers[currentQuestion.id] === opt;

                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectOption(currentQuestion.id, opt)}
                        className={`w-full text-left p-5 rounded-lg border font-mn text-[15px] transition-all flex items-center space-x-5 shadow-sm ${
                          isSelected
                            ? 'bg-am/10 border-am text-kh'
                            : 'bg-sf border-br text-txm hover:border-am/50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] ${
                          isSelected ? 'bg-am text-oldd' : 'bg-sf2 border border-br text-txm'
                        }`}>
                          {opt}
                        </span>
                        <span className="font-medium text-khl">{optText}</span>
                      </button>
                    );
                  })
                )}

                {currentQuestion.type === 'truefalse' && (
                  ['A', 'B'].map(opt => {
                    const label = opt === 'A' ? 'True' : 'False';
                    const isSelected = selectedAnswers[currentQuestion.id] === opt;

                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectOption(currentQuestion.id, opt)}
                        className={`w-full text-left p-5 rounded-lg border font-mn text-[15px] transition-all flex items-center space-x-5 shadow-sm ${
                          isSelected
                            ? 'bg-am/10 border-am text-kh'
                            : 'bg-sf border-br text-txm hover:border-am/50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] ${
                          isSelected ? 'bg-am text-oldd' : 'bg-sf2 border border-br text-txm'
                        }`}>
                          {opt}
                        </span>
                        <span className="font-medium text-khl">{label}</span>
                      </button>
                    );
                  })
                )}

                {currentQuestion.type === 'fillblank' && (
                  <input
                    type="text"
                    value={selectedAnswers[currentQuestion.id] || ""}
                    onChange={(e) => handleSelectOption(currentQuestion.id, e.target.value)}
                    placeholder="Type your fill-in-the-blank response here..."
                    className="form-input bg-sf text-[16px] h-[56px] w-full mt-2 rounded-lg px-5 border-br/80 font-medium text-khl"
                  />
                )}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="max-w-4xl mx-auto w-full flex justify-center border-t border-br pt-6 mt-8 shrink-0">
              <div className="flex items-center space-x-2">
                {activeSession.questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-3 h-3 rounded-full transition-all border ${
                      i === currentIdx
                        ? 'bg-am border-am scale-125 shadow-sm shadow-am/50'
                        : selectedAnswers[activeSession.questions[i].id]
                          ? 'bg-kh/60 border-kh/60'
                          : 'bg-sf border-br hover:border-am/50'
                    }`}
                  ></button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Submit Overlay */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-sf border border-br rounded-md max-w-md w-full p-6 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <div className="font-hd text-[22px] text-kh uppercase tracking-[1px] mb-2">
                SUBMIT ASSESSMENT?
              </div>
              <p className="font-mn text-[12px] text-txm leading-relaxed mb-6">
                Are you absolutely sure you want to finish and submit this examination? Your response sheet will be graded and logged under your command profile. This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="btn flex-1 bg-sf border border-br text-txm hover:border-kh transition-colors py-2.5 rounded font-mn text-[11px] uppercase"
                >
                  No, Keep Reviewing
                </button>
                <button
                  disabled={submittingExam}
                  onClick={() => handleSubmitExam(false)}
                  className="btn flex-1 bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 rounded font-mn text-[11px] uppercase font-bold"
                >
                  {submittingExam ? 'Submitting...' : 'Yes, Submit Exam'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  }

  // ── MAIN EXAMS LISTING VIEW ───────────────────────────────────────────
  return (
    <div>
      {!hideHeader && (
        <div className="mb-6">
          <div className="font-hd text-[34px] tracking-[3px] text-kh leading-none">ASSIGNED EVALUATIONS</div>
          <div className="font-mn text-[10px] text-txd mt-1 tracking-[1.5px] uppercase">
            BEG & CENTRE ROORKEE · CANDIDATE EXAMINATION DEPLOYMENTS
          </div>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="bg-sf border border-br rounded-md p-10 text-center">
          <div className="text-3xl mb-2">📋</div>
          <div className="font-hd text-[18px] text-kh uppercase mb-1">No Active Exams</div>
          <p className="font-mn text-[12px] text-txm max-w-md mx-auto leading-relaxed">
            There are currently no active assessments assigned to your unit (<strong className="text-kh">{user?.unit}</strong>). Please coordinate with your Exam Officer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map(exam => {
            const status = getAttemptStatus(exam.id);

            return (
              <div key={exam.id} className="bg-sf border border-br rounded-md p-5 flex flex-col justify-between group hover:border-am/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-br group-hover:bg-am/40 transition-colors"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mn text-[9px] bg-sf2 border border-br px-2 py-0.5 rounded text-am uppercase tracking-[0.5px]">
                      {exam.code}
                    </span>
                    <span className={`font-mn text-[9px] px-2 py-0.5 rounded uppercase tracking-[1px] ${
                      status.completed 
                        ? 'bg-green-950 text-green-400 border border-green-800' 
                        : 'bg-am/10 text-am border border-am/20'
                    }`}>
                      {status.completed ? 'COMPLETED' : 'AVAILABLE'}
                    </span>
                  </div>

                  <div className="font-hd text-[20px] text-kh leading-snug uppercase mb-2">
                    {exam.title}
                  </div>

                  <div className="space-y-1.5 font-mn text-[11px] text-txm border-t border-br pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-txd uppercase">Subject:</span>
                      <span className="font-semibold text-kh">{exam.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-txd uppercase">Duration:</span>
                      <span className="font-semibold text-kh">{exam.durationMinutes} Minutes</span>
                    </div>

                  </div>
                </div>

                <div className="mt-6">
                  {status.completed ? (
                    <div className="space-y-2">
                      <div className="bg-sf2 border border-br text-center py-2.5 rounded font-mn text-[11px] text-txm tracking-[1px] uppercase flex items-center justify-center space-x-1.5">
                        <span>✔ COMPLETED · SCORE:</span>
                        <strong className="text-green-400">{status.score} MARKS</strong>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartExam(exam)}
                      className="btn bg-am hover:bg-am/90 text-oldd transition-colors w-full py-2.5 rounded font-mn text-[11px] tracking-[1px] uppercase font-bold flex items-center justify-center"
                    >
                      ⚡ START EXAMINATION
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── GRADED EXAM SUMMARY POPUP SHEET ───────────────────────────────── */}
      {gradeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-sf border border-br rounded-lg w-full max-w-3xl shadow-2xl p-8 relative animate-fade-in my-8">
            <div className="text-center pb-4 mb-6 border-b border-br">
              <span className={`text-[12px] font-mn px-3 py-1 rounded-sm uppercase tracking-[1px] inline-block font-semibold ${
                gradeResult.isPassed 
                  ? 'bg-green-950 text-green-400 border border-green-800' 
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {gradeResult.isPassed ? '✔ ASSESSMENT PASSED' : '✘ ASSESSMENT FAILED'}
              </span>
              <div className="font-hd text-[26px] text-kh uppercase tracking-[1px] mt-2 leading-none">
                {gradeResult.examTitle}
              </div>
              <div className="font-hd text-[42px] mt-3 leading-none" style={{ color: gradeResult.isPassed ? '#10b981' : '#f43f5e' }}>
                {gradeResult.score} <span className="text-[20px] text-txm font-mn">/ {gradeResult.totalMarks} MARKS</span>
              </div>
            </div>

            {/* Explanation Audit Sheet */}
            <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2">
              <div className="font-mn text-[10px] text-am tracking-[1.5px] uppercase">Evaluation Response Audit</div>
              
              {gradeResult.questions.map((q, idx) => {
                const selected = gradeResult.selectedAnswers[q.id] || "No Attempt";
                const correct = q.correctOptions;
                const isCorrect = correct.toLowerCase().trim() === selected.toLowerCase().trim();

                return (
                  <div key={q.id} className="bg-sf2 border border-br p-4 rounded space-y-2">
                    <div className="flex justify-between items-start text-[11px] font-mn border-b border-br/50 pb-2">
                      <span className="text-kh font-semibold uppercase">QUESTION {idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded font-mn text-[9px] uppercase tracking-[0.5px] ${
                        isCorrect 
                          ? 'bg-green-950/40 text-green-400 border border-green-900/40' 
                          : 'bg-rose-950/40 text-rose-400 border border-rose-900/40'
                      }`}>
                        {isCorrect ? '✔ CORRECT' : '✘ INCORRECT'}
                      </span>
                    </div>

                    <div className="font-hd text-[15px] text-kh leading-relaxed pt-1">
                      {q.text}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[11px] font-mn pt-1">
                      <div>
                        <span className="text-txd block uppercase text-[9px]">Your Selection</span>
                        <span className={`font-semibold ${isCorrect ? 'text-green-400' : 'text-rose-400'}`}>
                          {selected} {q.type === 'mcq' && q[`option${selected}`] ? ` - ${q[`option${selected}`]}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-txd block uppercase text-[9px]">Correct Answer</span>
                        <span className="font-semibold text-green-400">
                          {correct} {q.type === 'mcq' && q[`option${correct}`] ? ` - ${q[`option${correct}`]}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="bg-sf border border-br p-2.5 rounded font-mn text-[11px] text-txm leading-relaxed">
                      <strong className="text-kh text-[10px] uppercase block mb-0.5">Tactical Explanation:</strong>
                      {q.explanation || 'No explanation configured.'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-6 border-t border-br mt-6">
              <button
                onClick={() => setGradeResult(null)}
                className="btn bg-am hover:bg-am/90 text-oldd transition-all py-2.5 px-6 rounded font-mn text-[12px] uppercase font-bold"
              >
                Close and return to Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
