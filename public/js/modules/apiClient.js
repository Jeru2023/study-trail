const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

export async function request(path, { method = "GET", data } = {}) {
  let response;

  try {
    response = await fetch(path, {
      method,
      headers: JSON_HEADERS,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include"
    });
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
