const usernameInput = document.getElementById('username') as HTMLInputElement;
const tokenInput = document.getElementById('token') as HTMLInputElement;
const saveBtn = document.getElementById('save') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['githubUsername', 'githubToken']);
    if (result.githubUsername) {
      usernameInput.value = result.githubUsername;
    }
    if (result.githubToken) {
      tokenInput.value = result.githubToken;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings() {
  const username = usernameInput.value.trim();
  const token = tokenInput.value.trim();

  if (!username || !token) {
    statusEl.textContent = 'Please fill all fields';
    statusEl.classList.add('show', 'error');
    setTimeout(() => {
      statusEl.classList.remove('show', 'error');
    }, 1500);
    return;
  }

  try {
    await chrome.storage.sync.set({
      githubUsername: username,
      githubToken: token
    });

    statusEl.textContent = 'Saved';
    statusEl.classList.add('show', 'success');
    setTimeout(() => {
      statusEl.classList.remove('show', 'success');
    }, 1500);
  } catch (error) {
    console.error('Failed to save settings:', error);
    statusEl.textContent = 'Save failed';
    statusEl.classList.add('show', 'error');
    setTimeout(() => {
      statusEl.classList.remove('show', 'error');
    }, 1500);
  }
}

saveBtn.addEventListener('click', saveSettings);
loadSettings();
