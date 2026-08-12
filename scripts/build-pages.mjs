import { copyFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

rmSync('docs', { recursive: true, force: true })
execFileSync('pnpm', ['vite', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, GITHUB_PAGES: 'true', BUILD_OUTPUT_DIR: 'docs' }
})
copyFileSync('docs/index.html', 'docs/404.html')
