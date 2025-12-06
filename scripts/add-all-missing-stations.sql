-- ============================================================================
-- ADD ALL MISSING MRT AND LRT STATIONS
-- ============================================================================
-- This adds 29 missing MRT stations + 38 LRT stations = 67 total stations
-- Run this in Supabase SQL Editor to fix station coverage
-- ============================================================================

-- MISSING MRT STATIONS (29)
INSERT INTO stations (id, name, lat, lng) VALUES
  -- Major Interchanges
  ('changi-airport', 'Changi Airport', 1.3573, 103.9886),
  ('boon-lay', 'Boon Lay', 1.3388, 103.7059),
  ('pasir-ris', 'Pasir Ris', 1.3729, 103.9493),

  -- North-South Line
  ('khatib', 'Khatib', 1.4172, 103.8330),
  ('yio-chu-kang', 'Yio Chu Kang', 1.3817, 103.8448),
  ('novena', 'Novena', 1.3204, 103.8437),
  ('marina-south-pier', 'Marina South Pier', 1.2710, 103.8635),
  ('bukit-batok', 'Bukit Batok', 1.3490, 103.7496),
  ('bukit-gombak', 'Bukit Gombak', 1.3587, 103.7518),
  ('choa-chu-kang', 'Choa Chu Kang', 1.3854, 103.7443),
  ('yew-tee', 'Yew Tee', 1.3972, 103.7470),
  ('kranji', 'Kranji', 1.4251, 103.7620),
  ('marsiling', 'Marsiling', 1.4326, 103.7742),
  ('admiralty', 'Admiralty', 1.4406, 103.8009),
  ('sembawang', 'Sembawang', 1.4491, 103.8202),
  ('canberra', 'Canberra', 1.4430, 103.8297),

  -- East-West Line
  ('pioneer', 'Pioneer', 1.3376, 103.6974),
  ('joo-koon', 'Joo Koon', 1.3277, 103.6783),
  ('gul-circle', 'Gul Circle', 1.3195, 103.6605),
  ('tuas-crescent', 'Tuas Crescent', 1.3210, 103.6492),
  ('tuas-west-road', 'Tuas West Road', 1.3303, 103.6397),
  ('tuas-link', 'Tuas Link', 1.3404, 103.6368),
  ('dover', 'Dover', 1.3113, 103.7786),
  ('commonwealth', 'Commonwealth', 1.3026, 103.7979),
  ('eunos', 'Eunos', 1.3197, 103.9034),
  ('kembangan', 'Kembangan', 1.3213, 103.9129),
  ('simei', 'Simei', 1.3432, 103.9533),
  ('tanah-merah', 'Tanah Merah', 1.3276, 103.9464),
  ('expo', 'Expo', 1.3350, 103.9614),

-- BUKIT PANJANG LRT (11 stations)
  ('south-view', 'South View', 1.3530, 103.7420),
  ('keat-hong', 'Keat Hong', 1.3790, 103.7488),
  ('teck-whye', 'Teck Whye', 1.3807, 103.7530),
  ('phoenix', 'Phoenix', 1.3788, 103.7577),
  ('petir', 'Petir', 1.3778, 103.7662),
  ('pending', 'Pending', 1.3761, 103.7714),
  ('bangkit', 'Bangkit', 1.3800, 103.7719),
  ('fajar', 'Fajar', 1.3841, 103.7710),
  ('segar', 'Segar', 1.3871, 103.7694),
  ('jelapang', 'Jelapang', 1.3863, 103.7644),
  ('senja', 'Senja', 1.3825, 103.7626),

-- SENGKANG LRT (13 stations)
  -- East Loop
  ('compassvale', 'Compassvale', 1.3945, 103.9005),
  ('rumbia', 'Rumbia', 1.3919, 103.9065),
  ('bakau', 'Bakau', 1.3901, 103.9050),
  ('kangkar', 'Kangkar', 1.3847, 103.9020),
  ('ranggung', 'Ranggung', 1.3896, 103.8973),
  -- West Loop
  ('cheng-lim', 'Cheng Lim', 1.3967, 103.8937),
  ('farmway', 'Farmway', 1.3975, 103.8890),
  ('kupang', 'Kupang', 1.3987, 103.8813),
  ('thanggam', 'Thanggam', 1.3974, 103.8748),
  ('fernvale', 'Fernvale', 1.3919, 103.8762),
  ('layar', 'Layar', 1.3924, 103.8804),
  ('tongkang', 'Tongkang', 1.3896, 103.8858),
  ('renjong', 'Renjong', 1.3867, 103.8897),

-- PUNGGOL LRT (14 stations)
  -- East Loop
  ('cove', 'Cove', 1.3995, 103.9054),
  ('meridian', 'Meridian', 1.3969, 103.9088),
  ('coral-edge', 'Coral Edge', 1.3937, 103.9133),
  ('riviera', 'Riviera', 1.3945, 103.9162),
  ('kadaloor', 'Kadaloor', 1.3998, 103.9162),
  ('oasis', 'Oasis', 1.4021, 103.9122),
  ('damai', 'Damai', 1.4050, 103.9081),
  -- West Loop
  ('sam-kee', 'Sam Kee', 1.4120, 103.9023),
  ('teck-lee', 'Teck Lee', 1.4137, 103.9061),
  ('punggol-point', 'Punggol Point', 1.4169, 103.9064),
  ('samudera', 'Samudera', 1.4164, 103.9015),
  ('nibong', 'Nibong', 1.4118, 103.8974),
  ('sumang', 'Sumang', 1.4089, 103.8983),
  ('soo-teck', 'Soo Teck', 1.4062, 103.8976);

-- ============================================================================
-- SUMMARY:
-- - 29 MRT stations added
-- - 38 LRT stations added (11 Bukit Panjang + 13 Sengkang + 14 Punggol)
-- - Total: 67 new stations
-- ============================================================================
