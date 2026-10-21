import { test, expect, type Page } from '@playwright/test';

const family = { family_id: 'family-a', display_name: 'Fictional family' };
const user = { id: 'user-a', aud: 'authenticated', role: 'authenticated', email: 'caregiver@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-20T00:00:00Z' };
async function fixture(page: Page, options: { unassigned?: boolean; failure?: boolean; empty?: boolean } = {}) {
  let parent = { parent_id: 'parent-a', family_id: family.family_id, name: 'Fictional Parent', preferred_name: 'Mom', routine: 'Gardening', family_facts: ['Alex is the caregiver.'], calming_topics: ['Plants'], topics_to_avoid: [] };
  const acknowledgments: { alert_id: string }[] = [];
  const calls = options.empty ? [] : Array.from({ length: 21 }, (_, i) => ({ call_id: `call-${i}`, parent_id: parent.parent_id, started_at: `2026-10-${String(20 - Math.floor(i / 2)).padStart(2, '0')}T10:00:00Z`, duration_seconds: 120,
    urgency: i === 2 ? 'lost' : 'routine', summary_status: i === 0 ? 'processing' : i === 1 ? 'failed' : 'completed',
    summary: i < 2 ? null : `Fictional summary ${i}`, topic: i < 2 ? null : `Conversation ${i}`, mood: i < 2 ? null : 'calm' }));
  await page.route('https://neul-test.supabase.co/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const reply = (body: unknown, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...headers }, body: JSON.stringify(body) });
    if (url.pathname.endsWith('/token')) {
      const body = req.postDataJSON();
      if (body.password === 'wrong-password') return reply({ msg: 'Invalid login credentials' }, 400);
      const token = [Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'fictional'].join('.');
      return reply({ access_token: token, refresh_token: 'fictional-refresh', token_type: 'bearer', expires_in: 3600, user });
    }
    if (url.pathname.endsWith('/logout')) return reply({});
    if (url.pathname.endsWith('/user')) return reply(user);
    if (url.pathname.endsWith('/families')) return reply(options.unassigned ? [] : [family]);
    if (url.pathname.endsWith('/parents')) {
      if (options.failure) return reply({ message: 'Database unavailable', code: 'XX000' }, 500);
      if (req.method() === 'PATCH') {
        const update = req.postDataJSON();
        expect(Object.keys(update).sort()).toEqual(['calming_topics','family_facts','preferred_name','routine','topics_to_avoid']);
        parent = { ...parent, ...update };
        return reply(parent);
      }
      return reply([parent]);
    }
    if (url.pathname.endsWith('/contacts')) return reply([{ contact_id: 'contact-a', display_name: 'Alex', phone_number: '+12025550102', priority: 1 }]);
    if (url.pathname.endsWith('/call_details')) {
      const select = url.searchParams.get('select') ?? '';
      expect(select).not.toMatch(/transcript|cost_cents/);
      if (url.searchParams.has('call_id')) return reply(calls.find(c => `eq.${c.call_id}` === url.searchParams.get('call_id')) ?? null);
      expect(url.searchParams.get('family_id')).toBe('eq.family-a');
      const offset = Number(url.searchParams.get('offset') ?? 0);
      return reply(calls.slice(offset, offset+20), 200, { 'content-range': `${offset}-${Math.min(offset+19, calls.length-1)}/${calls.length}` });
    }
    if (url.pathname.endsWith('/alerts')) return reply(options.empty ? [] : [{ alert_id: 'alert-a', call_id: 'call-20', type: 'lost', reason: 'Fictional alert for testing', created_at: '2026-10-20T00:00:00Z' }]);
    if (url.pathname.endsWith('/acknowledgments')) {
      if (req.method() === 'POST') { const body=req.postDataJSON(); expect(body.caregiver_id).toBe(user.id); acknowledgments.push({alert_id: body.alert_id}); }
      return reply(acknowledgments);
    }
    throw new Error(`Unexpected request: ${req.method()} ${url}`);
  });
}
async function login(page: Page, password = 'fictional-password') {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function nav(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Desktop navigation' }).getByRole('button', { name: new RegExp(name) }).click();
}

test('sign in, profile persistence, paginated calls, acknowledgment and logout', async ({ page }) => {
  await fixture(page);
  await login(page);
  await expect(page.getByLabel('Family', { exact: true })).toBeVisible();
  await nav(page, 'Calls');
  await expect(page.getByText('Summary processing', {exact:true})).toBeVisible();
  await expect(page.getByText('Summary unavailable', {exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Next',exact:true}).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.getByText('Conversation 20', {exact:true})).toBeVisible();
  await nav(page, 'Profile');
  await page.getByLabel('Preferred name', {exact:true}).fill('Mother');
  await page.getByRole('textbox', {name:'Everyday routine',exact:true}).fill('Updated fictional routine');
  await page.getByRole('button', {name:'Save profile',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Saved to your family');
  await page.reload();
  await nav(page, 'Profile');
  await expect(page.getByLabel('Preferred name', {exact:true})).toHaveValue('Mother');
  await expect(page.getByRole('textbox', {name:'Everyday routine',exact:true})).toHaveValue('Updated fictional routine');
  await nav(page, 'Alerts');
  await page.getByRole('button', {name:'View related call'}).click();
  await expect(page.getByRole('dialog')).toContainText('Conversation 20');
  await page.getByRole('button', {name:'Close call details'}).click();
  await page.getByRole('button', {name:'Mark reviewed'}).click();
  await expect(page.getByText('Reviewed', {exact:true})).toBeVisible();
  await page.reload();
  await nav(page, 'Alerts');
  await expect(page.getByText('Reviewed', {exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Sign out',exact:true}).click();
  await expect(page.getByRole('button', {name:'Sign in',exact:true})).toBeVisible();
  await expect(page.getByText('Fictional alert for testing')).toHaveCount(0);
});

test('invalid credentials show an error without workspace data', async ({page}) => {
  await fixture(page); await login(page,'wrong-password');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Invalid login credentials');
  await expect(page.getByLabel('Family', {exact:true})).toHaveCount(0);
});

test('unassigned accounts never fall back to mock family data', async ({page}) => {
  await fixture(page,{unassigned:true}); await login(page);
  await expect(page.getByText('Your account is ready.', {exact:false})).toBeVisible();
  await expect(page.getByText('Fictional Parent', {exact:true})).toHaveCount(0);
});

test('query failures are visible and never replaced by mock data', async ({page}) => {
  await fixture(page,{failure:true}); await login(page);
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', {name:'Try again'})).toBeVisible();
});

test('empty family data renders on mobile without fabricated activity', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await fixture(page,{empty:true}); await login(page);
  await expect(page.getByRole('main').locator('p').filter({hasText: /^No calls yet\.$/})).toBeVisible();
  await expect(page.getByRole('heading', {name:'No unreviewed alerts.',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:'Calls'}).click();
  await expect(page.getByText('Page 1 of 1')).toBeVisible();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
});
