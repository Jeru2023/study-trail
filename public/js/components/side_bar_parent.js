export function renderParentSidebar(root, options = {}) {
  if (!root) return null;

  if (!root.dataset.open) {
    root.dataset.open = 'false';
  }

  const activeKey = options.activeKey || root.dataset.active || 'analytics';

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
      <button class="nav-item" data-view="analytics" data-nav-key="analytics" id="navAnalytics">
        <span>数据分析</span>
      </button>

      <div class="sidebar-section" data-section="approvals">
        <button
          type="button"
          class="sidebar-section__toggle"
          data-section-toggle
          aria-expanded="true"
          aria-controls="sidebarApprovals"
        >
          <span>审批流</span>
          <span class="sidebar-section__indicator" aria-hidden="true"></span>
        </button>
        <div
          class="sidebar-section__content"
          id="sidebarApprovals"
          data-section-content
          aria-hidden="false"
        >
          <button
            class="nav-item"
            data-view="plan-approvals"
            data-nav-key="approvals:plan"
            id="navPlanApprovals"
          >
            <span>计划审批</span>
          </button>
          <button
            class="nav-item"
            data-view="approvals"
            data-nav-key="approvals:tasks"
            id="navApprovals"
          >
            <span>任务审批</span>
          </button>
        </div>
      </div>

      <div class="sidebar-section is-collapsed" data-section="config">
        <button
          type="button"
          class="sidebar-section__toggle"
          data-section-toggle
          aria-expanded="false"
          aria-controls="sidebarConfig"
        >
          <span>配置中心</span>
          <span class="sidebar-section__indicator" aria-hidden="true"></span>
        </button>
        <div
          class="sidebar-section__content"
          id="sidebarConfig"
          data-section-content
          aria-hidden="true"
        >
          <button class="nav-item" data-view="students" data-nav-key="config:students" id="navStudents">
            <span>学生账号</span>
          </button>
          <button class="nav-item" data-view="tasks" data-nav-key="config:tasks" id="navTasks">
            <span>打卡任务</span>
          </button>
          <button
            class="nav-item"
            data-link="/config-schedules.html"
            data-nav-key="config:schedules"
            id="navSchedules"
          >
            <span>日期调度</span>
          </button>
          <button
            class="nav-item"
            data-view="point-presets"
            data-nav-key="config:point-presets"
            id="navPointPresets"
          >
            <span>奖惩模版</span>
          </button>
          <button
            class="nav-item"
            data-view="assignments"
            data-nav-key="config:assignments"
            id="navAssignments"
          >
            <span>任务关联</span>
          </button>
          <button class="nav-item" data-view="rewards" data-nav-key="config:rewards" id="navRewards">
            <span>积分商城</span>
          </button>
        </div>
      </div>

      <div class="sidebar-section" data-section="points">
        <button
          type="button"
          class="sidebar-section__toggle"
          data-section-toggle
          aria-expanded="true"
          aria-controls="sidebarPoints"
        >
          <span>积分操作</span>
          <span class="sidebar-section__indicator" aria-hidden="true"></span>
        </button>
        <div
          class="sidebar-section__content"
          id="sidebarPoints"
          data-section-content
          aria-hidden="false"
        >
          <button
            class="nav-item"
            data-link="/points-bonus.html"
            data-view="points-bonus"
            data-nav-key="points:bonus"
            id="navPointsBonus"
          >
            <span>额外加分</span>
          </button>
          <button
            class="nav-item"
            data-view="points-penalty"
            data-link="/points-penalty.html"
            data-nav-key="points:penalty"
            id="navPointsPenalty"
          >
            <span>额外减分</span>
          </button>
          <button
            class="nav-item"
            data-view="redeem"
            data-link="/points-redeem.html"
            data-nav-key="points:redeem"
            id="navPointsRedeem"
          >
            <span>积分兑换</span>
          </button>
        </div>
      </div>

      <button
        class="nav-item"
        data-view="notifications"
        data-nav-key="notifications"
        id="navNotifications"
      >
        <span>消息中心</span>
      </button>
      <button class="nav-item" disabled>成长档案</button>
    </nav>
    <div class="sidebar__footer">
      <button class="nav-item" id="logoutButton">退出登录</button>
    </div>
  `;

  const activeButton = root.querySelector(`[data-nav-key="${activeKey}"]`);
  if (activeButton) {
    activeButton.classList.add('nav-item--active');
    const section = activeButton.closest('.sidebar-section');
    if (section) {
      section.classList.remove('is-collapsed');
      const toggle = section.querySelector('[data-section-toggle]');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'true');
      }
      const content = section.querySelector('[data-section-content]');
      if (content) {
        content.setAttribute('aria-hidden', 'false');
      }
    }
  }

  return root;
}
