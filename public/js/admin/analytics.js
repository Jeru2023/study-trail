import { formatPointsValue } from './points.js';

export const SOURCE_GROUPS = [
  {
    key: 'task',
    label: '打卡积分',
    sources: ['task']
  },
  {
    key: 'other',
    label: '其他积分',
    sources: ['manual', 'reward_redeem']
  }
];

const SOURCE_LABELS = {
  task: '打卡积分',
  manual: '手动调整',
  reward_redeem: '兑换扣减'
};

function ensureSources(sources) {
  const set = new Set(Array.isArray(sources) && sources.length > 0 ? sources : null);
  if (set.size === 0) {
    SOURCE_GROUPS.forEach((group) => group.sources.forEach((source) => set.add(source)));
  }
  return Array.from(set);
}

function formatNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return numeric.toLocaleString('zh-CN');
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatAxisDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

export function deriveSourcesFromGroups(groups) {
  const selectedKeys =
    Array.isArray(groups) && groups.length > 0 ? groups : SOURCE_GROUPS.map((group) => group.key);
  const selected = new Set();
  SOURCE_GROUPS.forEach((group) => {
    if (selectedKeys.includes(group.key)) {
      group.sources.forEach((source) => selected.add(source));
    }
  });
  return Array.from(selected);
}

export function formatSourceLabel(source) {
  return SOURCE_LABELS[source] ?? '其他积分';
}

export function renderAnalyticsSummary(container, summaryCards, metadata = {}) {
  if (!container) return;
  if (!summaryCards) {
    container.innerHTML =
      '<p class="analytics-leaderboard__empty">暂未生成积分统计数据，请稍后再试。</p>';
    return;
  }

  const rangeDays = metadata.rangeDays ?? 30;
  const totalStudents = metadata.totalStudents ?? 0;

  const metricCards = [
    {
      key: 'issued',
      title: '累计发放',
      value: `${formatNumber(summaryCards.totalIssued?.value ?? 0)}<span class="analytics-summary__suffix">分</span>`,
      note: `覆盖最近 ${rangeDays} 天`
    },
    {
      key: 'manual',
      title: '手动调整净额',
      value: formatPointsValue(summaryCards.manualAdjustments?.value ?? 0),
      note: (summaryCards.manualAdjustments?.value ?? 0) >= 0 ? '偏向奖励' : '偏向扣减'
    },
    {
      key: 'redeemed',
      title: '兑换消耗',
      value: formatPointsValue(-(summaryCards.redeemed?.value ?? 0)),
      note: `合计兑换 ${formatNumber(summaryCards.redeemed?.value ?? 0)} 分`
    },
    {
      key: 'active',
      title: '活跃学生',
      value: formatNumber(summaryCards.activeStudents?.value ?? 0),
      note: `共 ${formatNumber(totalStudents)} 名学生`
    },
    {
      key: 'average',
      title: '日均发放',
      value: `${formatNumber(summaryCards.averageDailyPoints?.value ?? 0)}<span class="analytics-summary__suffix">分</span>`,
      note: '平均每日奖励'
    }
  ];

  const topStudent = summaryCards.topStudent ?? null;
  const topTask = summaryCards.topTask ?? null;

  const highlightCards = [
    {
      key: 'champion',
      title: '月度冠军',
      primary: topStudent?.displayName ?? topStudent?.loginName ?? '本月尚无积分领先者',
      note: topStudent ? `净积分 ${formatPointsValue(topStudent.netPoints ?? 0)}` : '鼓励孩子持续打卡与获取积分'
    },
    {
      key: 'popular-task',
      title: '热门任务',
      primary: topTask?.title ?? '近期暂无热门任务',
      note: topTask ? `累计贡献 ${formatNumber(topTask.points ?? 0)} 分` : '为孩子设计更有趣的挑战吧'
    }
  ];

  const metricsHtml = metricCards
    .map(
      (card) => `
      <article class="analytics-summary__card" data-type="metric" data-key="${card.key}">
        <span class="analytics-summary__title">${card.title}</span>
        <span class="analytics-summary__value">${card.value}</span>
        ${card.note ? `<span class="analytics-summary__note">${card.note}</span>` : ''}
      </article>
    `
    )
    .join('');

  const highlightHtml = highlightCards
    .map(
      (card) => `
      <article class="analytics-summary__card" data-type="highlight" data-key="${card.key}">
        <span class="analytics-summary__title">${card.title}</span>
        <span class="analytics-summary__highlight">
          <strong>${card.primary}</strong>
          <span>${card.note}</span>
        </span>
      </article>
    `
    )
    .join('');

  container.innerHTML = metricsHtml + highlightHtml;
}

