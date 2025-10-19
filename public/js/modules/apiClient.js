const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

export async function request(path, { method = 'GET', data, headers = {} } = {}) {
  let response;
  const options = {
    method,
    credentials: 'include'
  };
  let requestHeaders = { ...headers };

  if (data instanceof FormData) {
    options.body = data;
  } else if (data !== undefined) {
    options.body = JSON.stringify(data);
    requestHeaders = { ...JSON_HEADERS, ...requestHeaders };
  } else if (Object.keys(requestHeaders).length === 0) {
    requestHeaders = null;
  }

  if (requestHeaders) {
    options.headers = requestHeaders;
  }

  try {
    response = await fetch(path, options);
  } catch (error) {
    throw new Error('\u65e0\u6cd5\u8fde\u63a5\u670d\u52a1\u5668\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002');
  }

  let payload = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    const detail = payload?.message || `\u8bf7\u6c42\u5931\u8d25\uff08${response.status}\uff09`;
    throw new Error(detail);
  }

  return payload;
}

export function login(payload) {
  return request('/api/auth/login', { method: 'POST', data: payload });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function registerParent(payload) {
  return request('/api/auth/register/parent', { method: 'POST', data: payload });
}

export function createStudent(payload) {
  return request('/api/auth/students', { method: 'POST', data: payload });
}

export function updateStudent(studentId, payload) {
  return request(`/api/auth/students/${studentId}`, { method: 'PUT', data: payload });
}

export function removeStudent(studentId) {
  return request(`/api/auth/students/${studentId}`, { method: 'DELETE' });
}

export function fetchStudents() {
  return request('/api/auth/students');
}

export function getCurrentUser() {
  return request('/api/auth/me');
}

export function fetchTasks() {
  return request('/api/tasks');
}

export function createTask(payload) {
  return request('/api/tasks', { method: 'POST', data: payload });
}

export function updateTask(taskId, payload) {
  return request(`/api/tasks/${taskId}`, { method: 'PUT', data: payload });
}

export function removeTask(taskId) {
  return request(`/api/tasks/${taskId}`, { method: 'DELETE' });
}

export function fetchAssignments() {
  return request('/api/student-tasks');
}

export function saveAssignments(payload) {
  return request('/api/student-tasks', { method: 'POST', data: payload });
}

export function removeAssignments(studentId) {
  return request(`/api/student-tasks/${studentId}`, { method: 'DELETE' });
}

export function fetchStudentDailyTasks(date) {
  const search = date ? `?date=${encodeURIComponent(date)}` : '';
  return request(`/api/student/daily-tasks${search}`);
}

export function createStudentSubtask(taskId, payload) {
  return request(`/api/student/daily-tasks/${taskId}/subtasks`, { method: 'POST', data: payload });
}

export function startStudentSubtask(entryId) {
  return request(`/api/student/subtasks/${entryId}/start`, { method: 'PATCH' });
}

export function completeStudentSubtask(entryId, formData) {
  return request(`/api/student/subtasks/${entryId}/complete`, {
    method: 'POST',
    data: formData
  });
}

export function fetchApprovalEntries(date) {
  const search = date ? `?date=${encodeURIComponent(date)}` : '';
  return request(`/api/approvals${search}`);
}

export function approveStudentEntry(entryId, payload) {
  return request(`/api/approvals/entries/${entryId}/approve`, { method: 'POST', data: payload });
}

export function rejectStudentEntry(entryId, payload) {
  return request(`/api/approvals/entries/${entryId}/reject`, { method: 'POST', data: payload });
}

export function deleteApprovalEntry(entryId) {
  return request(`/api/approvals/entries/${entryId}`, { method: 'DELETE' });
}

export function awardTaskPoints(taskId, payload) {
  return request(`/api/approvals/tasks/${taskId}/award`, { method: 'POST', data: payload });
}

export function fetchRewards() {
  return request('/api/rewards');
}

export function createReward(payload) {
  return request('/api/rewards', { method: 'POST', data: payload });
}

export function updateReward(rewardId, payload) {
  return request(`/api/rewards/${rewardId}`, { method: 'PUT', data: payload });
}

export function deleteReward(rewardId) {
  return request(`/api/rewards/${rewardId}`, { method: 'DELETE' });
}

export function fetchPointStudents() {
  return request('/api/points/students');
}

export function fetchStudentPointHistory(studentId) {
  return request(`/api/points/students/${studentId}/history`);
}

export function adjustStudentPoints(studentId, payload) {
  return request(`/api/points/students/${studentId}/adjust`, {
    method: 'POST',
    data: payload
  });
}

export function redeemStudentReward(studentId, payload) {
  return request(`/api/points/students/${studentId}/redeem`, {
    method: 'POST',
    data: payload
  });
}

export function fetchAnalyticsDashboard() {
  return request('/api/analytics/dashboard');
}

export function fetchAnalyticsStudentHistory(studentId, { sources, since } = {}) {
  const params = new URLSearchParams();
  if (Array.isArray(sources) && sources.length > 0) {
    params.set('sources', sources.join(','));
  }
  if (since) {
    params.set('since', since);
  }
  const search = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/analytics/students/${studentId}/history${search}`);
}
