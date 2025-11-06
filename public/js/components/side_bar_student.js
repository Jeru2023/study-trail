export function renderStudentSidebar(root) {
  if (!root) return null;

  root.innerHTML = `
    <div class="sidebar__brand">
      <span class="sidebar__logo">学迹</span>
      <span class="sidebar__subtitle">Study Trail</span>
    </div>
    <div class="sidebar__profile">
      <span class="avatar" id="studentSidebarAvatar">S</span>
      <div>
        <strong id="studentGreeting"></strong>
        <span class="role-pill">Student</span>
      </div>
    </div>
    <nav class="sidebar__nav">
      <button class="nav-item nav-item--active" data-view="plan" id="studentNavPlan">
        <span>每日计划</span>
      </button>
      <button class="nav-item" data-view="tasks" id="studentNavTasks">
        <span>每日打卡</span>
      </button>
      <button class="nav-item" data-view="store" id="studentNavStore">
        <span>积分商城</span>
      </button>
      <button class="nav-item" data-view="messages" id="studentNavMessages">
        <span>消息中心</span>
      </button>
    </nav>
    <div class="sidebar__footer">
      <button class="nav-item" id="logoutStudentBtn">退出登录</button>
    </div>
  `;

  return root;
}
