import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:3100', viewport: { width: 1280, height: 900 }, launchOptions: { executablePath: process.env.NEUL_TEST_BROWSER, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] } },
  webServer: {
    command: 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://neul-test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fictional-public-key',
    },
  },
});
