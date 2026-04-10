# GitHub Recent Enhancer

Restore the "Recent" feature on the GitHub web version — which was previously removed by GitHub for unknown reasons. View your recent PRs and Issues in a side panel with one click.

**Same idea as the original:** this extension mirrors what the old built-in **Recent** list did — open PRs and Issues that involve you, focused on what’s still active and recently touched. The UI lives in the browser side panel instead of GitHub’s native layout, but the purpose matches the former feature: a quick “recent involvement” list.

## Features

- **Side Panel** — Opens in Chrome's side panel for quick access without leaving the current page
- **Recent Activity** — Same core behavior as GitHub’s former Recent: your open PRs and Issues (`involves:you`, `is:open`), sorted by last updated
- **5-minute Cache** — Reduces API calls for a smoother experience
- **One-month Filter** — Only displays items updated within the last month

## Prerequisites

You need a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope to fetch your activity.

## Installation

### Load Unpacked (Development)

1. Clone this repo and build:
   ```bash
   git clone https://github.com/dongguacute/GitHub-Recent-Enhancer.git
   cd GitHub-Recent-Enhancer
   pnpm install
   pnpm run build
   ```

2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `dist` folder

## Usage

1. Click the extension icon in the toolbar to open the side panel
2. Click **Settings** to configure:
   - **Username** — Your GitHub username
   - **Token** — Your GitHub Personal Access Token (with `repo` scope)
3. Click **Save** — Your recent PRs and Issues will load automatically

## Development

```bash
# Install dependencies
pnpm install

# Build for production
pnpm run build

# Watch mode (rebuild on file changes)
pnpm run dev

# Type check
pnpm run typecheck
```

## Tech Stack

- TypeScript
- Vite
- Chrome Extension Manifest V3

## License

MIT © [Cherry](https://github.com/dongguacute)
