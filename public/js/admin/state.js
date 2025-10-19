const state = {
  user: null,
  activeView: 'analytics',
  approvals: [],
  approvalsDate: null,
  tasks: [],
  students: [],
  assignments: [],
  rewards: [],
  pointsStudents: [],
  pointsHistory: [],
  activePointsStudentId: null,
  redeemStudents: [],
  redeemHistory: [],
  activeRedeemStudentId: null,
  editingTaskId: null,
  editingStudentId: null,
  editingAssignmentStudentId: null,
  editingRewardId: null,
  analyticsDashboard: null,
  analyticsFilters: {
    groups: ['task', 'other'],
    sources: ['task', 'manual', 'reward_redeem']
  },
  analyticsRange: 'today',
  analyticsStudentId: null,
  analyticsStudentHistory: null
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

export function setRewards(rewards) {
  state.rewards = rewards;
}

export function getRewards() {
  return state.rewards;
}

export function setPointsStudents(students) {
  state.pointsStudents = students;
}

export function getPointsStudents() {
  return state.pointsStudents;
}

export function setPointsHistory(entries) {
  state.pointsHistory = entries;
}

export function getPointsHistory() {
  return state.pointsHistory;
}

export function setActivePointsStudentId(studentId) {
  state.activePointsStudentId = studentId;
}

export function getActivePointsStudentId() {
  return state.activePointsStudentId;
}

export function setRedeemStudents(students) {
  state.redeemStudents = students;
}

export function getRedeemStudents() {
  return state.redeemStudents;
}

export function setRedeemHistory(entries) {
  state.redeemHistory = entries;
}

export function getRedeemHistory() {
  return state.redeemHistory;
}

export function setActiveRedeemStudentId(studentId) {
  state.activeRedeemStudentId = studentId;
}

export function getActiveRedeemStudentId() {
  return state.activeRedeemStudentId;
}

export function setApprovals(entries) {
  state.approvals = entries;
}

export function getApprovals() {
  return state.approvals;
}

export function setApprovalsDate(date) {
  state.approvalsDate = date;
}

export function getApprovalsDate() {
  return state.approvalsDate;
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

export function setEditingRewardId(rewardId) {
  state.editingRewardId = rewardId;
}

export function getEditingRewardId() {
  return state.editingRewardId;
}

export function setAnalyticsDashboard(dashboard) {
  state.analyticsDashboard = dashboard;
}

export function getAnalyticsDashboard() {
  return state.analyticsDashboard;
}

export function setAnalyticsFilters(filters) {
  state.analyticsFilters = filters;
}

export function getAnalyticsFilters() {
  return state.analyticsFilters;
}

export function setAnalyticsRange(range) {
  state.analyticsRange = range;
}

export function getAnalyticsRange() {
  return state.analyticsRange;
}

export function setAnalyticsStudentId(studentId) {
  state.analyticsStudentId = studentId;
}

export function getAnalyticsStudentId() {
  return state.analyticsStudentId;
}

export function setAnalyticsStudentHistory(history) {
  state.analyticsStudentHistory = history;
}

export function getAnalyticsStudentHistory() {
  return state.analyticsStudentHistory;
}


