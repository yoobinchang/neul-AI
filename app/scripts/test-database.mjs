import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Real PostgreSQL policies/grants/constraints in WASM. Only Supabase's auth
// schema/JWT helper are shimmed; this does not test the hosted Auth service.
const db = new PGlite();
const root = new URL('../../', import.meta.url);
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
`);
await db.exec(await readFile(new URL('supabase/migrations/202610200001_caregiver_foundation.sql', root), 'utf8'));
await db.exec(await readFile(new URL('supabase/migrations/202610220001_parent_phone_number.sql', root), 'utf8'));
const seed = await readFile(new URL('supabase/seed.sql', root), 'utf8');
await db.exec(seed);
await db.exec(seed); // Replay must not duplicate fixtures.
const A = 'a0000000-0000-4000-8000-000000000001';
const B = 'b0000000-0000-4000-8000-000000000001';
const C = 'c0000000-0000-4000-8000-000000000001';
const FA = '10000000-0000-4000-8000-000000000001';
const FB = '10000000-0000-4000-8000-000000000002';
const PA = '20000000-0000-4000-8000-000000000001';
const PB = '20000000-0000-4000-8000-000000000002';
const alert = '50000000-0000-4000-8000-000000000001';
await db.exec(`
 insert into auth.users values ('${A}'),('${B}'),('${C}');
 insert into public.families(family_id,display_name) values ('${FB}','Other fictional family');
 insert into public.family_memberships values ('${A}','${FA}','primary'),('${B}','${FB}','primary');
 insert into public.parents(parent_id,family_id,name,preferred_name) values ('${PB}','${FB}','Other parent','Dad');