export function renderAnalyticsLeaderboard(container, leaderboard, { sources } = {}) {
  if (!container) return { total: 0, formattedTotal: '0', count: 0 };

  const activeSources = ensureSources(sources);
  const rows = (leaderboard ?? []).map((entry) => {
    const breakdown = {};
    let total = 0;
    let earned = 0;
    let spent = 0;

    activeSources.forEach((source) => {
      const value = entry.totals?.[source] ?? 0;
      breakdown[source] = value;
      total += value;
      if (value > 0) {
        earned += value;
      } else if (value < 0) {
        spent += Math.abs(value);
      }
    });

    return {
      entry,
      total,
      earned,
      spent,
      breakdown
    };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.earned !== a.earned) return b.earned - a.earned;
    const nameA = a.entry.displayName ?? a.entry.loginName ?? '';
    const nameB = b.entry.displayName ?? b.entry.loginName ?? '';
    return nameA.localeCompare(nameB, 'zh');
  });

  if (!rows.length) {
    container.innerHTML =
      '<p class="analytics-leaderboard__empty">暂未生成排行榜，等待新的积分记录。</p>';
    return { total: 0, formattedTotal: '0', count: 0 };
  }

  const maxAbs = rows.reduce((acc, item) => Math.max(acc, Math.abs(item.total)), 0) || 1;

  container.innerHTML = rows
    .map((item, index) => {
      const displayName = item.entry.displayName ?? item.entry.loginName ?? '未命名学生';
      const percentage = Math.round((Math.abs(item.total) / maxAbs) * 100);
      const barClass =
        item.total >= 0
          ? 'analytics-leaderboard__bar-fill--positive'
          : 'analytics-leaderboard__bar-fill--negative';
      const breakdownHtml = activeSources
        .map((source) => {
          const value = item.breakdown[source] ?? 0;
          if (!value) return '';
          const badgeClass =
            source === 'reward_redeem'
              ? 'analytics-leaderboard__badge analytics-leaderboard__badge--reward'
              : source === 'manual'
              ? 'analytics-leaderboard__badge analytics-leaderboard__badge--manual'
              : 'analytics-leaderboard__badge analytics-leaderboard__badge--task';
          return `<span class="${badgeClass}">${formatSourceLabel(source)} ${formatPointsValue(value)}</span>`;
        })
        .filter(Boolean)
        .join('');
      const metaPieces = [
        `净积分 ${formatPointsValue(item.total)}`,
        `获得 ${formatNumber(item.earned)} 分`,
        `消耗 ${formatNumber(item.spent)} 分`,
        item.entry.lastActivityAt ? `最近：${formatDateTime(item.entry.lastActivityAt)}` : '暂无最新记录'
      ];

      return `
        <article class="analytics-leaderboard__item">
          <div class="analytics-leaderboard__rank ${index < 3 ? 'analytics-leaderboard__rank--top' : ''}">${index + 1}</div>
          <div class="analytics-leaderboard__info">
            <span class="analytics-leaderboard__name">${displayName}</span>
            <div class="analytics-leaderboard__meta">
              ${metaPieces.map((text) => `<span>${text}</span>`).join('')}
            </div>
            <div class="analytics-leaderboard__breakdown">
              ${breakdownHtml || '<span class="analytics-leaderboard__badge">暂未选择积分来源</span>'}
            </div>
          </div>
          <div class="analytics-leaderboard__bar" aria-hidden="true">
            <div class="analytics-leaderboard__bar-fill ${barClass}" style="width: ${percentage}%;"></div>
          </div>
        </article>
      `;
    })
    .join('');

  const totalNet = rows.reduce((acc, item) => acc + item.total, 0);
  return {
    total: totalNet,
    formattedTotal: formatPointsValue(totalNet),
    count: rows.length
  };
}

