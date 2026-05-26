import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { examService, candidateService } from '../services/api';

export default function MyExams({ hideHeader = false }) {
  const { user } = useAuth();
  const [exams,    setExams]    = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetchExamsAndAttempts = useCallback(async () => {
    try {
      const [examsRes, attemptsRes] = await Promise.all([
        examService.getExams(),
        candidateService.getAttempts()
      ]);
      const allExams    = examsRes.data?.exams    || [];
      const allAttempts = attemptsRes.data?.attempts || [];
      const candidateUnit = user?.unit || '';
      const filtered = allExams.filter(exam => {
        if (!exam.isActive) return false;
        const examUnits = (exam.units || 'All Units').toLowerCase();
        return examUnits.includes('all units') || examUnits.includes(candidateUnit.toLowerCase());
      });
      setExams(filtered);
      setAttempts(allAttempts);
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchExamsAndAttempts(); }, [fetchExamsAndAttempts]);

  useEffect(() => {
    const onFocus = () => fetchExamsAndAttempts();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchExamsAndAttempts]);

  const handleStartExam = (exam) => {
    const w = window.screen.availWidth;
    const h = window.screen.availHeight;
    window.open(`/exam-session/${exam.id}`, 'ExamPortalWindow',
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h}`);
  };

  const getAttemptStatus = (examId) => {
    const attempt = attempts.find(att => att.examId === examId && att.status === 'submitted');
    if (!attempt) return { completed: false };
    return { completed: true, score: (attempt.totalMarks ?? 0) + (attempt.practicalMarks ?? 0) + (attempt.vivaMarks ?? 0) + (attempt.subjectiveMarks ?? 0) };
  };

  if (loading && exams.length === 0) {
    return <div className="text-center py-16 text-[13px] font-semibold" style={{ color: 'var(--tx-mute)' }}>Syncing assessments...</div>;
  }

  const activeExamsList = exams.filter(exam => !getAttemptStatus(exam.id).completed);

  return (
    <div>
      {activeExamsList.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-[16px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--gold)' }}>No Active Exams</div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--tx-mute)' }}>
            No assessments assigned to your unit (<strong style={{ color: 'var(--tx-dim)' }}>{user?.unit}</strong>).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeExamsList.map(exam => {
            const now   = new Date();
            const start = exam.startTime ? new Date(exam.startTime) : null;
            const end   = exam.endTime   ? new Date(exam.endTime)   : null;
            let timingState = 'AVAILABLE';
            if (start && now < start)  timingState = 'UPCOMING';
            else if (end && now > end) timingState = 'EXPIRED';

            const badgeStyle = {
              AVAILABLE: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)'  },
              UPCOMING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
              EXPIRED:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',  border: 'rgba(244,63,94,0.3)'  },
            }[timingState];

            return (
              <div key={exam.id} className="card flex flex-col justify-between hover:border-[rgba(201,162,39,0.5)] transition-all duration-200 group border-t-2"
                style={{ borderTopColor: badgeStyle.color }}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--tx-mute)' }}>
                      {exam.code}
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider"
                      style={{ background: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.border}` }}>
                      {timingState}
                    </span>
                  </div>
                  <div className="text-[18px] font-black uppercase leading-tight mb-3" style={{ color: 'var(--gold)' }}>{exam.title}</div>
                  <div className="space-y-1.5 text-[12px] pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    {[
                      ['Subject',  exam.subject],
                      ['Duration', `${exam.durationMinutes} min`],
                      start && ['Starts',  start.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })],
                      end   && ['Ends',    end.toLocaleString([],   { dateStyle: 'short', timeStyle: 'short' })],
                    ].filter(Boolean).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="font-semibold uppercase tracking-wide" style={{ color: 'var(--tx-mute)' }}>{k}</span>
                        <span className="font-semibold" style={{ color: 'var(--tx)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  {timingState === 'AVAILABLE' ? (
                    <button onClick={() => handleStartExam(exam)}
                      className="w-full py-2.5 rounded-lg font-black uppercase tracking-widest text-[12px] transition-all cursor-pointer"
                      style={{ background: 'var(--gold)', color: '#0a1a10' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-l)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--gold)'}>
                      ⚡ Start Examination
                    </button>
                  ) : (
                    <button disabled className="w-full py-2.5 rounded-lg font-black uppercase tracking-widest text-[12px] cursor-not-allowed opacity-40"
                      style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--tx-mute)', border: '1px solid var(--border)' }}>
                      {timingState === 'UPCOMING' ? '⧖ Not Started Yet' : '✘ Expired'}
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
