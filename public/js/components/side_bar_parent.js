export function renderParentSidebar(root) {
  if (!root) return null;

  if (!root.dataset.open) {
    root.dataset.open = 'false';
  }

  root.innerHTML = `
    <div class="sidebar__brand">
      <span class="sidebar__logo">学迹</span>
      <span class="sidebar__subtitle">Study Trail</span>
    </div>
    <div class="sidebar__profile">
      <span class="avatar" id="sidebarAvatar">P</span>
      <div>
        <strong id="sidebarUserName">家长</strong>
        <span class="role-pill">Parent</span>
      </div>
    </div>
    <nav class="sidebar__nav">
      <button class="nav-item nav-item--active" data-view="analytics" id="navAnalytics">
        <span>数据分析</span>
      </button>
      <button class="nav-item" data-view="tasks" id="navTasks">
        <span>打卡任务</span>
      </button>
      <button class="nav-item" data-view="students" id="navStudents">
        <span>学生账号</span>
      </button>
      <button class="nav-item" data-view="assignments" id="navAssignments">
        <span>任务关联</span>
      </button>
      <button class="nav-item" data-view="approvals" id="navApprovals">
        <span>打卡审批</span>
      </button>
      <button class="nav-item" data-view="rewards" id="navRewards">
        <span>积分商城</span>
      </button>
      <button class="nav-item" data-view="redeem" id="navRedeem">
        <span>积分兑换</span>
      </button>
      <button class="nav-item" data-view="points" id="navPoints">
        <span>积分管理</span>
      </button>
      <button class="nav-item" data-view="notifications" id="navNotifications">
        <span>消息中心</span>
      </button>
      <button class="nav-item" disabled>成长档案</button>
    </nav>
    <div class="sidebar__footer">
      <button class="nav-item" id="logoutButton">退出登录</button>
    </div>
  `;

  return root;
}
