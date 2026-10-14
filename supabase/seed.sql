-- Fictional development squad only. Ofcom drama-range numbers. Not real players.

insert into public.profiles (id, full_name, phone_e164, role) values
  ('11111111-1111-4111-8111-111111111101', 'Alex Reed', '+447700900101', 'player'),
  ('11111111-1111-4111-8111-111111111102', 'Jordan Blake', '+447700900102', 'player'),
  ('11111111-1111-4111-8111-111111111103', 'Sam Cole', '+447700900103', 'player'),
  ('11111111-1111-4111-8111-111111111104', 'Riley Shah', '+447700900104', 'player'),
  ('11111111-1111-4111-8111-111111111105', 'Morgan Ellis', '+447700900105', 'player'),
  ('11111111-1111-4111-8111-111111111106', 'Chris Nolan', '+447700900106', 'player'),
  ('11111111-1111-4111-8111-111111111107', 'Pat Murray', '+447700900107', 'player'),
  ('11111111-1111-4111-8111-111111111108', 'Taylor Quinn', '+447700900108', 'player'),
  ('11111111-1111-4111-8111-111111111109', 'Jamie Frost', '+447700900109', 'player'),
  ('11111111-1111-4111-8111-111111111110', 'Priya Khan', '+447700900110', 'admin'),
  ('11111111-1111-4111-8111-111111111111', 'Drew McAllister', '+447700900111', 'player'),
  ('11111111-1111-4111-8111-111111111112', 'Ben Cartwright', '+447700900112', 'player'),
  ('11111111-1111-4111-8111-111111111199', 'Robin Shaw', '+447700900199', 'player')
on conflict (id) do nothing;

update public.profiles
  set status = 'inactive'
  where id = '11111111-1111-4111-8111-111111111199';

insert into public.charges (id, player_id, description, category, amount_pence, due_on, status, created_by) values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'Match fee · vs FC Didsbury, 4 October',
    'match_fee',
    800,
    '2026-10-04',
    'open',
    '11111111-1111-4111-8111-111111111110'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111101',
    'Match fee · vs Chorlton Athletic, 11 October',
    'match_fee',
    800,
    '2026-10-11',
    'open',
    '11111111-1111-4111-8111-111111111110'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111101',
    'League and affiliation subs 2026/27',
    'league_subs',
    4000,
    '2026-09-01',
    'open',
    '11111111-1111-4111-8111-111111111110'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111101',
    'Training · October, Hough End',
    'training',
    1000,
    '2026-10-01',
    'open',
    '11111111-1111-4111-8111-111111111110'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    '11111111-1111-4111-8111-111111111101',
    'Home shirt deposit',
    'kit',
    2500,
    '2026-08-15',
    'open',
    '11111111-1111-4111-8111-111111111110'
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    '11111111-1111-4111-8111-111111111102',
    'Match fee · vs Chorlton Athletic, 11 October',
    'match_fee',
    800,
    '2026-10-11',
    'open',
    '11111111-1111-4111-8111-111111111110'
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    '11111111-1111-4111-8111-111111111102',
    'Late to kick-off · 4 October',
    'fine',
    500,
    '2026-10-04',
    'open',
    '11111111-1111-4111-8111-111111111110'
  ),
  (
    '22222222-2222-4222-8222-222222222208',
    '11111111-1111-4111-8111-111111111110',
    'Match fee · vs Chorlton Athletic, 11 October',
    'match_fee',
    800,
    '2026-10-11',
    'open',
    '11111111-1111-4111-8111-111111111110'
  ),
  (
    '22222222-2222-4222-8222-222222222209',
    '11111111-1111-4111-8111-111111111103',
    'Keeper glove contribution',
    'kit',
    1500,
    '2026-09-20',
    'open',
    '11111111-1111-4111-8111-111111111110'
  )
on conflict (id) do nothing;

-- Settled examples via the same functions the server uses (run as table owner / service).
select public.begin_checkout(
  '11111111-1111-4111-8111-111111111101',
  array['22222222-2222-4222-8222-222222222204'::uuid],
  'cs_test_training_october'
);

select public.complete_payment(
  p_stripe_checkout_session_id => 'cs_test_training_october',
  p_stripe_payment_intent_id => 'pi_test_training_october'
);

select public.begin_checkout(
  '11111111-1111-4111-8111-111111111101',
  array['22222222-2222-4222-8222-222222222205'::uuid],
  'cs_test_kit_deposit'
);

select public.complete_payment(
  p_stripe_checkout_session_id => 'cs_test_kit_deposit',
  p_stripe_payment_intent_id => 'pi_test_kit_deposit'
);

select public.begin_checkout(
  '11111111-1111-4111-8111-111111111110',
  array['22222222-2222-4222-8222-222222222208'::uuid],
  'cs_test_admin_match'
);

select public.complete_payment(
  p_stripe_checkout_session_id => 'cs_test_admin_match',
  p_stripe_payment_intent_id => 'pi_test_admin_match'
);
