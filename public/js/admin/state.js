const state = {
  user: null,
  activeView: 'tasks',
  tasks: [],
  students: [],
  assignments: [],
  editingTaskId: null,
  editingStudentId: null,
  editingAssignmentStudentId: null
};

export function setUser(user) {
  state.user = user;
}

export function getUser() {
  return state.user;
}

export function setActiveView(view) {
  state.activeView = view;
}

export function getActiveView() {
  return state.activeView;
}

export function setTasks(tasks) {
  state.tasks = tasks;
}

export function getTasks() {
  return state.tasks;
}

export function setStudents(students) {
  state.students = students;
}

export function getStudents() {
  return state.students;
}

export function setAssignments(assignments) {
  state.assignments = assignments;
}

export function getAssignments() {
  return state.assignments;
}

export function setEditingTaskId(taskId) {
  state.editingTaskId = taskId;
}

export function getEditingTaskId() {
  return state.editingTaskId;
}

export function setEditingStudentId(id) {
  state.editingStudentId = id;
}

export function getEditingStudentId() {
  return state.editingStudentId;
}

export function setEditingAssignmentStudentId(studentId) {
  state.editingAssignmentStudentId = studentId;
}

export function getEditingAssignmentStudentId() {
  return state.editingAssignmentStudentId;
}
