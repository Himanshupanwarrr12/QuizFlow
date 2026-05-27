import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { candidateService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ExamPortal() {
  const { user } = useAuth();
  const { examId } = useParams();

  const [loading, setLoading]                 = useState(true);
  const [activeSession, setActiveSession]     = useState(null);
  const [showRules, setShowRules]             = useState(false);
  const [currentIdx, setCurrentIdx]           = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [timeLeft, setTimeLeft]               = useState(0);
  const [submittingExam, setSubmittingExam]   = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [gradeResult, setGradeResult]         = useState(null);

  // SECURITY STATES
  const [securityViolation, setSecurityViolation] = useState(null);
  const [violationCount, setViolationCount]       = useState(0);

  const sessionRef = useRef(activeSession);
  const answersRef = useRef(selectedAnswers);
  const violationRef = useRef(securityViolation);
  const submitRef = useRef(null);

  useEffect(() => {
    sessionRef.current = activeSession;
    answersRef.current = selectedAnswers;
    violationRef.current = securityViolation;
  }, [activeSession, selectedAnswers, securityViolation]);

  useEffect(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});

    const initExam = async () => {
      try {
        const res = await candidateService.startAttempt(examId);
        if (res.data) {
          const attempt     = res.data.attempt;
          const fullExam    = res.data.exam;
          const questionsList = (fullExam.questions || [])
            .map(eq => eq.question)
            .filter(q => q !== null && q !== undefined);
          setActiveSession({ attempt, exam: fullExam, questions: questionsList });
          setTimeLeft(fullExam.durationMinutes * 60);
          setShowRules(true);
        }
      } catch (err) {
        alert('Failed to start assessment: ' + (err.response?.data?.message || err.message));
        window.close();
      } finally {
        setLoading(false);
      }
    };
    initExam();
  }, [examId]);

  // ── SECURITY PROTOCOLS ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession || showRules || gradeResult) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setSecurityViolation('Exiting full-screen mode is not allowed during the examination.');
        setViolationCount(prev => prev + 1);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (submitRef.current) {
          submitRef.current('leave');
        }
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      setSecurityViolation('Right-click context menu is not allowed during the examination.');
      setViolationCount(prev => prev + 1);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !violationRef.current) {
        e.preventDefault();
        const isLast = currentIdx === activeSession.questions.length - 1;
        if (isLast) { if (showConfirmSubmit) handleSubmitExam(false); else setShowConfirmSubmit(true); }
        else setCurrentIdx(prev => prev + 1);
        return;
      }

      const forbiddenKeys = [
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
        'Escape', 'Alt', 'Meta', 'ContextMenu'
      ];
      
      if (forbiddenKeys.includes(e.key)) {
        e.preventDefault();
        setSecurityViolation(`The ${e.key} key is not allowed during examination.`);
        setViolationCount(prev => prev + 1);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [activeSession, showRules, gradeResult, currentIdx, showConfirmSubmit]);

  useEffect(() => {
    if (!activeSession || showRules || gradeResult) return;
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
    const handleUnload = () => {
      const session = sessionRef.current;
      const answers = answersRef.current;
      if (session) {
        const responses = session.questions.map(q => ({ questionId: q.id, selectedOption: answers[q.id] || '' }));
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        fetch(`${apiUrl}/candidate/attempts/${session.attempt.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses }),
          keepalive: true,
          credentials: 'include',
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [activeSession, showRules, gradeResult]);

  useEffect(() => {
    if (!activeSession || showRules || gradeResult) return;
    
    if (timeLeft <= 0) {
      handleSubmitExam('time');
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [activeSession, showRules, timeLeft, gradeResult]);

  const handleSelectOption = (questionId, option) =>
    setSelectedAnswers(prev => ({ ...prev, [questionId]: option }));

  const toggleFlagQuestion = (questionId) => {
    setFlaggedQuestions(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSubmitExam = async (autoSubmitType = null) => {
    if (!activeSession) return;
    try {
      setSubmittingExam(true);
      const responses = activeSession.questions.map(q => ({
        questionId: q.id,
        selectedOption: selectedAnswers[q.id] || '',
      }));
      const res = await candidateService.submitAttempt(activeSession.attempt.id, responses);
      if (res.data) {
        setGradeResult({
          score:      res.data.score,
          totalMarks: res.data.totalMarks,
          isPassed:   res.data.score >= (activeSession.exam.passingMarks || Math.ceil(res.data.totalMarks * 0.5)),
          examTitle:  activeSession.exam.title,
          questions:  activeSession.questions // Pass questions for detailed review
        });
        if (autoSubmitType === 'leave') {
          alert('You navigated away or left the exam page. Your exam has been automatically submitted.');
        }
      }
    } catch (err) {
      alert('Failed to submit assessment answers: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingExam(false);
      setShowConfirmSubmit(false);
    }
  };

  useEffect(() => {
    submitRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const closeWindow = () => {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    if (window.opener) {
      window.opener.location.reload(); // Force refresh the exam list
    }
    window.close();
  };

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans select-none" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-transparent border-t-[#c9a227] rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--gold)' }}></div>
          <p className="font-semibold text-[14px] uppercase tracking-wider" style={{ color: 'var(--gold)' }}>Initializing Secure Environment...</p>
        </div>
      </div>
    );
  }

  // ── AUTO SUBMITTING OVERLAY ─────────────────────────────────────────────────
  if (submittingExam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans select-none" style={{ background: 'var(--bg)' }}>
        <div className="text-center p-10 border max-w-md w-full animate-pulse" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="w-16 h-16 border-4 border-transparent border-t-[#c9a227] rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-white text-[20px] font-black uppercase tracking-wider mb-2">Securing Assessment</h2>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--tx-mute)' }}>
            Please wait. Your answers are being securely uploaded and graded by the examination server...
          </p>
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN (DETAILED) ────────────────────────────────────────────────
  if (gradeResult) {
    return (
      <div className="min-h-screen flex flex-col p-8 font-sans select-none overflow-y-auto" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-4xl mx-auto p-8 shadow-sm text-left border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-end border-b pb-4 mb-6" style={{ borderColor: 'var(--border-l)' }}>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--gold)' }}>Assessment Complete</p>
              <h1 className="text-white text-[24px] font-bold uppercase tracking-wide">{gradeResult.examTitle}</h1>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--gold)' }}>Final Score</p>
              <div className={`text-[32px] font-bold leading-none ${gradeResult.isPassed ? 'text-green-400' : 'text-red-400'}`}>
                {gradeResult.score} <span className="text-[18px] font-normal" style={{ color: 'var(--tx-mute)' }}>/ {gradeResult.totalMarks}</span>
              </div>
              <p className={`mt-1 font-bold text-[12px] uppercase tracking-wider ${gradeResult.isPassed ? 'text-green-400' : 'text-red-400'}`}>
                {gradeResult.isPassed ? 'Passed' : 'Failed'}
              </p>
            </div>
          </div>
          
          <div className="space-y-6 mb-10">
            <h3 className="text-white font-bold text-[16px] uppercase tracking-wider mb-4 border-b pb-2" style={{ borderColor: 'var(--border-l)' }}>Detailed Review</h3>
            {gradeResult.questions.map((q, idx) => {
              const selected = selectedAnswers[q.id] || "";
              const correct = q.correctOptions || "";
              const isCorrect = selected.toLowerCase() === correct.toLowerCase();
              
              return (
                <div key={q.id} className={`p-4 border ${isCorrect ? 'border-green-800 bg-green-900/10' : 'border-red-800 bg-red-900/10'}`}>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <p className="font-medium text-[15px]" style={{ color: 'var(--tx)' }}>
                      <span className="font-bold mr-2" style={{ color: 'var(--gold)' }}>{idx + 1}.</span> {q.text}
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex-shrink-0"
                      style={{
                        background: q.category === 'Must Know' ? 'rgba(244,63,94,0.15)' : q.category === 'Could Know' ? 'rgba(56,189,248,0.15)' : 'rgba(245,158,11,0.15)',
                        color: q.category === 'Must Know' ? '#f43f5e' : q.category === 'Could Know' ? '#38bdf8' : '#f59e0b',
                        border: `1px solid ${q.category === 'Must Know' ? '#f43f5e30' : q.category === 'Could Know' ? '#38bdf830' : '#f59e0b30'}`
                      }}>
                      {q.category || 'Must Know'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-black/20 border border-black/30">
                      <p className="text-[11px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--tx-mute)' }}>Your Answer</p>
                      <p className={`font-semibold text-[14px] ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {selected ? `${selected} - ${q['option'+selected.toUpperCase()] || 'Selected'}` : 'Not Attempted'}
                      </p>
                    </div>
                    <div className="p-3 bg-black/20 border border-black/30">
                      <p className="text-[11px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--tx-mute)' }}>Correct Answer</p>
                      <p className="text-green-400 font-semibold text-[14px]">
                        {correct ? `${correct} - ${q['option'+correct.toUpperCase()] || 'Correct'}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center border-t pt-6" style={{ borderColor: 'var(--border-l)' }}>
            <button onClick={closeWindow}
              className="text-[#0a1a10] font-bold py-3 px-10 transition-colors text-[14px] uppercase tracking-widest cursor-pointer hover:opacity-90"
              style={{ background: 'var(--gold)' }}>
              Close Examination
            </button>
            <p className="text-[11px] mt-4 font-semibold" style={{ color: 'var(--tx-mute)' }}>This examination will be removed from your active list.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSession) return null;

  if (!activeSession.questions || activeSession.questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans select-none p-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center p-10 border max-w-md w-full rounded-2xl relative overflow-hidden" 
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <div className="w-12 h-12 border-2 border-transparent border-t-[#c9a227] rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-[20px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--gold)' }}>No Questions Available</h2>
          <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--tx-mute)' }}>
            This examination does not contain any questions. Please contact the administrator to assign questions to this exam.
          </p>
          <button onClick={closeWindow} className="btn btn-primary w-full justify-center py-2.5 uppercase tracking-widest text-[12px]">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── RULES PAGE ───────────────────────────────────────────────────────────────
  if (showRules) {
    const rules = [
      'Read each question carefully before selecting your answer.',
      'Once you submit, answers cannot be changed.',
      'Do not close, refresh, or navigate away from this window. Your paper will be auto-submitted.',
      'You may navigate between questions freely using the sidebar panel.',
      'You can flag questions for review if you have doubts.',
      'The timer will begin immediately after you accept these rules.',
      'Any form of malpractice will result in immediate disqualification.',
    ];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 font-sans select-none" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-2xl border p-10" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-center mb-8 border-b pb-6" style={{ borderColor: 'var(--border-l)' }}>
            <p className="font-bold uppercase tracking-widest text-[12px] mb-2" style={{ color: 'var(--gold)' }}>Secure Examination Portal</p>
            <h1 className="text-white text-[24px] font-bold uppercase tracking-wide">{activeSession.exam.title}</h1>
            <p className="text-[14px] mt-2 font-medium" style={{ color: 'var(--tx-dim)' }}>
              {activeSession.exam.subject} &nbsp;|&nbsp; {activeSession.exam.durationMinutes} Minutes
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-white font-bold text-[15px] mb-4 uppercase tracking-wider">Examination Protocol</h3>
            <ul className="space-y-3">
              {rules.map((rule, i) => (
                <li key={i} className="flex items-start text-[14px] leading-relaxed" style={{ color: 'var(--tx-dim)' }}>
                  <span className="mr-3 font-bold" style={{ color: 'var(--gold)' }}>{i + 1}.</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center pt-6 border-t" style={{ borderColor: 'var(--border-l)' }}>
            <button
              onClick={() => {
                setShowRules(false);
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="font-bold py-3.5 px-10 transition-colors text-[14px] uppercase tracking-widest cursor-pointer hover:opacity-90"
              style={{ background: 'var(--gold)', color: '#0a1a10' }}>
              Accept & Begin Examination
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SECURITY VIOLATION SCREEN ────────────────────────────────────────────────
  if (securityViolation) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans select-none p-6"
           style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-2xl border border-[var(--gold)] p-1 shadow-2xl">
          <div className="border border-[var(--gold)] p-10 text-center relative"
               style={{ background: 'var(--surface)' }}>
            
            <div className="absolute -top-[45px] left-1/2 -translate-x-1/2 w-[90px] h-[90px] rounded-full border-[3px] flex items-center justify-center shadow-lg"
                 style={{ background: 'var(--bg)', borderColor: 'var(--gold)' }}>
              <svg viewBox="0 0 24 24" fill="var(--gold)" className="w-[45px] h-[45px]">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>

            <h1 className="text-[24px] sm:text-[28px] font-black uppercase tracking-[4px] sm:tracking-[6px] mt-8 mb-10 text-shadow" style={{ color: 'var(--gold)' }}>
              Security Protocol Violation
            </h1>

            <div className="relative mb-8 max-w-lg mx-auto">
              <h3 className="font-black text-[13px] uppercase tracking-[4px] mb-6" style={{ color: 'var(--gold)' }}>
                Violation Report
              </h3>
              
              <div className="absolute top-0 right-0 px-3 py-1 font-bold text-[10px] tracking-widest hidden sm:block" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>
                CLASSIFIED
              </div>

              <div className="space-y-2">
                <p className="font-black text-[15px] sm:text-[16px] uppercase tracking-wider text-red-400">
                  Violation #{violationCount}:
                </p>
                <p className="text-white font-black text-[15px] sm:text-[16px]">
                  {securityViolation}
                </p>
                <p className="text-white/80 font-bold text-[13px] sm:text-[14px] mt-4">
                  This incident has been logged in the security database.
                </p>
              </div>
            </div>

            <div className="border-t border-b border-[var(--border)] py-4 mb-8">
              <p className="font-black text-[11px] sm:text-[13px] tracking-[2px] sm:tracking-[3px] uppercase" style={{ color: 'var(--gold)' }}>
                Examination progress has been automatically secured
              </p>
            </div>

            <h3 className="font-black text-[12px] sm:text-[13px] uppercase tracking-[3px] sm:tracking-[4px] mb-3" style={{ color: 'var(--gold)' }}>
              Action Required
            </h3>
            <p className="font-medium text-[12px] sm:text-[13px] mb-10" style={{ color: 'var(--tx-dim)' }}>
              Select your course of action to proceed with the examination protocol.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pb-8">
              <button 
                onClick={() => {
                  setSecurityViolation(null);
                  if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(()=>{});
                  }
                }}
                className="bg-transparent hover:bg-white/10 border-[2px] text-white px-8 py-3.5 rounded-none font-black text-[12px] tracking-widest transition-colors cursor-pointer"
                style={{ borderColor: 'var(--gold)' }}>
                Return to Examination
              </button>
              
              <button 
                disabled={submittingExam}
                onClick={() => {
                  setSecurityViolation(null);
                  handleSubmitExam(false);
                }}
                className="bg-red-800 hover:bg-red-700 text-white px-10 py-3.5 rounded-none font-black text-[12px] tracking-widest transition-colors cursor-pointer disabled:opacity-50 border-[2px] border-red-800 hover:border-red-700">
                {submittingExam ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
            
            <div className="mt-4">
               <span className="text-[10px] uppercase tracking-[3px] font-black" style={{ color: 'var(--tx-mute)' }}>
                 Military Examination Security Protocol
               </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── EXAM SESSION ─────────────────────────────────────────────────────────────
  const currentQuestion = activeSession.questions[currentIdx];
  const isLastQuestion  = currentIdx === activeSession.questions.length - 1;
  const isTimeCritical  = timeLeft < 300;
  const isFlagged       = flaggedQuestions[currentQuestion.id];

  const optionBase    = 'w-full text-left px-5 py-4 border transition-colors flex items-center gap-4 cursor-pointer font-sans text-white';
  const optionDefault = 'hover:bg-white/5';
  const optionActive  = 'bg-white/10';

  const circleBase    = 'w-7 h-7 flex flex-shrink-0 items-center justify-center font-bold text-[13px] transition-colors border';
  const circleDefault = 'text-gray-400 group-hover:text-white';
  const circleActive  = 'text-white';

  return (
    <div className="h-screen w-screen flex overflow-hidden font-sans select-none text-white" style={{ background: 'var(--bg)' }}>
      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className="w-[280px] flex flex-col shrink-0 border-r z-10" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        
        {/* Exam title + timer */}
        <div className="p-6 border-b flex-shrink-0 bg-black/10" style={{ borderColor: 'var(--border-l)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--gold)' }}>Active Assessment</p>
          <p className="font-bold text-[14px] uppercase tracking-wide leading-snug">
            {activeSession.exam.title}
          </p>
          <div className="mt-6 flex flex-col">
            <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2">Time Remaining</span>
            <div className={`font-mono font-bold text-[26px] px-4 py-2 border bg-black/20 text-center transition-all duration-300 ${
              timeLeft < 60 
                ? 'text-red-500 border-red-500 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
                : isTimeCritical 
                  ? 'text-orange-400 border-orange-700 bg-orange-950/10 shadow-[0_0_10px_rgba(251,146,60,0.15)]'
                  : 'text-[var(--gold)] border-[var(--border)]'
            }`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Question grid */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-4">Question Navigator</p>
          <div className="grid grid-cols-5 gap-2">
            {activeSession.questions.map((q, idx) => {
              const isAnswered = !!selectedAnswers[q.id];
              const isActive   = idx === currentIdx;
              const hasFlag    = !!flaggedQuestions[q.id];
              
              let cls = 'w-9 h-9 flex items-center justify-center text-[13px] font-bold transition-colors border cursor-pointer relative ';
              
              if (isActive) {
                cls += 'text-[#111c16]';
              } else if (isAnswered) {
                cls += 'bg-green-700/80 border-green-500 text-white hover:bg-green-600';
              } else {
                cls += 'bg-transparent text-gray-400 hover:bg-black/20 hover:text-white';
              }
              
              return (
                <button key={q.id} onClick={() => setCurrentIdx(idx)} className={cls} style={isActive ? { background: 'var(--gold)', borderColor: 'var(--gold)' } : (isAnswered ? { borderColor: 'var(--green)' } : { borderColor: 'var(--border)' })}>
                  {idx + 1}
                  {hasFlag && (
                    <span className="absolute -top-1.5 -right-1.5 text-orange-500 text-[14px] drop-shadow-sm">⚑</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-4 border-t flex flex-col gap-2 flex-shrink-0 bg-black/10" style={{ borderColor: 'var(--border-l)' }}>
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wide">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-700/80 border" style={{ borderColor: 'var(--green)' }}></div> Attempted
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-transparent border" style={{ borderColor: 'var(--border)' }}></div> Pending
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-1">
             <span className="text-orange-500 text-[12px]">⚑</span> Flagged for Review
          </div>
        </div>

        {/* Finish button */}
        <div className="p-6 border-t flex-shrink-0 bg-black/20" style={{ borderColor: 'var(--border-l)' }}>
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="w-full border border-red-900 text-red-400 bg-red-900/10 hover:bg-red-900 hover:text-white py-3 font-bold uppercase tracking-widest text-[13px] transition-colors cursor-pointer">
            End Assessment
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col" style={{ background: 'var(--bg)' }}>
        
        {/* Header bar */}
        <header className="h-[72px] border-b flex items-center justify-between px-10 shrink-0 z-10" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 text-[13px] font-bold uppercase tracking-wider text-white">
            <span className="text-gray-400">Subject:</span>
            <span style={{ color: 'var(--gold)' }}>{activeSession.exam.subject}</span>
          </div>
          <div className="font-mono text-[13px] text-gray-300 font-bold uppercase tracking-widest border px-4 py-2 bg-black/20" style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--gold)' }}>{user?.name || 'CANDIDATE'}</span> &nbsp;|&nbsp; ID: {activeSession.attempt.candidateId}
          </div>
        </header>

        {timeLeft < 60 && (
          <div className="bg-red-950/40 border-b border-red-800/60 px-10 py-2.5 flex items-center justify-between animate-pulse">
            <span className="text-[12px] font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
              ⚠️ CRITICAL: Under 60 seconds remaining!
            </span>
            <span className="text-[11px] font-bold uppercase text-red-300">
              Exam will submit automatically when timer expires
            </span>
          </div>
        )}

        {/* Question content */}
        <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center">
          <div className="max-w-3xl w-full h-full flex flex-col">

            {/* Question meta + text */}
            <div className="mb-8 pb-6 border-b flex-shrink-0" style={{ borderColor: 'var(--border-l)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--tx-mute)' }}>
                  Question {currentIdx + 1} of {activeSession.questions.length}
                </span>
                <span className="text-[12px] font-bold border px-3 py-1 bg-black/20" style={{ borderColor: 'var(--border)', color: 'var(--tx-mute)' }}>
                  1 Mark
                </span>
              </div>
              <h2 className="text-white text-[18px] font-medium leading-relaxed">
                {currentQuestion.text}
              </h2>
            </div>

            {/* Answer options */}
            <div className="space-y-3 flex-shrink-0 pb-10">
              {currentQuestion.type === 'mcq' && ['A', 'B', 'C', 'D'].map(opt => {
                const optText    = currentQuestion[`option${opt}`];
                if (!optText) return null;
                const isSelected = selectedAnswers[currentQuestion.id] === opt;
                return (
                  <button key={opt} onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={`${optionBase} ${isSelected ? optionActive : optionDefault}`}
                    style={{ background: isSelected ? 'rgba(201,162,39,0.1)' : 'var(--bg)', borderColor: isSelected ? 'var(--gold)' : 'var(--border)' }}>
                    <span className={`${circleBase} ${isSelected ? circleActive : circleDefault}`} style={isSelected ? { background: 'var(--gold)', borderColor: 'var(--gold)', color: 'var(--bg)' } : { borderColor: 'var(--border)' }}>{opt}</span>
                    <span className={`text-[15px] ${isSelected ? 'font-medium' : 'font-normal'}`} style={isSelected ? { color: 'var(--gold)' } : { color: 'var(--tx)' }}>
                      {optText}
                    </span>
                  </button>
                );
              })}

              {currentQuestion.type === 'truefalse' && ['A', 'B'].map(opt => {
                const label      = opt === 'A' ? 'True' : 'False';
                const isSelected = selectedAnswers[currentQuestion.id] === opt;
                return (
                  <button key={opt} onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={`${optionBase} ${isSelected ? optionActive : optionDefault}`}
                    style={{ background: isSelected ? 'rgba(201,162,39,0.1)' : 'var(--bg)', borderColor: isSelected ? 'var(--gold)' : 'var(--border)' }}>
                    <span className={`${circleBase} ${isSelected ? circleActive : circleDefault}`} style={isSelected ? { background: 'var(--gold)', borderColor: 'var(--gold)', color: 'var(--bg)' } : { borderColor: 'var(--border)' }}>{opt}</span>
                    <span className={`text-[15px] ${isSelected ? 'font-medium' : 'font-normal'}`} style={isSelected ? { color: 'var(--gold)' } : { color: 'var(--tx)' }}>
                      {label}
                    </span>
                  </button>
                );
              })}

              {currentQuestion.type === 'fillblank' && (
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={selectedAnswers[currentQuestion.id] || ''}
                    onChange={(e) => handleSelectOption(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full px-5 py-4 text-[15px] text-white placeholder-gray-500 focus:outline-none transition-colors border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  />
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-auto pt-6 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--border-l)' }}>
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 font-bold uppercase tracking-widest text-[13px] transition-colors cursor-pointer flex items-center gap-2">
                ← Previous
              </button>

              <button
                onClick={() => toggleFlagQuestion(currentQuestion.id)}
                className={`flex items-center gap-2 px-5 py-2.5 border font-bold uppercase tracking-widest text-[12px] transition-colors cursor-pointer ${
                  isFlagged 
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
                    : 'bg-transparent text-gray-400 hover:bg-black/20'
                }`} style={isFlagged ? {} : { borderColor: 'var(--border)' }}>
                <span className={isFlagged ? "text-orange-400" : "text-gray-500"}>⚑</span> 
                {isFlagged ? 'Flagged' : 'Flag for Review'}
              </button>

              {!isLastQuestion ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="text-[#0a1a10] px-10 py-3 font-bold uppercase tracking-widest text-[13px] transition-colors cursor-pointer flex items-center gap-2 hover:opacity-90"
                  style={{ background: 'var(--gold)' }}>
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmSubmit(true)}
                  className="bg-green-700 hover:bg-green-600 text-white px-10 py-3 font-bold uppercase tracking-widest text-[13px] transition-colors cursor-pointer flex items-center gap-2">
                  Finish ✓
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── SUBMIT CONFIRM MODAL ─────────────────────────────────────────────── */}
      {showConfirmSubmit && !securityViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md border p-10 text-center shadow-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center mx-auto mb-6 bg-black/20" style={{ borderColor: 'var(--gold)' }}>
              <span className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>?</span>
            </div>
            <h3 className="text-white text-[18px] font-bold mb-3 uppercase tracking-widest">Submit Assessment</h3>
            <p className="text-[14px] mb-8 leading-relaxed" style={{ color: 'var(--tx-dim)' }}>
              Are you sure you want to submit? You will not be able to change your answers after submission.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 border hover:bg-white/5 py-3.5 font-bold uppercase tracking-widest text-[12px] transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--tx)' }}>
                Return
              </button>
              <button
                disabled={submittingExam}
                onClick={() => handleSubmitExam(false)}
                className="flex-1 text-[#0a1a10] hover:opacity-90 py-3.5 font-bold uppercase tracking-widest text-[12px] transition-colors disabled:opacity-70 cursor-pointer"
                style={{ background: 'var(--gold)' }}>
                {submittingExam ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
