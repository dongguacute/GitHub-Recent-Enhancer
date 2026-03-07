import { getRecent } from './api';

const CACHE_KEY = 'ghre_cache';
const CACHE_DURATION = 5 * 60 * 1000;

interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  repository_url: string;
  pull_request?: object;
  updated_at?: string;
}

function getRepoName(repoUrl: string): string {
  const parts = repoUrl.split('/');
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

const PR_OPEN_ICON = '<svg class="item-icon open" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.55a.25.25 0 0 1-.177.427l-1.148.339a.25.25 0 0 1-.282-.177l-.339-1.148a.25.25 0 0 1 .177-.282Zm3.428 2.177a2.25 2.25 0 1 1 3 2.122v6.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 10.605 5.25Z"/><path fill="currentColor" d="M7.25 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 8Z"/></svg>';
const ISSUE_OPEN_ICON = '<svg class="item-icon issue" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path fill="currentColor" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/></svg>';

async function getCachedItems(): Promise<GitHubItem[] | null> {
  const r = await chrome.storage.local.get(CACHE_KEY);
  const c = r[CACHE_KEY];
  if (c?.timestamp && Date.now() - c.timestamp < CACHE_DURATION) return c.items;
  return null;
}

async function setCachedItems(items: GitHubItem[]): Promise<void> {
  await chrome.storage.local.set({ [CACHE_KEY]: { items, timestamp: Date.now() } });
}

function renderList(items: GitHubItem[]): string {
  const prCount = items.filter(i => i.pull_request).length;
  const issueCount = items.length - prCount;
  const rows = items.map(item => {
    const icon = item.pull_request ? PR_OPEN_ICON : ISSUE_OPEN_ICON;
    const repo = getRepoName(item.repository_url);
    return `<li class="item"><a href="${item.html_url}" target="_blank">${icon}<div class="item-content"><div class="item-title">${escapeHtml(item.title)}</div><div class="item-repo">${escapeHtml(repo)}</div></div></a></li>`;
  }).join('');
  return `
    <div class="stats">
      <span class="stat stat-pr">${PR_OPEN_ICON} ${prCount} PRs</span>
      <span class="stat stat-issue">${ISSUE_OPEN_ICON} ${issueCount} Issues</span>
    </div>
    <ul class="list">${rows}</ul>
  `;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function showLoading(): void {
  document.getElementById('content')!.innerHTML = `
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <p style="margin-top: 8px;">Loading...</p>
    </div>
  `;
}

function showError(msg: string): void {
  document.getElementById('content')!.innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
}

function showEmpty(): void {
  document.getElementById('content')!.innerHTML = `<div class="empty">No recent activity</div>`;
}

async function loadActivity(): Promise<void> {
  const { githubUsername, githubToken } = await chrome.storage.sync.get(['githubUsername', 'githubToken']);
  if (!githubUsername || !githubToken) {
    showError('Please configure Username and Token in Settings');
    return;
  }

  showLoading();
  try {
    let items: GitHubItem[] = (await getCachedItems()) ?? [];
    if (items.length === 0) {
      const data = await getRecent(githubToken, githubUsername);
      items = (data.items || []).slice(0, 30);
      await setCachedItems(items);
    }
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    items = items.filter((item) => new Date(item.updated_at || 0) > oneMonthAgo);
    if (items.length === 0) showEmpty();
    else document.getElementById('content')!.innerHTML = renderList(items);
  } catch (e) {
    showError('Failed to load: ' + (e instanceof Error ? e.message : 'Unknown error'));
  }
}

function initSettings(): void {
  const toggle = document.getElementById('settings-toggle')!;
  const panel = document.getElementById('settings')!;
  const username = document.getElementById('username') as HTMLInputElement;
  const token = document.getElementById('token') as HTMLInputElement;
  const saveBtn = document.getElementById('save')!;
  const status = document.getElementById('status')!;

  toggle.addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });

  chrome.storage.sync.get(['githubUsername', 'githubToken']).then(r => {
    if (r.githubUsername) username.value = r.githubUsername;
    if (r.githubToken) token.value = r.githubToken;
  });

  saveBtn.addEventListener('click', async () => {
    const u = username.value.trim();
    const t = token.value.trim();
    if (!u || !t) {
      status.textContent = 'Please fill all fields';
      status.className = 'status error';
      return;
    }
    try {
      await chrome.storage.sync.set({ githubUsername: u, githubToken: t });
      await chrome.storage.local.remove(CACHE_KEY);
      status.textContent = 'Saved';
      status.className = 'status success';
      loadActivity();
    } catch {
      status.textContent = 'Save failed';
      status.className = 'status error';
    }
  });
}

initSettings();
loadActivity();
