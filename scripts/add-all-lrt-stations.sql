-- Add ALL LRT stations with GPS coordinates
-- Source: Official LTA data and OpenStreetMap

-- Bukit Panjang LRT Line
INSERT INTO stations (id, name, lat, lng) VALUES
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

-- Sengkang LRT East Loop
  ('compassvale', 'Compassvale', 1.3945, 103.9005),
  ('rumbia', 'Rumbia', 1.3919, 103.9065),
  ('bakau', 'Bakau', 1.3901, 103.9050),
  ('kangkar', 'Kangkar', 1.3847, 103.9020),
  ('ranggung', 'Ranggung', 1.3896, 103.8973),

-- Sengkang LRT West Loop
  ('cheng-lim', 'Cheng Lim', 1.3967, 103.8937),
  ('farmway', 'Farmway', 1.3975, 103.8890),
  ('kupang', 'Kupang', 1.3987, 103.8813),
  ('thanggam', 'Thanggam', 1.3974, 103.8748),
  ('fernvale', 'Fernvale', 1.3919, 103.8762),
  ('layar', 'Layar', 1.3924, 103.8804),
  ('tongkang', 'Tongkang', 1.3896, 103.8858),
  ('renjong', 'Renjong', 1.3867, 103.8897),

-- Punggol LRT East Loop
  ('cove', 'Cove', 1.3995, 103.9054),
  ('meridian', 'Meridian', 1.3969, 103.9088),
  ('coral-edge', 'Coral Edge', 1.3937, 103.9133),
  ('riviera', 'Riviera', 1.3945, 103.9162),
  ('kadaloor', 'Kadaloor', 1.3998, 103.9162),
  ('oasis', 'Oasis', 1.4021, 103.9122),
  ('damai', 'Damai', 1.4050, 103.9081),

-- Punggol LRT West Loop
  ('sam-kee', 'Sam Kee', 1.4120, 103.9023),
  ('teck-lee', 'Teck Lee', 1.4137, 103.9061),
  ('punggol-point', 'Punggol Point', 1.4169, 103.9064),
  ('samudera', 'Samudera', 1.4164, 103.9015),
  ('nibong', 'Nibong', 1.4118, 103.8974),
  ('sumang', 'Sumang', 1.4089, 103.8983),
  ('soo-teck', 'Soo Teck', 1.4062, 103.8976);
