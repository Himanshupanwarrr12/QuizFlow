import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const questionService = {
  getQuestions: async () => {
    const response = await api.get('/questions');
    return response.data;
  },
  createQuestion: async (data) => {
    const response = await api.post('/questions', data);
    return response.data;
  },
  uploadQuestions: async (formData) => {
    const response = await api.post('/questions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  deleteAllQuestions: async () => {
    const response = await api.delete('/questions/clear-all');
    return response.data;
  },
  deleteQuestion: async (id) => {
    const response = await api.delete(`/questions/${id}`);
    return response.data;
  },
  updateQuestion: async (id, data) => {
    const response = await api.put(`/questions/${id}`, data);
    return response.data;
  }
};

export const examService = {
  getExams: async () => {
    const response = await api.get('/exams');
    return response.data;
  },
  createExam: async (data) => {
    const response = await api.post('/exams', data);
    return response.data;
  },
  updateExam: async (id, data) => {
    const response = await api.put(`/exams/${id}`, data);
    return response.data;
  },
  deleteExam: async (id) => {
    const response = await api.delete(`/exams/${id}`);
    return response.data;
  },
  toggleExamStatus: async (id) => {
    const response = await api.patch(`/exams/${id}/toggle`);
    return response.data;
  }
};

export const resultService = {
  getResults: async (params = {}) => {
    const response = await api.get('/results', { params });
    return response.data;
  },
  getResultDetail: async (id) => {
    const response = await api.get(`/results/${id}`);
    return response.data;
  },
  overrideMarks: async (attemptId, data) => {
    const response = await api.patch(`/results/${attemptId}/override-marks`, data);
    return response.data;
  },
  initializeAttempt: async (data) => {
    const response = await api.post('/results/initialize-attempt', data);
    return response.data;
  }
};

export const candidateService = {
  getCandidates: async (params = {}) => {
    const response = await api.get('/candidates', { params });
    return response.data;
  },
  createCandidate: async (data) => {
    const response = await api.post('/candidates', data);
    return response.data;
  },
  toggleCandidateStatus: async (id, isActive) => {
    const endpoint = `/candidates/${id}/${isActive ? 'activate' : 'deactivate'}`;
    const response = await api.patch(endpoint);
    return response.data;
  },
  getAttempts: async () => {
    const response = await api.get('/candidate/attempts');
    return response.data;
  },
  startAttempt: async (examId) => {
    const response = await api.post('/candidate/attempts/start', { examId });
    return response.data;
  },
  submitAttempt: async (attemptId, responses) => {
    const response = await api.post(`/candidate/attempts/${attemptId}/submit`, { responses });
    return response.data;
  }
};

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};

export const superAdminService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/super-admin/users', { params });
    return response.data;
  },
  createUser: async (data) => {
    const response = await api.post('/super-admin/users', data);
    return response.data;
  },
  updateUser: async (id, data) => {
    const response = await api.patch(`/super-admin/users/${id}`, data);
    return response.data;
  },
  toggleUserStatus: async (id) => {
    const response = await api.patch(`/super-admin/users/${id}/toggle`);
    return response.data;
  }
};