export function renderAnalyticsTrend(container, daily, { sources } = {}) {
  if (!container) {
    return {
      lastNet: 0,
      peakPositive: 0,
      peakNegative: 0,
      formattedLast: '0',
      formattedPeakPositive: '0',
      formattedPeakNegative: '0'
    };
  }

  const activeSources = ensureSources(sources);
  const filtered = (daily ?? []).map((day) => {
    let net = 0;
    let earned = 0;
    let spent = 0;
    activeSources.forEach((source) => {
      const value = day.totals?.[source] ?? 0;
      net += value;
      if (value > 0) {
        earned += value;
      } else if (value < 0) {
        spent += Math.abs(value);
      }
    });
    return {
      date: day.date,
      net,
      earned,
      spent
    };
  });

  if (!filtered.length) {
    container.innerHTML =
      '<p class="analytics-leaderboard__empty">暂无积分趋势，等待新的积分数据。</p>';
    return {
      lastNet: 0,
      peakPositive: 0,
      peakNegative: 0,
      formattedLast: '0',
      formattedPeakPositive: '0',
      formattedPeakNegative: '0'
    };
  }

  const sample = filtered.slice(-21);
  const maxAbs =
    sample.reduce(
      (acc, item) => Math.max(acc, Math.abs(item.net), item.earned ?? 0, item.spent ?? 0),
      0
    ) || 1;

  const width = Math.max(320, sample.length * 18);
  const height = 200;
  const padding = 16;
  const baseline = height / 2;
  const amplitude = baseline - padding;

  const pointCoordinates = sample.map((item, index) => {
    const x =
      padding +
      (sample.length === 1
        ? 0
        : (index / (sample.length - 1)) * (width - padding * 2));
    const offset = (item.net / maxAbs) * amplitude;
    const y = baseline - offset;
    return { x, y };
  });

  const linePoints = pointCoordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = [
    `${pointCoordinates[0]?.x ?? padding},${baseline}`,
    linePoints,
    `${pointCoordinates[pointCoordinates.length - 1]?.x ?? width - padding},${baseline}`
  ].join(' ');

  const svgMarkup = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="analytics-trend__svg">
      <defs>
        <linearGradient id="analyticsTrendFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(32, 211, 176, 0.4)" />
          <stop offset="100%" stop-color="rgba(32, 211, 176, 0.05)" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1="${baseline}"
        x2="${width}"
        y2="${baseline}"
        class="analytics-trend__axis-line"
      ></line>
      <polygon points="${areaPoints}" fill="url(#analyticsTrendFill)" class="analytics-trend__area"></polygon>
      <polyline points="${linePoints}" class="analytics-trend__line"></polyline>
    </svg>
  `;

  const peakPositive = sample.reduce((acc, item) => Math.max(acc, item.net), 0);
  const peakNegative = sample.reduce((acc, item) => Math.min(acc, item.net), 0);

  const yTopLabel = peakPositive > 0 ? formatPointsValue(peakPositive) : '+0';
  const yBottomLabel = peakNegative < 0 ? formatPointsValue(peakNegative) : '0';

  const firstSample = sample[0];
  const lastSample = sample[sample.length - 1];
  const midSample = sample[Math.floor(sample.length / 2)];

  const xLabels = [
    formatAxisDate(firstSample?.date),
    sample.length > 2 ? formatAxisDate(midSample?.date) : '',
    sample.length > 1 ? formatAxisDate(lastSample?.date) : ''
  ].filter((label, index, arr) => !(label === '' && (index === 1 || arr.length === 2)));

  const xAxisMarkup = `
    <div class="analytics-trend__axis-x">
      ${xLabels.map((label) => `<span class="analytics-trend__axis-x-label">${label}</span>`).join('')}
    </div>
  `;

  const legendMarkup = `
    <div class="analytics-trend__legend">
      <span><span class="analytics-trend__dot analytics-trend__dot--positive"></span>净积分走势</span>
      <span><span class="analytics-trend__dot analytics-trend__dot--negative"></span>基准差值</span>
    </div>
  `;

  container.innerHTML = `
    <div class="analytics-trend__frame">
      <div class="analytics-trend__axis-y">
        <span>${yTopLabel}</span>
        <span>0</span>
        <span>${yBottomLabel}</span>
      </div>
      <div class="analytics-trend__chart">
        ${svgMarkup}
      </div>
    </div>
    ${xAxisMarkup}
    ${legendMarkup}
  `;

  const lastNet = filtered[filtered.length - 1]?.net ?? 0;

  return {
    lastNet,
    peakPositive,
    peakNegative,
    formattedLast: formatPointsValue(lastNet),
    formattedPeakPositive: formatPointsValue(peakPositive),
    formattedPeakNegative: formatPointsValue(peakNegative)
  };
}

export function renderAnalyticsSourceBreakdown(container, breakdown, { sources } = {}) {
  if (!container) return;
  const activeSources = ensureSources(sources);
  const order = ['task', 'manual', 'reward_redeem'];

  container.innerHTML = order
    .map((source) => {
      const totals = breakdown?.[source] ?? { net: 0, earned: 0, spent: 0 };
      const active = activeSources.includes(source);
      const className = active
        ? 'analytics-sources__item'
        : 'analytics-sources__item analytics-sources__item--muted';

      return `
        <div class="${className}">
          <div class="analytics-sources__label">${formatSourceLabel(source)}</div>
          <div>
            <div class="analytics-sources__value">${formatPointsValue(totals.net ?? 0)}</div>
            <div class="analytics-sources__sub">获得 ${formatNumber(totals.earned ?? 0)} · 消耗 ${formatNumber(
              totals.spent ?? 0
            )}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

export function renderAnalyticsStudentSummary(container, history, { sources } = {}) {
  if (!container) return { net: 0, earned: 0, spent: 0 };
  if (!history) {
    container.innerHTML =
      '<p class="analytics-history__empty">请选择学生查看积分明细。</p>';
    return { net: 0, earned: 0, spent: 0 };
  }

  const summary = summarizeTotalsBySources(history.totals ?? {}, sources);
  const studentName =
    history.student?.displayName ??
    history.student?.loginName ??
    '未命名学生';
  const balanceDisplay = formatNumber(history.student?.pointsBalance ?? 0);
  const netDisplay = formatPointsValue(summary.net);
  const earnedDisplay = `${formatNumber(summary.earned)} 分`;
  const spentDisplay =
    summary.spent > 0 ? `-${formatNumber(summary.spent)} 分` : '0 分';

  container.innerHTML = `
    <div class="analytics-student-summary__card">
      <span class="analytics-student-summary__title">学生</span>
      <span class="analytics-student-summary__value">${studentName}</span>
      <span class="analytics-summary__note">当前积分 ${balanceDisplay}</span>
    </div>
    <div class="analytics-student-summary__card">
      <span class="analytics-student-summary__title">净积分</span>
      <span class="analytics-student-summary__value">${netDisplay}</span>
      <span class="analytics-summary__note">近三个月</span>
    </div>
    <div class="analytics-student-summary__card">
      <span class="analytics-student-summary__title">综合获得</span>
      <span class="analytics-student-summary__value">${earnedDisplay}</span>
      <span class="analytics-summary__note">筛选来源叠加</span>
    </div>
    <div class="analytics-student-summary__card">
      <span class="analytics-student-summary__title">综合消耗</span>
      <span class="analytics-student-summary__value">${spentDisplay}</span>
      <span class="analytics-summary__note">包含兑换、扣减</span>
    </div>
  `;

  return summary;
}

export function renderAnalyticsHistory(listElement, entries, { limit = 40 } = {}) {
  if (!listElement) return;
  const items = Array.isArray(entries) ? entries.slice(0, limit) : [];

  if (items.length === 0) {
    listElement.innerHTML =
      '<li class="analytics-history__empty">近三个月暂无积分记录。</li>';
    return;
  }

  listElement.innerHTML = items
    .map((entry) => {
      const valueClass =
        entry.points >= 0
          ? 'analytics-history__value analytics-history__value--positive'
          : 'analytics-history__value analytics-history__value--negative';
      const metaPieces = [formatDateTime(entry.createdAt), formatSourceLabel(entry.source)];
      const detailPieces = [];
      if (entry.taskTitle) {
        detailPieces.push(`任务：${entry.taskTitle}`);
      }
      if (entry.rewardTitle) {
        detailPieces.push(`奖励：${entry.rewardTitle}`);
      }
      if (entry.quantity) {
        detailPieces.push(`数量：${entry.quantity}`);
      }

      const noteHtml = entry.note
        ? `<p class="analytics-history__note">${entry.note}</p>`
        : '';
      const extraHtml = detailPieces.length
        ? `<p class="analytics-history__extra">${detailPieces.join(' · ')}</p>`
        : '';

      return `
        <li class="analytics-history__item">
          <div class="analytics-history__header">
            <span class="analytics-history__meta">${metaPieces.join(' · ')}</span>
          </div>
          <div class="${valueClass}">${formatPointsValue(entry.points)}</div>
          ${noteHtml}
          ${extraHtml}
        </li>
      `;
    })
    .join('');
}

function summarizeTotalsBySources(totalsMap = {}, sources) {
  const activeSources = ensureSources(sources);
  return activeSources.reduce(
    (acc, source) => {
      const entry = totalsMap[source] ?? { net: 0, earned: 0, spent: 0 };
      acc.net += entry.net ?? 0;
      acc.earned += entry.earned ?? 0;
      acc.spent += entry.spent ?? 0;
      acc.breakdown[source] = entry.net ?? 0;
      return acc;
    },
    { net: 0, earned: 0, spent: 0, breakdown: {} }
  );
}
