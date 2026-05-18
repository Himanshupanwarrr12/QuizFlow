import { useState, useEffect } from 'react';
import { examService, questionService, candidateService, resultService } from '../services/api';

const AVAILABLE_UNITS = [
  'HQ BEG', '21 Engr Regt', '22 Engr Regt', 'A Coy', 'B Coy', 'C Coy', 
  'HQ Coy', 'Support Coy', 'Field Coy', 'Workshop', 'Signals Platoon'
];

const defaultForm = {
  title: '',
  code: '',
  subject: '',
  course: 'Basic Combat Engineering',
  durationMinutes: 30,
  allowedAttempts: 1,
  units: [],
  randomizeOrder: true,
  shuffleOptions: false,
  showResult: true,
  instructions: '1. All questions are compulsory.\n2. Do not switch tabs during the exam.\n3. Submit before timer expires.',
  questionIds: []
};

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [submitting, setSubmitting] = useState(false);

  // State for the new Grading Console Feature
  const [gradingConsoleOpen, setGradingConsoleOpen] = useState(false);
  const [selectedGradingExam, setSelectedGradingExam] = useState(null);
  const [allCandidatesList, setAllCandidatesList] = useState([]);
  const [examAttemptsList, setExamAttemptsList] = useState([]);
  const [gradingSearchQuery, setGradingSearchQuery] = useState('');
  const [gradingUnitFilter, setGradingUnitFilter] = useState('');
  const [loadingGradingData, setLoadingGradingData] = useState(false);

  // States for the inline score sheet form
  const [activeGradingCandidate, setActiveGradingCandidate] = useState(null);
  const [gradingQuizScore, setGradingQuizScore] = useState(0);
  const [gradingPracticalMarks, setGradingPracticalMarks] = useState(0);
  const [gradingVivaMarks, setGradingVivaMarks] = useState(0);
  const [gradingSubjectiveMarks, setGradingSubjectiveMarks] = useState(0);
  const [gradingReason, setGradingReason] = useState('First time grading');
  const [gradingError, setGradingError] = useState('');
  const [gradingSubmitting, setGradingSubmitting] = useState(false);

  const handleOpenGradingConsole = async (exam) => {
    setSelectedGradingExam(exam);
    setGradingConsoleOpen(true);
    setLoadingGradingData(true);
    setGradingSearchQuery('');
    setGradingUnitFilter('');
    setActiveGradingCandidate(null);

    try {
      // 1. Fetch all candidates (load up to 1000 to include full registries)
      const candidatesRes = await candidateService.getCandidates({ limit: 1000 });
      setAllCandidatesList(candidatesRes.data?.candidates || []);

      // 2. Fetch all attempts for this exam
      const resultsRes = await resultService.getResults({ examId: exam.id });
      setExamAttemptsList(resultsRes.data?.results || []);
    } catch (err) {
      alert("Failed to load grading roster: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingGradingData(false);
    }
  };

  const handleOpenCandidateGradeForm = (candidate, existingAttempt = null) => {
    setActiveGradingCandidate(candidate);
    setGradingError('');
    setGradingReason(existingAttempt?.reason || 'Administrative marks allocation');

    if (existingAttempt) {
      setGradingQuizScore(existingAttempt.quizScore !== undefined ? existingAttempt.quizScore : 0);
      setGradingPracticalMarks(existingAttempt.practicalMarks !== undefined ? existingAttempt.practicalMarks : 0);
      setGradingVivaMarks(existingAttempt.vivaMarks !== undefined ? existingAttempt.vivaMarks : 0);
      setGradingSubjectiveMarks(existingAttempt.subjectiveMarks !== undefined ? existingAttempt.subjectiveMarks : 0);
    } else {
      setGradingQuizScore(0);
      setGradingPracticalMarks(0);
      setGradingVivaMarks(0);
      setGradingSubjectiveMarks(0);
    }
  };

  const handleSaveCandidateGrades = async (e) => {
    e.preventDefault();
    if (!activeGradingCandidate || !selectedGradingExam) return;

    setGradingError('');
    const parsedQuiz = parseInt(gradingQuizScore);
    const parsedPractical = parseInt(gradingPracticalMarks);
    const parsedViva = parseInt(gradingVivaMarks);

    if (isNaN(parsedQuiz) || parsedQuiz < 0 || parsedQuiz > selectedGradingExam.totalMarks) {
      setGradingError(`Subjective (Written Exam) marks must be between 0 and ${selectedGradingExam.totalMarks}.`);
      return;
    }
    if (isNaN(parsedPractical) || parsedPractical < 0 || parsedPractical > 20) {
      setGradingError('Practical marks must be between 0 and 20.');
      return;
    }
    if (isNaN(parsedViva) || parsedViva < 0 || parsedViva > 20) {
      setGradingError('Viva marks must be between 0 and 20.');
      return;
    }

    try {
      setGradingSubmitting(true);

      // Check if attempt exists
      let attempt = examAttemptsList.find(a => a.candidateId === activeGradingCandidate.id);
      let attemptId;

      if (!attempt) {
        // Initialize placeholders record
        const initRes = await resultService.initializeAttempt({
          candidateId: activeGradingCandidate.id,
          examId: selectedGradingExam.id
        });
        attemptId = initRes.data?.attempt?.id;
      } else {
        attemptId = attempt.id;
      }

      // Override/Save Marks
      await resultService.overrideMarks(attemptId, {
        newMarks: parsedQuiz,
        practicalMarks: parsedPractical,
        vivaMarks: parsedViva,
        subjectiveMarks: 0,
        reason: gradingReason.trim()
      });

      // Refresh attempts lists
      const resultsRes = await resultService.getResults({ examId: selectedGradingExam.id });
      setExamAttemptsList(resultsRes.data?.results || []);
      setActiveGradingCandidate(null);
    } catch (err) {
      setGradingError(err.response?.data?.message || 'Failed to save composite candidate grades.');
    } finally {
      setGradingSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch examinations
      try {
        const examsRes = await examService.getExams();
        setExams(examsRes.data?.exams || []);
      } catch (err) {
        console.error("Failed to load examinations:", err);
      }

      // Fetch questions
      try {
        const questionsRes = await questionService.getQuestions();
        setQuestions(questionsRes.data?.questions || []);
      } catch (err) {
        console.error("Failed to load questions:", err);
      }
      
    } catch (err) {
      console.error("General error loading examinations data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchData();
    }
  }, [showModal]);

  const handleToggleActive = async (id) => {
    try {
      await examService.toggleExamStatus(id);
      fetchData();
    } catch (err) {
      alert("Failed to toggle status: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this examination?")) return;
    try {
      await examService.deleteExam(id);
      fetchData();
    } catch (err) {
      alert("Failed to delete exam: " + (err.response?.data?.message || err.message));
    }
  };

  const handleUnitClick = (unit) => {
    setFormData(prev => {
      const units = prev.units.includes(unit)
        ? prev.units.filter(u => u !== unit)
        : [...prev.units, unit];
      return { ...prev, units };
    });
  };

  const handleQuestionSelect = (qId) => {
    setFormData(prev => {
      const questionIds = prev.questionIds.includes(qId)
        ? prev.questionIds.filter(id => id !== qId)
        : [...prev.questionIds, qId];
      return { ...prev, questionIds };
    });
  };

  const handleEditClick = (exam) => {
    const selectedQuestionIds = exam.questions.map(eq => eq.questionId);
    const unitsList = exam.units ? exam.units.split(", ").map(u => u.trim()) : [];
    setFormData({
      title: exam.title || '',
      code: exam.code || '',
      subject: exam.subject || '',
      course: exam.course || 'Basic Combat Engineering',
      durationMinutes: exam.durationMinutes || 30,
      allowedAttempts: exam.allowedAttempts || 1,
      units: unitsList,
      randomizeOrder: exam.randomizeOrder ?? true,
      shuffleOptions: exam.shuffleOptions ?? false,
      showResult: exam.showResult ?? true,
      instructions: exam.instructions || '',
      questionIds: selectedQuestionIds
    });
    setEditingExamId(exam.id);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert("Exam title is required.");
    if (formData.questionIds.length === 0) return alert("Please select at least one question.");

    try {
      setSubmitting(true);
      if (editingExamId) {
        await examService.updateExam(editingExamId, formData);
      } else {
        await examService.createExam(formData);
      }
      setShowModal(false);
      setFormData(defaultForm);
      setEditingExamId(null);
      fetchData();
    } catch (err) {
      alert(`Failed to ${editingExamId ? 'update' : 'create'} exam: ` + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuestions = categoryFilter === 'All'
    ? questions
    : questions.filter(q => q.category === categoryFilter);

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="font-hd text-[34px] tracking-[3px] text-kh leading-none">EXAMINATIONS</div>
          <div className="font-mn text-[10px] text-txd mt-1 tracking-[1px] uppercase">
            CREATE · SCHEDULE · ACTIVATE · MANAGE
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 px-5 rounded font-mn text-[11px] tracking-[1px] uppercase flex items-center"
        >
          <span className="mr-2">+</span> CREATE EXAMINATION
        </button>
      </div>

      {/* Loading state */}
      {loading && <div className="text-center py-12 font-mn text-txm">Loading examinations dashboard...</div>}

      {/* Dashboard list of exams */}
      {!loading && exams.length === 0 && (
        <div className="bg-sf border border-br rounded-md p-8 text-center font-mn text-txm">
          No examinations scheduled. Click "CREATE EXAMINATION" to set up your first exam.
        </div>
      )}

      <div className="space-y-4">
        {!loading && exams.map((exam) => (
          <div key={exam.id} className="bg-sf border border-br rounded-md p-5 relative overflow-hidden group">
            {/* Left status vertical ribbon */}
            <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${exam.isActive ? 'bg-green-600' : 'bg-neutral-600'}`}></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between pl-3">
              <div className="space-y-1">
                <div className="font-hd text-[20px] tracking-[1px] text-kh uppercase">{exam.title}</div>
                <div className="font-mn text-[11px] text-txd tracking-[0.5px]">
                  <span className="text-am font-semibold">{exam.code}</span> · {exam.questions.length}Q · {exam.totalMarks}M · {exam.durationMinutes}min · By {exam.createdBy || 'Maj S. Gupta'}
                </div>
              </div>

              {/* Action Buttons & Switches */}
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <span className={`px-2 py-0.5 rounded font-mn text-[9px] uppercase tracking-[1px] ${
                  exam.isActive 
                    ? 'bg-green-950 text-green-400 border border-green-800' 
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                }`}>
                  {exam.isActive ? 'LIVE' : 'INACTIVE'}
                </span>

                {/* Slider Switch */}
                <div className="flex items-center space-x-2">
                  <span className="font-mn text-[10px] text-txm uppercase">Deactivate</span>
                  <button 
                    onClick={() => handleToggleActive(exam.id)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none ${
                      exam.isActive ? 'bg-green-600' : 'bg-neutral-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                      exam.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </button>
                </div>

                 {/* Give Marks Action */}
                <button 
                  onClick={() => handleOpenGradingConsole(exam)}
                  className="btn bg-green-950/40 border border-green-800/60 hover:bg-green-900/40 text-green-400 transition-all py-1.5 px-3 rounded font-mn text-[10px] uppercase tracking-[1px] font-bold"
                >
                  📊 Give Marks
                </button>

                {/* Review / Edit action */}
                <button 
                  onClick={() => handleEditClick(exam)}
                  className="btn bg-kh/10 border border-kh/30 hover:bg-kh/20 transition-colors py-1.5 px-3 rounded font-mn text-[10px] text-kh uppercase tracking-[1px]"
                >
                  Review / Edit
                </button>

                {/* Delete action */}
                <button 
                  onClick={() => handleDelete(exam.id)}
                  className="btn bg-[#e74c3c]/10 border border-[#e74c3c]/30 hover:bg-[#e74c3c]/20 transition-colors py-1.5 px-3 rounded font-mn text-[10px] text-[#e74c3c] uppercase tracking-[1px]"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Bottom Meta Tags */}
            <div className="mt-4 pt-3 border-t border-br pl-3 flex flex-wrap gap-x-6 gap-y-2 font-mn text-[10px] text-txm">
              <div>Units: <span className="text-kh font-semibold">{exam.units}</span></div>
              <div>Attempts: <span className="text-kh font-semibold">{exam.allowedAttempts}</span></div>
              <div>Randomize: <span className={exam.randomizeOrder ? "text-green-500 font-semibold" : "text-txd font-semibold"}>{exam.randomizeOrder ? 'Yes' : 'No'}</span></div>
              <div>Course: <span className="text-kh font-semibold">{exam.course}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE EXAMINATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-sf border border-br rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl p-8 relative animate-fade-in">
            <button 
              onClick={() => {
                setShowModal(false);
                setFormData(defaultForm);
                setEditingExamId(null);
              }}
              className="absolute top-4 right-4 text-txd hover:text-kh text-xl font-mn transition-colors"
            >
              ✕
            </button>
            <div className="font-hd text-[26px] text-kh tracking-[2px] mb-6">
              {editingExamId ? 'REVIEW & EDIT EXAMINATION' : 'CREATE EXAMINATION'}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Exam Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Combat Engineering Fundamentals" 
                    className="form-input bg-sf" 
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Exam Code</label>
                  <input 
                    type="text" 
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Auto-generated if blank" 
                    className="form-input bg-sf" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Subject</label>
                  <input 
                    type="text" 
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Combat Engineering" 
                    className="form-input bg-sf" 
                  />
                </div>
                <div>
                  <label className="form-label">Course</label>
                  <select 
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="form-input bg-sf text-white"
                  >
                    <option value="Basic Combat Engineering">Basic Combat Engineering</option>
                    <option value="Advanced Bridging">Advanced Bridging</option>
                    <option value="All Courses">All Courses</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Duration (Min)</label>
                  <input 
                    type="number" 
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 })}
                    className="form-input bg-sf" 
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Allowed Attempts</label>
                  <input 
                    type="number" 
                    value={formData.allowedAttempts}
                    onChange={(e) => setFormData({ ...formData, allowedAttempts: parseInt(e.target.value) || 1 })}
                    className="form-input bg-sf" 
                    required
                  />
                </div>
              </div>

              {/* Assign to Units */}
              <div>
                <label className="form-label mb-2">Assign to Units</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_UNITS.map(unit => {
                    const isSelected = formData.units.includes(unit);
                    return (
                      <button 
                        type="button" 
                        key={unit}
                        onClick={() => handleUnitClick(unit)}
                        className={`py-1.5 px-3 rounded font-mn text-[10px] tracking-[0.5px] uppercase border transition-all duration-200 ${
                          isSelected 
                            ? 'bg-am/10 border-am text-kh shadow-sm shadow-am/20' 
                            : 'bg-sf border-br text-txm hover:border-kh'
                        }`}
                      >
                        {unit}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 py-2 border-y border-br">
                <div className="flex items-center space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setFormData({ ...formData, randomizeOrder: !formData.randomizeOrder })}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      formData.randomizeOrder ? 'bg-green-600' : 'bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                      formData.randomizeOrder ? 'translate-x-4' : 'translate-x-0'
                    }`}></div>
                  </button>
                  <span className="font-mn text-[10px] text-txm uppercase">Randomize Q order</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setFormData({ ...formData, shuffleOptions: !formData.shuffleOptions })}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      formData.shuffleOptions ? 'bg-green-600' : 'bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                      formData.shuffleOptions ? 'translate-x-4' : 'translate-x-0'
                    }`}></div>
                  </button>
                  <span className="font-mn text-[10px] text-txm uppercase">Shuffle Options</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setFormData({ ...formData, showResult: !formData.showResult })}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      formData.showResult ? 'bg-green-600' : 'bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                      formData.showResult ? 'translate-x-4' : 'translate-x-0'
                    }`}></div>
                  </button>
                  <span className="font-mn text-[10px] text-txm uppercase">Show result after submit</span>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="form-label">Instructions</label>
                <textarea 
                  rows="3" 
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Exam instructions..." 
                  className="form-input bg-sf resize-none" 
                />
              </div>

              {/* Question Selection */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="form-label mb-0">Select Questions ({formData.questionIds.length} Selected)</label>
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="form-input bg-sf text-white py-1 px-3 max-w-[200px] text-[11px]"
                  >
                    <option value="All">All Categories</option>
                    <option value="Must Know">Must Know</option>
                    <option value="Could Know">Could Know</option>
                    <option value="May Know">May Know</option>
                  </select>
                </div>

                {/* List of questions */}
                <div className="border border-br rounded-md p-3 bg-sf2 max-h-[220px] overflow-y-auto space-y-2">
                  {filteredQuestions.length === 0 && (
                    <div className="text-center py-6 font-mn text-txm text-[12px]">No questions available. Add questions in the Question Bank module.</div>
                  )}
                  {filteredQuestions.map(q => {
                    const isSelected = formData.questionIds.includes(q.id);
                    return (
                      <div 
                        key={q.id}
                        onClick={() => handleQuestionSelect(q.id)}
                        className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-am/5 border-am shadow-sm' 
                            : 'bg-sf border-br hover:border-kh'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-0.5 rounded font-mn text-[8px] uppercase tracking-[1px] ${
                            q.type === 'mcq' ? 'bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/25' :
                            q.type === 'truefalse' ? 'bg-[#2980b9]/15 text-[#3498db] border border-[#2980b9]/25' :
                            'bg-[#d4830a]/15 text-[#fcd34d] border border-[#d4830a]/25'
                          }`}>
                            {q.type === 'truefalse' ? 'T/F' : q.type === 'fillblank' ? 'FILL' : 'MCQ'}
                          </span>
                          <span className="font-mn text-[13px] text-txm line-clamp-1">{q.text}</span>
                        </div>
                        <span className="font-mn text-[11px] text-kh font-semibold ml-4">{q.marks}M</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-br">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    setFormData(defaultForm);
                    setEditingExamId(null);
                  }}
                  className="btn bg-sf border border-br text-txm hover:border-kh transition-colors py-2.5 px-6 rounded font-mn text-[12px] uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 px-6 rounded font-mn text-[12px] uppercase disabled:opacity-50 font-bold"
                >
                  {submitting ? (editingExamId ? 'Saving...' : 'Creating...') : (editingExamId ? 'Save Changes' : 'Create Exam')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SQUAD GRADING ROSTER CONSOLE OVERLAY */}
      {gradingConsoleOpen && selectedGradingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto font-mn">
          <div className="bg-sf border-2 border-am/40 rounded-lg w-full max-w-5xl max-h-[94vh] overflow-y-auto shadow-2xl relative animate-fade-in p-6">
            
            {/* Header */}
            <div className="border-b border-br pb-4 mb-6 flex justify-between items-center">
              <div>
                <span className="px-3 py-1 rounded text-[10px] uppercase tracking-[1.5px] bg-am/15 text-kh border border-am/25 font-bold">
                  🛡️ secure squad grading console
                </span>
                <h3 className="font-hd text-[26px] text-kh uppercase tracking-[1px] mt-2.5 leading-none">
                  Manual Marks Entry - {selectedGradingExam.title}
                </h3>
              </div>
              <button 
                onClick={() => setGradingConsoleOpen(false)}
                className="text-txd hover:text-kh text-3xl font-bold transition-colors p-2"
              >
                ✕
              </button>
            </div>

            {/* Roster Filters (Search + Unit dropdown) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] text-txm uppercase tracking-[1px] mb-1 font-bold">Search Candidate Details</label>
                <input 
                  type="text" 
                  value={gradingSearchQuery}
                  onChange={(e) => setGradingSearchQuery(e.target.value)}
                  placeholder="Filter by name, rank, army number, unit, or trade..."
                  className="form-input bg-sf w-full text-[13.5px] h-[40px] border border-br focus:border-am"
                />
              </div>
              <div>
                <label className="block text-[10px] text-txm uppercase tracking-[1px] mb-1 font-bold">Filter By Squad Unit</label>
                <select 
                  value={gradingUnitFilter}
                  onChange={(e) => setGradingUnitFilter(e.target.value)}
                  className="form-input bg-sf w-full text-[13.5px] h-[40px] border border-br focus:border-am"
                >
                  <option value="">All Units</option>
                  {AVAILABLE_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidates Table */}
            {loadingGradingData ? (
              <div className="text-center py-12 text-txm text-[14px]">Loading squad registry...</div>
            ) : (
              <div className="overflow-x-auto border border-br rounded bg-sf2/30 mb-6">
                <table className="w-full text-left border-collapse font-mn">
                  <thead>
                    <tr className="bg-sf2 border-b border-br text-[11px] text-txd uppercase tracking-[0.5px]">
                      <th className="p-4">Army Number</th>
                      <th className="p-4">Rank & Name</th>
                      <th className="p-4">Unit</th>
                      <th className="p-4">Trade Specialty</th>
                      <th className="p-4 text-center">Evaluation Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = allCandidatesList.filter(candidate => {
                        const searchLower = gradingSearchQuery.toLowerCase();
                        const matchesSearch = 
                          candidate.name.toLowerCase().includes(searchLower) ||
                          candidate.armyNumber.toLowerCase().includes(searchLower) ||
                          candidate.rank.toLowerCase().includes(searchLower) ||
                          candidate.unit.toLowerCase().includes(searchLower) ||
                          candidate.trade.toLowerCase().includes(searchLower);

                        const matchesUnit = !gradingUnitFilter || candidate.unit === gradingUnitFilter;

                        return matchesSearch && matchesUnit;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="p-6 text-center text-txm text-[13px]">
                              No candidates found matching the filters.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(candidate => {
                        // Find if candidate has attempt
                        const attempt = examAttemptsList.find(a => a.candidateId === candidate.id);

                        return (
                          <tr key={candidate.id} className="border-b border-br hover:bg-sf2/15 transition-colors text-[13.5px] text-txm">
                            <td className="p-4 font-bold text-kh uppercase">{candidate.armyNumber}</td>
                            <td className="p-4 uppercase">{candidate.rank} {candidate.name}</td>
                            <td className="p-4 uppercase font-semibold">{candidate.unit}</td>
                            <td className="p-4 uppercase font-semibold">{candidate.trade}</td>
                            <td className="p-4 text-center">
                              {attempt ? (
                                <div className="space-y-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-950 text-green-400 border border-green-800">
                                    GRADED (Total: {attempt.score}/{attempt.totalMarks})
                                  </span>
                                  <div className="text-[10px] text-txd">
                                    Subj: {attempt.quizScore} | Prac: {attempt.practicalMarks} | Viva: {attempt.vivaMarks}
                                  </div>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-900 text-neutral-400 border border-neutral-800">
                                  NOT TAKEN
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {attempt ? (
                                <button 
                                  onClick={() => handleOpenCandidateGradeForm(candidate, attempt)}
                                  className="btn bg-am/15 border border-am/35 hover:bg-am/30 text-am py-1.5 px-4 rounded text-[11px] uppercase tracking-[0.5px] font-bold"
                                >
                                  ✎ Edit Marks
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleOpenCandidateGradeForm(candidate, null)}
                                  className="btn bg-green-950 border border-green-800 hover:bg-green-900 text-green-400 py-1.5 px-4 rounded text-[11px] uppercase tracking-[0.5px] font-bold"
                                >
                                  ✍ Give Marks
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

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-br">
              <button 
                onClick={() => setGradingConsoleOpen(false)}
                className="btn bg-neutral-800 hover:bg-neutral-700 text-kh transition-colors py-2 px-6 rounded text-[12px] uppercase border border-br font-bold"
              >
                Close Console
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INDIVIDUAL INLINE CANDIDATE GRADING MODAL */}
      {activeGradingCandidate && selectedGradingExam && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto font-mn">
          <form 
            onSubmit={handleSaveCandidateGrades}
            className="bg-sf border-2 border-am/50 rounded-lg w-full max-w-lg shadow-2xl p-6 relative animate-fade-in"
          >
            <button 
              type="button"
              onClick={() => setActiveGradingCandidate(null)}
              className="absolute top-4 right-4 text-txd hover:text-kh text-xl transition-colors"
            >
              ✕
            </button>

            {/* Title */}
            <div className="border-b border-br pb-3 mb-4">
              <span className="text-[10px] text-am tracking-[1.5px] uppercase font-bold">Roster Grade Entry Form</span>
              <h4 className="text-[20px] text-kh tracking-[0.5px] uppercase mt-1 font-bold">Grade Candidate</h4>
            </div>

            {/* Candidate Metadata Summary */}
            <div className="bg-sf2 border border-br p-3 rounded text-[12px] space-y-1 mb-4 text-txm">
              <div>
                <span className="text-txd uppercase text-[9.5px] tracking-[0.5px] block font-bold">Candidate Details:</span>
                <span className="text-kh font-bold uppercase">{activeGradingCandidate.armyNumber} · {activeGradingCandidate.rank} {activeGradingCandidate.name}</span>
              </div>
              <div>
                <span className="text-txd uppercase text-[9.5px] tracking-[0.5px] block font-bold">Assessment Title:</span>
                <span className="text-kh font-bold">{selectedGradingExam.title} ({selectedGradingExam.code})</span>
              </div>
            </div>

            {/* Error Message */}
            {gradingError && (
              <div className="bg-rose-950/20 border border-rose-800/60 text-rose-400 p-2.5 rounded text-[12px] mb-4 font-bold">
                ⚠ {gradingError}
              </div>
            )}

            {/* Input fields */}
            <div className="space-y-4 mb-5 text-[12px] text-txm">
              <div>
                <label className="block text-[11px] uppercase tracking-[1px] mb-1.5 font-bold">Subjective / Written Exam Score (Max {selectedGradingExam.totalMarks})</label>
                <input 
                  type="number"
                  min="0"
                  max={selectedGradingExam.totalMarks}
                  value={gradingQuizScore}
                  onChange={(e) => setGradingQuizScore(e.target.value)}
                  className="form-input bg-sf text-[14px] font-semibold h-[40px] w-full text-white border border-br focus:border-am"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-[0.5px] mb-1.5 font-bold">Practical (Max 20)</label>
                  <input 
                    type="number"
                    min="0"
                    max="20"
                    value={gradingPracticalMarks}
                    onChange={(e) => setGradingPracticalMarks(e.target.value)}
                    className="form-input bg-sf text-[14px] font-semibold h-[40px] w-full text-white border border-br focus:border-am"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-[0.5px] mb-1.5 font-bold">Viva (Max 20)</label>
                  <input 
                    type="number"
                    min="0"
                    max="20"
                    value={gradingVivaMarks}
                    onChange={(e) => setGradingVivaMarks(e.target.value)}
                    className="form-input bg-sf text-[14px] font-semibold h-[40px] w-full text-white border border-br focus:border-am"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[1px] mb-1.5 font-bold">Audit Justification / Feedback *</label>
                <textarea 
                  value={gradingReason}
                  onChange={(e) => setGradingReason(e.target.value)}
                  rows="3"
                  className="form-input bg-sf text-[13px] py-1.5 w-full text-white border border-br focus:border-am"
                  placeholder="e.g. Assessment and manual evaluations entry..."
                  required
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-br">
              <button 
                type="button"
                onClick={() => setActiveGradingCandidate(null)}
                className="btn bg-neutral-800 hover:bg-neutral-700 text-kh transition-colors py-2 px-4 rounded text-[11px] uppercase border border-br font-bold"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={gradingSubmitting}
                className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2 px-5 rounded text-[11px] font-bold uppercase flex items-center"
              >
                {gradingSubmitting ? 'Saving...' : '✓ Save Grades'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
