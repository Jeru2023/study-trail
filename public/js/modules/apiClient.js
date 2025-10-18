const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

export async function request(path, { method = 'GET', data } = {}) {
  let response;

  try {
    response = await fetch(path, {
      method,
      headers: JSON_HEADERS,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include'
    });
  } catch (error) {
    throw new Error('无法连接服务器，请稍后重试。');
  }

  let payload = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    payload = await response.json();
  }

  if (!response.ok) {
    const detail = payload?.message || `请求失败（${response.status}）`;
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
