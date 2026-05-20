import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { examService, candidateService } from '../services/api';

export default function MyExams({ hideHeader = false }) {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExamsAndAttempts = useCallback(async () => {
    try {
      const [examsRes, attemptsRes] = await Promise.all([
        examService.getExams(),
        candidateService.getAttempts()
      ]);
      
      const allExams = examsRes.data?.exams || [];
      const allAttempts = attemptsRes.data?.attempts || [];
      
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
  }, [user]);

  useEffect(() => {
    fetchExamsAndAttempts();
  }, [fetchExamsAndAttempts]);

  // Refresh roster when user returns to this window
  useEffect(() => {
    const onFocus = () => fetchExamsAndAttempts();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchExamsAndAttempts]);

  const handleStartExam = (exam) => {
    const w = window.screen.availWidth;
    const h = window.screen.availHeight;
    window.open(
      `/exam-session/${exam.id}`,
      'ExamPortalWindow',
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h}`
    );
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

  if (loading && exams.length === 0) {
    return <div className="text-center py-12 font-sans text-slate-500 font-semibold tracking-wide">Syncing assigned evaluations...</div>;
  }

  const activeExamsList = exams.filter(exam => {
    const status = getAttemptStatus(exam.id);
    return !status.completed;
  });

  return (
    <div className="font-sans">
      {activeExamsList.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center shadow-sm animate-fade-in">
          <div className="text-3xl mb-2">📋</div>
          <div className="font-bold text-[18px] text-[#0a192f] uppercase mb-1 font-sans">No Active Exams</div>
          <p className="text-[13px] text-slate-500 max-w-md mx-auto leading-relaxed font-sans">
            There are currently no active assessments assigned to your unit (<strong className="text-slate-700">{user?.unit}</strong>). Please coordinate with your Exam Officer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {activeExamsList.map(exam => {
            const now = new Date();
            const start = exam.startTime ? new Date(exam.startTime) : null;
            const end = exam.endTime ? new Date(exam.endTime) : null;

            let timingState = "AVAILABLE";
            if (start && now < start) {
              timingState = "UPCOMING";
            } else if (end && now > end) {
              timingState = "EXPIRED";
            }

            return (
              <div key={exam.id} className="bg-white border border-slate-200/80 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-slate-200 group-hover:bg-[#0c1240] transition-colors"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-[10px] bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded text-slate-600 uppercase tracking-[0.5px]">
                      {exam.code}
                    </span>
                    {timingState === "UPCOMING" && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded uppercase font-semibold tracking-wider font-sans border bg-amber-50 text-amber-700 border-amber-200">
                        UPCOMING
                      </span>
                    )}
                    {timingState === "EXPIRED" && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded uppercase font-semibold tracking-wider font-sans border bg-rose-50 text-rose-700 border-rose-200">
                        EXPIRED
                      </span>
                    )}
                    {timingState === "AVAILABLE" && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded uppercase font-semibold tracking-wider font-sans border bg-blue-50 text-blue-700 border-blue-200">
                        AVAILABLE
                      </span>
                    )}
                  </div>

                  <div className="text-[20px] text-[#0a192f] font-bold leading-snug uppercase mb-2 font-sans mt-3">
                    {exam.title}
                  </div>

                  <div className="space-y-1.5 text-[12px] text-slate-500 border-t border-slate-100 pt-3 mt-4 font-sans">
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase font-medium">Subject:</span>
                      <span className="font-semibold text-slate-700">{exam.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase font-medium">Duration:</span>
                      <span className="font-semibold text-slate-700">{exam.durationMinutes} Minutes</span>
                    </div>
                    {start && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 uppercase font-medium">Starts:</span>
                        <span className="font-semibold text-slate-600">{start.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    )}
                    {end && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 uppercase font-medium">Ends:</span>
                        <span className="font-semibold text-slate-600">{end.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  {timingState === "UPCOMING" ? (
                    <button
                      disabled
                      className="bg-slate-100 text-slate-450 border border-slate-200 w-full py-3 rounded-lg text-[12px] tracking-[0.5px] uppercase font-bold flex items-center justify-center cursor-not-allowed font-sans"
                    >
                      ⚡ NOT STARTED YET
                    </button>
                  ) : timingState === "EXPIRED" ? (
                    <button
                      disabled
                      className="bg-slate-100 text-slate-450 border border-slate-200 w-full py-3 rounded-lg text-[12px] tracking-[0.5px] uppercase font-bold flex items-center justify-center cursor-not-allowed font-sans"
                    >
                      ✘ EXPIRED
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartExam(exam)}
                      className="bg-[#0c1240] hover:bg-[#121b54] active:bg-[#070b2b] text-white transition-colors duration-200 w-full py-3 rounded-lg text-[12.5px] tracking-[0.5px] uppercase font-bold flex items-center justify-center cursor-pointer shadow-sm font-sans"
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
    </div>
  );
}
