import { useState, useEffect, useRef } from 'react';
import { questionService } from '../services/api';

const defaultQuestion = {
  type: 'mcq',
  category: 'Must Know',
  subject: 'Combat Engineering',
  topic: '',
  difficulty: 'Medium',
  bloom: 'Knowledge',
  marks: 1,
  text: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOptions: '',
  explanation: ''
};

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formQuestion, setFormQuestion] = useState(defaultQuestion);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await questionService.getQuestions();
      setQuestions(res.data.questions || []);
      setError('');
    } catch (err) {
      setError('Failed to load questions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      await questionService.uploadQuestions(formData);
      e.target.value = null; // reset input
      fetchQuestions(); // refresh list
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload questions');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL questions? This cannot be undone.")) return;
    try {
      await questionService.deleteAllQuestions();
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear questions');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await questionService.deleteQuestion(id);
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleEdit = async (q) => {
    const newText = window.prompt("Edit question text:", q.text);
    if (newText === null || newText.trim() === "") return;

    try {
      await questionService.updateQuestion(q.id, { ...q, text: newText.trim() });
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update question');
    }
  };

  const handleTemplateDownload = () => {
    const csvHeaders = ["type", "text", "option_A", "option_B", "option_C", "option_D", "correct_options(A,B,C...)", "category", "subject", "topic", "difficulty", "bloom", "marks", "explanation"];
    const csvRows = [
      ["mcq", "What is the primary role of a Combat Engineer?", "Bridging", "Breaching", "Mine Warfare", "All of the above", "D", "Must Know", "Combat Engineering", "Fundamentals", "Medium", "Knowledge", "2", "Combat engineers do bridging, breaching and mines."],
      ["truefalse", "Earth is round.", "True", "False", "", "", "A", "Could Know", "Science", "Earth", "Easy", "Knowledge", "1", "Yes, Earth is an oblate spheroid."],
      ["fillblank", "The speed of light is _____ km/s.", "", "", "", "", "299792", "Must Know", "Physics", "Light", "Hard", "Knowledge", "2", "Speed of light is 299792 km/s."]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(","), ...csvRows.map(r => r.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "quizflow_question_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleCorrectOption = (opt) => {
    let current = formQuestion.correctOptions ? formQuestion.correctOptions.split(',') : [];
    if (current.includes(opt)) {
      current = current.filter(x => x !== opt);
    } else {
      current.push(opt);
    }
    setFormQuestion({ ...formQuestion, correctOptions: current.join(',') });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formQuestion.text.trim()) {
      alert("Question text is required");
      return;
    }
    if (formQuestion.type === 'mcq' && (!formQuestion.optionA || !formQuestion.optionB)) {
      alert("Option A and Option B are required for MCQ questions");
      return;
    }
    if (!formQuestion.correctOptions) {
      alert("Please mark at least one correct option or input the correct answer");
      return;
    }

    try {
      setSubmitting(true);
      await questionService.createQuestion(formQuestion);
      setShowModal(false);
      setFormQuestion(defaultQuestion);
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="font-hd text-[34px] tracking-[3px] text-kh leading-none">QUESTION BANK</div>
          <div className="font-mn text-[10px] text-txd mt-1 uppercase tracking-[1px]">
            {questions.length} QUESTIONS · MCQ · TRUE/FALSE · FILL IN BLANKS
          </div>
        </div>
        <div className="flex space-x-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
          />
          <button 
            onClick={handleTemplateDownload}
            className="btn bg-sf border border-br text-txm hover:border-am transition-colors py-2.5 px-4 rounded font-mn text-[11px] tracking-[1px] uppercase flex items-center"
          >
            <span className="mr-2">⬇</span> Template
          </button>
          <button 
            onClick={handleClearAll} 
            disabled={questions.length === 0}
            className="btn bg-[#e74c3c]/10 border border-[#e74c3c]/30 hover:bg-[#e74c3c]/20 text-[#e74c3c] transition-colors py-2.5 px-4 rounded font-mn text-[11px] tracking-[1px] uppercase flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="mr-2">✕</span> CLEAR ALL
          </button>
          <button 
            onClick={handleImportClick} 
            disabled={uploading}
            className="btn bg-[#2980b9] hover:bg-[#3498db] text-white transition-colors py-2.5 px-4 rounded font-mn text-[11px] tracking-[1px] uppercase flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="mr-2">⬆</span> {uploading ? 'UPLOADING...' : 'IMPORT CSV'}
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 px-4 rounded font-mn text-[11px] tracking-[1px] uppercase flex items-center"
          >
            <span className="mr-2">+</span> ADD NEW
          </button>
        </div>
      </div>

      <div className="flex space-x-3 mb-6">
        <input type="text" placeholder="Search questions..." className="form-input bg-sf max-w-xs" />
        <select className="form-input bg-sf max-w-[200px]">
          <option>All Categories</option>
        </select>
        <select className="form-input bg-sf max-w-[200px]">
          <option>All Types</option>
        </select>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="bg-sf border border-br rounded-md overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-sf2 border-b border-br font-mn text-[10px] text-txd uppercase tracking-[1px]">
              <th className="py-4 px-5 w-[50px]">#</th>
              <th className="py-4 px-5">Question</th>
              <th className="py-4 px-5 w-[100px]">Type</th>
              <th className="py-4 px-5 w-[150px]">Category</th>
              <th className="py-4 px-5 w-[120px]">Difficulty</th>
              <th className="py-4 px-5 w-[80px]">Marks</th>
              <th className="py-4 px-5 w-[150px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-txm font-mn text-[13px]">Loading questions...</td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-txm font-mn text-[13px]">No questions found. Click "IMPORT CSV" to upload.</td>
              </tr>
            ) : (
              questions.map((q, index) => (
                <tr key={q.id} className="border-b border-br last:border-0 hover:bg-sf2/30 transition-colors">
                  <td className="py-4 px-5 font-mn text-[11px] text-txm">
                    {(index + 1).toString().padStart(2, '0')}
                  </td>
                  <td className="py-4 px-5">
                    <div className="text-kh text-[14px] mb-1">{q.text}</div>
                    <div className="font-mn text-[10px] text-txd tracking-[1px]">{q.subject} · {q.topic}</div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="inline-block px-2 py-1 rounded bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/30 font-mn text-[9px] uppercase tracking-[1px]">
                      {q.type === 'truefalse' ? 'T/F' : q.type === 'fillblank' ? 'FILL' : 'MCQ'}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="inline-block px-2 py-1 rounded bg-[#e74c3c]/15 text-[#fca5a5] border border-[#e74c3c]/30 font-mn text-[9px] uppercase tracking-[1px]">
                      {q.category}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="inline-block px-2 py-1 rounded bg-[#d4830a]/15 text-[#fcd34d] border border-[#d4830a]/30 font-mn text-[9px] uppercase tracking-[1px]">
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-mn text-[12px] text-kh">
                    {q.marks}
                  </td>
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <button onClick={() => handleEdit(q)} className="btn bg-bg border border-br hover:border-kh transition-colors py-1.5 px-3 rounded font-mn text-[10px] text-txm mr-2 uppercase tracking-[1px]">Edit</button>
                    <button onClick={() => handleDelete(q.id)} className="btn bg-[#e74c3c]/10 border border-[#e74c3c]/30 hover:bg-[#e74c3c]/20 transition-colors py-1.5 px-3 rounded font-mn text-[10px] text-[#e74c3c] uppercase tracking-[1px]">Del</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Add Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-sf border border-br rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl p-8 relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-txd hover:text-kh text-xl font-mn transition-colors"
            >
              ✕
            </button>
            <div className="font-hd text-[26px] text-kh tracking-[2px] mb-6">ADD QUESTION</div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Question Type</label>
                  <select 
                    value={formQuestion.type}
                    onChange={(e) => setFormQuestion({ ...formQuestion, type: e.target.value, correctOptions: '' })}
                    className="form-input bg-sf text-white"
                  >
                    <option value="mcq">MCQ (Single/Multi)</option>
                    <option value="truefalse">True / False</option>
                    <option value="fillblank">Fill in Blanks</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select 
                    value={formQuestion.category}
                    onChange={(e) => setFormQuestion({ ...formQuestion, category: e.target.value })}
                    className="form-input bg-sf text-white"
                  >
                    <option value="Must Know">Must Know</option>
                    <option value="Could Know">Could Know</option>
                    <option value="May Know">May Know</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Subject</label>
                  <input 
                    type="text" 
                    value={formQuestion.subject}
                    onChange={(e) => setFormQuestion({ ...formQuestion, subject: e.target.value })}
                    placeholder="e.g. Combat Engineering" 
                    className="form-input bg-sf" 
                  />
                </div>
                <div>
                  <label className="form-label">Topic</label>
                  <input 
                    type="text" 
                    value={formQuestion.topic}
                    onChange={(e) => setFormQuestion({ ...formQuestion, topic: e.target.value })}
                    placeholder="e.g. Fundamentals" 
                    className="form-input bg-sf" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Difficulty</label>
                  <select 
                    value={formQuestion.difficulty}
                    onChange={(e) => setFormQuestion({ ...formQuestion, difficulty: e.target.value })}
                    className="form-input bg-sf text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Bloom Level</label>
                  <select 
                    value={formQuestion.bloom}
                    onChange={(e) => setFormQuestion({ ...formQuestion, bloom: e.target.value })}
                    className="form-input bg-sf text-white"
                  >
                    <option value="Knowledge">Knowledge</option>
                    <option value="Comprehension">Comprehension</option>
                    <option value="Application">Application</option>
                    <option value="Analysis">Analysis</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Marks</label>
                  <input 
                    type="number" 
                    value={formQuestion.marks}
                    onChange={(e) => setFormQuestion({ ...formQuestion, marks: parseInt(e.target.value) || 1 })}
                    className="form-input bg-sf" 
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Question Text</label>
                <textarea 
                  rows="3" 
                  value={formQuestion.text}
                  onChange={(e) => setFormQuestion({ ...formQuestion, text: e.target.value })}
                  placeholder="Type question content here..." 
                  className="form-input bg-sf resize-none" 
                  required
                />
              </div>

              {/* Conditional Options Render based on Type */}
              {formQuestion.type === 'mcq' && (
                <div className="space-y-4">
                  <label className="form-label text-kh uppercase tracking-[1px] text-[11px]">Options (Click A/B/C/D to mark correct, multiple allowed)</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const isCorrect = formQuestion.correctOptions.split(',').includes(opt);
                      return (
                        <div key={opt} className="flex items-center space-x-2">
                          <button 
                            type="button"
                            onClick={() => toggleCorrectOption(opt)}
                            className={`w-10 h-10 flex items-center justify-center font-hd border rounded text-[14px] transition-all duration-200 ${
                              isCorrect 
                                ? 'bg-am text-oldd border-am shadow-lg shadow-am/20' 
                                : 'bg-sf border-br text-txm hover:border-kh'
                            }`}
                          >
                            {opt}
                          </button>
                          <input 
                            type="text" 
                            value={formQuestion[`option${opt}`]}
                            onChange={(e) => setFormQuestion({ ...formQuestion, [`option${opt}`]: e.target.value })}
                            placeholder={`Option ${opt}`} 
                            className="form-input bg-sf flex-1" 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formQuestion.type === 'truefalse' && (
                <div className="space-y-4">
                  <label className="form-label text-kh uppercase tracking-[1px] text-[11px]">Select Correct Option</label>
                  <div className="flex space-x-4">
                    {['A', 'B'].map((opt) => (
                      <button 
                        key={opt}
                        type="button"
                        onClick={() => setFormQuestion({ ...formQuestion, optionA: 'True', optionB: 'False', correctOptions: opt })}
                        className={`py-3 px-6 flex items-center justify-center font-mn border rounded text-[13px] tracking-[1px] uppercase transition-all duration-200 ${
                          formQuestion.correctOptions === opt 
                            ? 'bg-am text-oldd border-am shadow-lg shadow-am/20' 
                            : 'bg-sf border-br text-txm hover:border-kh'
                        }`}
                      >
                        {opt === 'A' ? 'True (A)' : 'False (B)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formQuestion.type === 'fillblank' && (
                <div>
                  <label className="form-label">Correct Answer</label>
                  <input 
                    type="text" 
                    value={formQuestion.correctOptions}
                    onChange={(e) => setFormQuestion({ ...formQuestion, correctOptions: e.target.value })}
                    placeholder="Enter correct answer word or value..." 
                    className="form-input bg-sf" 
                    required
                  />
                </div>
              )}

              <div>
                <label className="form-label">Explanation (Optional)</label>
                <textarea 
                  rows="2" 
                  value={formQuestion.explanation || ''}
                  onChange={(e) => setFormQuestion({ ...formQuestion, explanation: e.target.value })}
                  placeholder="Add explanation or correct rationale..." 
                  className="form-input bg-sf resize-none" 
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-br">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn bg-sf border border-br text-txm hover:border-kh transition-colors py-2.5 px-6 rounded font-mn text-[12px] uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 px-6 rounded font-mn text-[12px] uppercase disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
