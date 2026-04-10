import { getRecent, isWithinRecentActivityWindow } from './api';

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

const PR_OPEN_ICON = '<svg class="item-icon open" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M22.266 2.711a.75.75 0 10-1.061-1.06l-1.983 1.983-1.984-1.983a.75.75 0 10-1.06 1.06l1.983 1.983-1.983 1.984a.75.75 0 001.06 1.06l1.984-1.983 1.983 1.983a.75.75 0 001.06-1.06l-1.983-1.984 1.984-1.983z"/><path fill="currentColor" fill-rule="evenodd" d="M4.75 1.5a3.25 3.25 0 00-.745 6.414A.758.758 0 004 8v8a.81.81 0 00.005.086A3.251 3.251 0 004.75 22.5a3.25 3.25 0 00.745-6.414A.758.758 0 005.5 16V8a.758.758 0 00-.005-.086A3.251 3.251 0 004.75 1.5zM3 4.75a1.75 1.75 0 113.5 0 1.75 1.75 0 01-3.5 0zm0 14.5a1.75 1.75 0 113.5 0 1.75 1.75 0 01-3.5 0zm13 0a3.251 3.251 0 012.5-3.163V9.625a.75.75 0 011.5 0v6.462a3.251 3.251 0 01-.75 6.413A3.25 3.25 0 0116 19.25zm3.25-1.75a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5z"/></svg>';
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
    items = items.filter((item) => isWithinRecentActivityWindow(item.updated_at));
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
