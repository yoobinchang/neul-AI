-- Fictional data only. Explicitly run in a development/demo project.
-- No auth users, passwords or memberships: bind a verified test user separately.
begin;
insert into public.families (family_id, display_name, neul_number) values
('10000000-0000-4000-8000-000000000001', 'Alex demo family', '+12025550100') on conflict do nothing;
insert into public.parents (parent_id, family_id, name, preferred_name, phone_number, routine, family_facts, calming_topics, topics_to_avoid) values
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
 'Alex', 'Alex', '+12025550101', 'Alex enjoys gardening in the morning and listening to music after lunch.',
 array['Sam is the primary caregiver.', 'Jordan is the backup contact.', 'Alex has a dog named Coco.'],
 array['Gardening', 'Coco the dog', 'Favorite music'],
 array['Arguments about mistaken memories', 'Quizzing Alex about things they cannot remember']) on conflict do nothing;
insert into public.contacts (contact_id, family_id, display_name, phone_number, priority) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Sam','+12025550102',1),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Jordan','+12025550103',2)
on conflict do nothing;
insert into public.calls (call_id, family_id, parent_id, provider_call_id, status,
 started_at, ended_at, duration_seconds, transcript, urgency, summary_status, summary, topic, mood, cost_cents)
select ('40000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
 '10000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000001'::uuid,
 'fictional_call_' || n, 'ended',
 '2026-10-20T14:00:00Z'::timestamptz - n * interval '3 hours',
 '2026-10-20T14:00:00Z'::timestamptz - n * interval '3 hours' + interval '2 minutes',
 120,
 case n when 3 then E'Parent: I do not know where I am. I see a park and a blue bench.\nNeul: Are you somewhere safe to stay for a moment?'
 when 4 then E'Parent: I need help right now.\nNeul: I will try to reach Sam.'
 else E'Parent: When will Sam visit?\nNeul: I do not have a confirmed visit time. I can let Sam know you asked.' end,
 case n when 3 then 'lost' when 4 then 'urgent' else 'routine' end,
 case n when 9 then 'processing' when 10 then 'failed' else 'completed' end,
 case when n >= 9 then null when n = 3 then 'Fictional lost scenario: Alex mentioned a park and a blue bench. No notification was sent.'
 when n = 4 then 'Fictional urgent scenario: Alex asked for help. No notification was sent.'
 else 'Alex asked when Sam would visit. No confirmed time was provided.' end,
 case when n >= 9 then null when n = 3 then 'Finding the way home' when n = 4 then 'Request for help' else 'Family visit' end,
 case when n >= 9 then null when n in (3,4) then 'concerned' else 'calm' end, 14
from generate_series(1,10) n on conflict do nothing;
insert into public.alerts (alert_id, family_id, call_id, event_id, type, reason, landmarks, created_at) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003',
 'fictional_alert_1','lost','Fictional test: Alex did not know where they were. No notification sent.',array['park','blue bench'],'2026-10-20T05:01:00Z'),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004',
 'fictional_alert_2','urgent','Fictional test: Alex requested immediate help. No notification sent.','{}','2026-10-20T02:01:00Z')
on conflict do nothing;
commit;
