async function request(path, { method = 'GET', data } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include'
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType && contentType.includes('application/json') ? await response.json() : null;

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
