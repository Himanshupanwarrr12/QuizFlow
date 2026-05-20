import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { candidateService } from '../services/api';

export default function ExamPortal() {
  const { examId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);

  // Keep a mutable ref of the latest answers and session for the unload handler
  const sessionRef = useRef(activeSession);
  const answersRef = useRef(selectedAnswers);

  useEffect(() => {
    sessionRef.current = activeSession;
    answersRef.current = selectedAnswers;
  }, [activeSession, selectedAnswers]);

  useEffect(() => {
    // Attempt to go fullscreen on load if possible
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }

    const initExam = async () => {
      try {
        const res = await candidateService.startAttempt(examId);
        if (res.data) {
          const attempt = res.data.attempt;
          const fullExam = res.data.exam;
          const questionsList = (fullExam.questions || [])
            .map(eq => eq.question)
            .filter(q => q !== null && q !== undefined);
            
          setActiveSession({ attempt, exam: fullExam, questions: questionsList });
          setTimeLeft(fullExam.durationMinutes * 60);
        }
      } catch (err) {
        alert("Failed to start assessment: " + (err.response?.data?.message || err.message));
        window.close();
      } finally {
        setLoading(false);
      }
    };
    initExam();
  }, [examId]);

  // Restrict leaving page logic
  useEffect(() => {
    if (!activeSession || gradeResult) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Triggers the browser's default "Are you sure you want to leave?" prompt
      return '';
    };

    const handleUnload = () => {
      // If the user ignores the warning and forces close, auto-submit the paper via fetch keepalive
      const session = sessionRef.current;
      const answers = answersRef.current;
      if (session) {
        const responses = session.questions.map(q => ({
          questionId: q.id,
          selectedOption: answers[q.id] || ""
        }));

        const token = localStorage.getItem('token');
        // Fallback API URL from env or default
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        
        fetch(`${apiUrl}/candidates/attempts/${session.attempt.id}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ responses }),
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [activeSession, gradeResult]);

  // Timer logic
  useEffect(() => {
    if (!activeSession || timeLeft <= 0 || gradeResult) {
      if (activeSession && timeLeft === 0 && !gradeResult) {
        handleSubmitExam(true);
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [activeSession, timeLeft, gradeResult]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeSession || gradeResult) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        const isLast = currentIdx === activeSession.questions.length - 1;
        if (isLast) {
          if (showConfirmSubmit) handleSubmitExam(false);
          else setShowConfirmSubmit(true);
        } else {
          setCurrentIdx(prev => prev + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession, currentIdx, showConfirmSubmit, gradeResult]);

  const handleSelectOption = (questionId, option) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (!activeSession) return;
    try {
      setSubmittingExam(true);
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
          examTitle: activeSession.exam.title
        });
      }
    } catch (err) {
      alert("Failed to submit assessment answers: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingExam(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const closeWindow = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    window.close();
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-100 text-slate-500 flex items-center justify-center font-sans tracking-wide font-semibold">Initializing secure exam environment...</div>;
  }

  if (gradeResult) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl p-10 text-center animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#0c1240]"></div>
          
          <h1 className="text-[26px] font-bold text-[#0a192f] mb-2 uppercase tracking-wide font-sans">{gradeResult.examTitle}</h1>
          <p className="text-slate-400 text-[12px] font-bold tracking-widest uppercase mb-8">Assessment Complete</p>
          
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 mb-8 inline-block min-w-[200px]">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-3">Final Score</div>
            <div className={`text-[54px] font-black leading-none ${gradeResult.isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>
              {gradeResult.score} <span className="text-[20px] text-slate-400 font-bold">/ {gradeResult.totalMarks}</span>
            </div>
          </div>

          <p className={`text-[15px] font-semibold mb-10 ${gradeResult.isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
            {gradeResult.isPassed ? 'You have successfully passed this assessment.' : 'You did not meet the passing criteria for this assessment.'}
          </p>

          <button
            onClick={closeWindow}
            className="bg-[#0c1240] hover:bg-[#121b54] active:bg-[#070b2b] text-white font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wider text-[13px] w-full md:w-auto shadow-sm cursor-pointer"
          >
            Close Secure Window
          </button>
        </div>
      </div>
    );
  }

  if (!activeSession) return null;

  const currentQuestion = activeSession.questions[currentIdx];
  const isLastQuestion = currentIdx === activeSession.questions.length - 1;
  const isTimeCritical = timeLeft < 300; // less than 5 mins

  return (
    <div className="h-screen w-screen bg-slate-100 flex overflow-hidden font-sans text-slate-800 select-none">
      {/* Sidebar Navigation */}
      <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col z-10 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Active Assessment</div>
          <div className="text-[16px] font-bold text-[#0a192f] leading-snug uppercase tracking-wide">{activeSession.exam.title}</div>
          <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Time Left</span>
            <div className={`text-[18px] font-mono font-black border px-3 py-1 rounded-md ${isTimeCritical ? 'text-red-600 bg-red-50 border-red-200 animate-pulse' : 'text-[#0c1240] bg-slate-100 border-slate-200'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Question Navigation</div>
          <div className="grid grid-cols-5 gap-2.5">
            {activeSession.questions.map((q, idx) => {
              const isAnswered = !!selectedAnswers[q.id];
              const isActive = idx === currentIdx;
              
              let btnClass = "w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-bold transition-all border cursor-pointer font-sans ";
              
              if (isActive) {
                btnClass += "bg-[#0c1240] border-[#0c1240] text-white shadow-md scale-110 z-10";
              } else if (isAnswered) {
                btnClass += "bg-emerald-500 border-emerald-600 text-white shadow-sm hover:bg-emerald-600";
              } else {
                btnClass += "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50";
              }

              return (
                <button key={q.id} onClick={() => setCurrentIdx(idx)} className={btnClass}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-100 shrink-0 bg-slate-50/50">
           <button
             onClick={() => setShowConfirmSubmit(true)}
             className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 py-3.5 rounded-lg font-bold uppercase tracking-wider text-[12px] transition-colors cursor-pointer"
           >
             Finish Exam
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-0">
        <header className="h-[72px] border-b border-slate-200 flex items-center justify-between px-10 bg-white shadow-sm shrink-0">
          <div className="flex items-center space-x-2.5 text-[12px] font-bold tracking-widest text-slate-400 uppercase font-sans">
            <span>Subject:</span>
            <span className="text-[#0a192f]">{activeSession.exam.subject}</span>
          </div>
          <div className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 px-3.5 py-1.5 rounded-md border border-slate-200 tracking-wider">
            CANDIDATE ID: {activeSession.attempt.candidateId}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center">
          <div className="max-w-3xl w-full py-6">
            {/* Question Header */}
            <div className="mb-10 border-b border-slate-200 pb-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Question {currentIdx + 1} of {activeSession.questions.length}
                </span>
                <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded tracking-wider uppercase">
                  1 MARK
                </span>
              </div>
              <h2 className="text-[24px] md:text-[28px] font-bold text-[#0a192f] leading-relaxed font-sans">
                {currentQuestion.text}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-4">
              {currentQuestion.type === 'mcq' && ['A', 'B', 'C', 'D'].map(opt => {
                const optText = currentQuestion[`option${opt}`];
                if (!optText) return null;
                const isSelected = selectedAnswers[currentQuestion.id] === opt;
                
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={`w-full text-left p-6 rounded-xl border-2 transition-all flex items-center space-x-6 cursor-pointer group font-sans ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className={`w-[42px] h-[42px] rounded-full flex flex-shrink-0 items-center justify-center font-bold text-[14px] transition-colors border ${
                      isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:bg-white group-hover:border-blue-300 group-hover:text-blue-600'
                    }`}>
                      {opt}
                    </span>
                    <span className={`text-[16px] font-medium leading-relaxed ${isSelected ? 'text-[#0a192f]' : 'text-slate-600'}`}>
                      {optText}
                    </span>
                  </button>
                );
              })}

              {currentQuestion.type === 'truefalse' && ['A', 'B'].map(opt => {
                const label = opt === 'A' ? 'True' : 'False';
                const isSelected = selectedAnswers[currentQuestion.id] === opt;
                
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={`w-full text-left p-6 rounded-xl border-2 transition-all flex items-center space-x-6 cursor-pointer group font-sans ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className={`w-[42px] h-[42px] rounded-full flex flex-shrink-0 items-center justify-center font-bold text-[14px] transition-colors border ${
                      isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:bg-white group-hover:border-blue-300 group-hover:text-blue-600'
                    }`}>
                      {opt}
                    </span>
                    <span className={`text-[16px] font-medium leading-relaxed ${isSelected ? 'text-[#0a192f]' : 'text-slate-600'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}

              {currentQuestion.type === 'fillblank' && (
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={selectedAnswers[currentQuestion.id] || ""}
                    onChange={(e) => handleSelectOption(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-7 py-6 text-[16px] text-[#0a192f] placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-blue-50/10 transition-colors font-medium font-sans shadow-sm"
                  />
                  <div className="absolute inset-y-0 right-7 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">FILL IN THE BLANK</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Nav Arrows */}
            <div className="mt-14 flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="flex items-center space-x-2.5 text-slate-500 hover:text-[#0a192f] disabled:opacity-30 disabled:hover:text-slate-500 transition-colors uppercase font-bold tracking-widest text-[12px] px-6 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer"
              >
                <span className="text-[16px] leading-none mb-0.5">←</span> <span>Previous</span>
              </button>
              
              {!isLastQuestion ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="flex items-center space-x-2.5 bg-[#0c1240] hover:bg-[#121b54] active:bg-[#070b2b] text-white px-8 py-3.5 rounded-lg font-bold uppercase tracking-widest text-[12px] transition-colors cursor-pointer shadow-sm"
                >
                  <span>Next Question</span> <span className="text-[16px] leading-none mb-0.5">→</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmSubmit(true)}
                  className="flex items-center space-x-2.5 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-bold uppercase tracking-widest text-[12px] transition-colors shadow-sm cursor-pointer"
                >
                  <span>Finish Assessment</span> <span className="text-[14px] leading-none mb-0.5">✓</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Submission Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-8 relative animate-fade-in text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-5">
              ✓
            </div>
            <h3 className="text-[20px] font-bold text-[#0a192f] mb-3 uppercase tracking-wide">Submit Assessment</h3>
            <p className="text-slate-500 text-[13.5px] mb-8 leading-relaxed font-medium px-2">
              Are you sure you want to submit your assessment? You will not be able to change your answers after submission.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-3.5 rounded-lg font-bold uppercase tracking-wider text-[12px] transition-colors cursor-pointer"
              >
                Return to Exam
              </button>
              <button
                disabled={submittingExam}
                onClick={() => handleSubmitExam(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg font-bold uppercase tracking-wider text-[12px] transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center cursor-pointer"
              >
                {submittingExam ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