`);
let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`ok ${passed} - ${name}`); }
async function as(user, run, role = 'authenticated') {
 await db.exec(`set role ${role}; set request.jwt.claim.sub = '${user}';`);
 try { return await run(); } finally { await db.exec('reset role; reset request.jwt.claim.sub;'); }
}
async function denied(sql) { await assert.rejects(() => db.exec(sql)); }
async function count(sql, expected) { const r = await db.query(sql); assert.equal(Number(r.rows[0].n), expected); }
await test('seed is repeatable: one family, ten calls, two alerts', async () => {
 await count(`select count(*) n from calls where family_id='${FA}'`,10);
 await count(`select count(*) n from alerts where family_id='${FA}'`,2);
});
await test('demo profile and contact roles match the AI handoff', async () => {
 const parent = (await db.query(`select preferred_name, phone_number from parents where parent_id='${PA}'`)).rows[0];
 assert.equal(parent.preferred_name, 'Alex');
 assert.equal(parent.phone_number, '+12025550101');
 const contacts = (await db.query(`select display_name, priority from contacts where family_id='${FA}' order by priority`)).rows;
 assert.deepEqual(contacts, [{display_name:'Sam',priority:1},{display_name:'Jordan',priority:2}]);
});
await test('phone edits persist, allow null, validate format and remain family-scoped', async () => {
 await as(A, async () => {
  await db.exec(`update parents set phone_number='+12025550109' where parent_id='${PA}'`);
  assert.equal((await db.query(`select phone_number from parents where parent_id='${PA}'`)).rows[0].phone_number,'+12025550109');
  for (const invalid of ['', '12025550101', '+02025550101', '+1234567', '+1234567890123456', '+1 2025550101'])
   await denied(`update parents set phone_number='${invalid}' where parent_id='${PA}'`);
  await db.exec(`update parents set phone_number=null where parent_id='${PA}'`);
 });
 await as(B, async () => {
  const result=await db.query(`update parents set phone_number='+12025550108' where parent_id='${PA}' returning parent_id`);
  assert.equal(result.rows.length,0);
 });
 await as(A, async () => {
  assert.equal((await db.query(`select phone_number from parents where parent_id='${PA}'`)).rows[0].phone_number,null);
 });
 await as('',()=>denied(`update parents set phone_number='+12025550108' where parent_id='${PA}'`),'anon');
});
await test('owner can read C03 view and all three summary states', () => as(A, async () => {
 await count('select count(*) n from call_details',10);
 await count('select count(distinct summary_status) n from call_details',3);
 await count('select count(*) n from families',1);
}));
await test('other family cannot read calls, alerts, contacts or parent', () => as(B, async () => {
 for (const table of ['call_details','alerts','contacts']) await count(`select count(*) n from ${table}`,0);
 await count(`select count(*) n from parents where parent_id='${PA}'`,0);
 const r=await db.query(`update parents set routine='intrusion' where parent_id='${PA}' returning parent_id`);
 assert.equal(r.rows.length,0);
}));
await test('unassigned account cannot access seed data', () => as(C, async () => {
 for (const table of ['families','parents','call_details','alerts']) await count(`select count(*) n from ${table}`,0);
}));
await test('anonymous reads and writes are denied', () => as('', async () => {
 for (const table of ['families','family_memberships','parents','contacts','calls','call_details','alerts','acknowledgments']) await denied(`select * from ${table}`);
 await denied(`update parents set routine='intrusion'`);
}, 'anon'));
await test('profile fields persist but family IDs and immutable fields cannot change', () => as(A, async () => {
 await db.exec(`update parents set routine='Updated fictional routine', preferred_name='Mother', calming_topics=array['Plants'] where parent_id='${PA}'`);
 const r=await db.query(`select routine from parents where parent_id='${PA}'`);
 assert.equal(r.rows[0].routine,'Updated fictional routine');
 for(const field of [`family_id='${FB}'`,`parent_id='${PB}'`,`name='Changed'`]) await denied(`update parents set ${field} where parent_id='${PA}'`);
}));
await test('profile constraints reject empty/oversized data', () => as(A, async () => {
 for(const field of ["preferred_name=' '","preferred_name=repeat('a',101)","routine=repeat('a',2001)","family_facts=array_fill('a'::text,array[21])","topics_to_avoid=array[repeat('a',301)]","calming_topics=array[null::text]"]) await denied(`update parents set ${field} where parent_id='${PA}'`);
}));
await test('clients cannot self-enroll, promote, forge calls or read transcripts', () => as(A, async () => {
 await denied(`insert into family_memberships values ('${A}','${FB}','primary')`);
 await denied(`update family_memberships set role='backup'`);
 await denied(`delete from family_memberships`);
 await denied(`update calls set summary='forged'`);
 await denied('select transcript from calls');
 await denied('select cost_cents from calls');
 await denied('select provider_call_id from calls');
 await denied(`insert into families(display_name) values ('intrusion')`);
}));
await test('acknowledgments require own identity and matching family', async () => {
 await as(B,()=>denied(`insert into acknowledgments(alert_id,family_id,caregiver_id) values ('${alert}','${FA}','${B}')`));
 await as(A,()=>denied(`insert into acknowledgments(alert_id,family_id,caregiver_id) values ('${alert}','${FA}','${B}')`));
 await as(A,()=>db.exec(`insert into acknowledgments(alert_id,family_id,caregiver_id) values ('${alert}','${FA}','${A}')`));
 await as(A,()=>count('select count(*) n from acknowledgments',1));
 await as(B,()=>count('select count(*) n from acknowledgments',0));
 await as(A,()=>denied(`update acknowledgments set acknowledged_at=now()`));
});
await test('cross-family references are blocked even for privileged writers', async () => {
 await denied(`update calls set parent_id='${PB}' where family_id='${FA}'`);
 await denied(`update alerts set family_id='${FB}' where family_id='${FA}'`);
});
await test('summary status and time constraints are enforced', async () => {
 await denied(`update calls set summary_status='failed' where summary_status='completed'`);
 await denied(`update calls set ended_at=started_at - interval '1 second'`);
});
await db.close();
console.log(`${passed} database security tests passed.`);
