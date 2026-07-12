-- FitLoop schema v16 — expand the exercise library.
--
-- The starter library (seed_exercises.sql, 55 moves) had limited scope. This
-- adds ~60 more across every muscle group and equipment type (barbell,
-- dumbbell, cable, machine, bodyweight, kettlebell, bands, etc.) so users can
-- pick the specific movements they want. sort_order values are in the 100+
-- range so these append after the original picks within each muscle group.
--
-- Upserts by name (same partial unique index / conflict clause as the seed), so
-- it's safe to re-run and won't duplicate existing rows.

insert into public.exercises (name, muscle_group, category, sort_order, met_value, equipment, is_custom, instructions)
values
  -- Chest
  ('Machine Chest Press', 'chest', 'compound', 100, 5.0, 'Machine', false, 'Sit at the machine and press the handles forward until your arms are extended, then return under control. A stable, beginner-friendly chest press.'),
  ('Dumbbell Bench Press', 'chest', 'compound', 105, 6.0, 'Dumbbell', false, 'Lie on a flat bench and press two dumbbells from chest level to full extension, allowing a deeper stretch than a barbell.'),
  ('Incline Barbell Press', 'chest', 'compound', 110, 6.0, 'Barbell', false, 'On a 30-45 degree bench, lower the barbell to your upper chest and press up. Emphasizes the upper chest.'),
  ('Dumbbell Fly', 'chest', 'isolation', 115, 3.5, 'Dumbbell', false, 'Lie flat holding dumbbells above your chest with a slight elbow bend, lower them out in an arc, then squeeze back together. Isolates the chest.'),
  ('Pec Deck', 'chest', 'isolation', 120, 3.5, 'Machine', false, 'Sit at the pec deck and bring the pads together in front of your chest, squeezing the pecs, then return slowly.'),
  ('Landmine Press', 'chest', 'compound', 125, 5.0, 'Barbell', false, 'Press one end of a barbell anchored in a landmine up and forward at an angle. Works the upper chest and shoulders.'),

  -- Back
  ('Seated Cable Row', 'back', 'compound', 100, 5.0, 'Cable', false, 'Sit at the cable row, keep your back straight, and pull the handle to your stomach, squeezing your shoulder blades together.'),
  ('T-Bar Row', 'back', 'compound', 105, 6.0, 'Barbell', false, 'Straddle a landmine bar with a V-handle, hinge at the hips, and row the weight to your torso. Builds mid-back thickness.'),
  ('Chin-Up', 'back', 'compound', 110, 8.0, 'Bodyweight', false, 'Hang from a bar with an underhand, shoulder-width grip and pull your chin over the bar. Emphasizes the lats and biceps.'),
  ('Single-Arm Dumbbell Row', 'back', 'compound', 115, 5.0, 'Dumbbell', false, 'With one knee and hand on a bench, row a dumbbell to your hip, keeping your back flat. Works each side of the back independently.'),
  ('Straight-Arm Pulldown', 'back', 'isolation', 120, 3.5, 'Cable', false, 'Stand at a high pulley with straight arms and pull the bar down to your thighs in an arc. Isolates the lats.'),
  ('Machine Row', 'back', 'compound', 125, 5.0, 'Machine', false, 'Sit at the row machine with your chest on the pad and pull the handles back, squeezing your shoulder blades.'),
  ('Back Extension', 'back', 'isolation', 130, 4.0, 'Bodyweight', false, 'On a hyperextension bench, hinge at the hips and raise your torso until your body is straight. Strengthens the lower back.'),

  -- Shoulders
  ('Arnold Press', 'shoulders', 'compound', 100, 5.0, 'Dumbbell', false, 'Start with dumbbells at shoulder height, palms facing you, then rotate and press overhead. Hits all three deltoid heads.'),
  ('Machine Shoulder Press', 'shoulders', 'compound', 105, 5.0, 'Machine', false, 'Sit and press the machine handles overhead until arms are extended. A stable overhead press variation.'),
  ('Cable Lateral Raise', 'shoulders', 'isolation', 110, 3.5, 'Cable', false, 'Stand side-on to a low pulley and raise the handle out to shoulder height. Constant tension on the side delts.'),
  ('Reverse Pec Deck', 'shoulders', 'isolation', 115, 3.5, 'Machine', false, 'Face the pec deck pad and pull the handles out and back, squeezing the rear delts.'),
  ('Front Raise', 'shoulders', 'isolation', 120, 3.5, 'Dumbbell', false, 'Raise a dumbbell straight in front of you to shoulder height, then lower under control. Targets the front delts.'),
  ('Barbell Shrug', 'shoulders', 'isolation', 125, 4.0, 'Barbell', false, 'Hold a barbell at arms length and shrug your shoulders straight up toward your ears. Builds the traps.'),
  ('Upright Row', 'shoulders', 'compound', 130, 4.5, 'Barbell', false, 'Pull a barbell up along your body to chest height, leading with your elbows. Works the side delts and traps.'),

  -- Arms
  ('Preacher Curl', 'arms', 'isolation', 100, 3.5, 'EZ Bar', false, 'Rest your arms on a preacher bench and curl the bar up, keeping the upper arms fixed. Isolates the biceps.'),
  ('Concentration Curl', 'arms', 'isolation', 105, 3.0, 'Dumbbell', false, 'Seated, brace your elbow against your inner thigh and curl a dumbbell up. A strict biceps isolation.'),
  ('Cable Curl', 'arms', 'isolation', 110, 3.5, 'Cable', false, 'Curl a low-pulley bar up with constant cable tension, keeping your elbows pinned to your sides.'),
  ('EZ-Bar Curl', 'arms', 'isolation', 115, 3.5, 'EZ Bar', false, 'Curl an EZ bar up with a semi-supinated grip, which is easier on the wrists than a straight bar.'),
  ('Skull Crusher', 'arms', 'isolation', 120, 3.5, 'EZ Bar', false, 'Lying on a bench, lower an EZ bar to your forehead by bending the elbows, then extend back up. Isolates the triceps.'),
  ('Close-Grip Bench Press', 'arms', 'compound', 125, 5.5, 'Barbell', false, 'Bench press with a shoulder-width grip, keeping elbows tucked. A compound movement that emphasizes the triceps.'),
  ('Bench Dip', 'arms', 'compound', 130, 5.0, 'Bodyweight', false, 'With hands on a bench behind you, lower your body by bending your elbows, then press back up. Works the triceps.'),
  ('Cable Overhead Extension', 'arms', 'isolation', 135, 3.5, 'Cable', false, 'Facing away from a high pulley, extend the rope overhead until your arms are straight. Stretches and works the triceps.'),

  -- Forearms
  ('Reverse Wrist Curl', 'forearms', 'isolation', 100, 3.0, 'Dumbbell', false, 'Rest your forearms on your thighs, palms down, and raise the weight by extending your wrists. Works the forearm extensors.'),
  ('Reverse Barbell Curl', 'forearms', 'isolation', 105, 3.5, 'Barbell', false, 'Curl a barbell with an overhand (palms-down) grip. Targets the brachioradialis and forearms.'),
  ('Plate Pinch', 'forearms', 'isolation', 110, 3.0, 'Plate', false, 'Pinch a weight plate between your fingers and thumb and hold for time. Builds grip strength.'),

  -- Legs
  ('Front Squat', 'legs', 'compound', 100, 6.0, 'Barbell', false, 'Rest the barbell across your front delts, keep your torso upright, and squat down. Emphasizes the quads.'),
  ('Hack Squat', 'legs', 'compound', 105, 6.0, 'Machine', false, 'On the hack squat machine, lower under control and drive back up through your heels. A quad-focused squat.'),
  ('Bulgarian Split Squat', 'legs', 'compound', 110, 6.0, 'Dumbbell', false, 'With your rear foot elevated on a bench, lower into a lunge on the front leg, then drive up. Works quads and glutes one leg at a time.'),
  ('Walking Lunge', 'legs', 'compound', 115, 6.0, 'Dumbbell', false, 'Step forward into a lunge, then bring the back leg through into the next lunge, walking forward. Works the whole lower body.'),
  ('Leg Extension', 'legs', 'isolation', 120, 3.5, 'Machine', false, 'Sit at the machine and extend your knees to raise the pad, squeezing your quads at the top.'),
  ('Goblet Squat', 'legs', 'compound', 125, 5.5, 'Dumbbell', false, 'Hold a dumbbell at your chest and squat down between your knees. A beginner-friendly squat.'),
  ('Hip Thrust', 'legs', 'compound', 130, 5.0, 'Barbell', false, 'With your upper back on a bench and a barbell over your hips, drive your hips up until your body is level. Builds the glutes.'),
  ('Seated Calf Raise', 'legs', 'isolation', 135, 3.0, 'Machine', false, 'Sit with the pad on your knees and raise your heels by pushing through the balls of your feet. Targets the soleus.'),
  ('Step-Up', 'legs', 'compound', 140, 5.5, 'Dumbbell', false, 'Step up onto a box with one leg, driving through the heel, then step down. Works quads and glutes.'),
  ('Good Morning', 'legs', 'compound', 145, 5.0, 'Barbell', false, 'With a barbell on your back, hinge at the hips with a flat back until your torso is near parallel, then return. Works hamstrings and lower back.'),

  -- Core
  ('Bicycle Crunch', 'core', 'isolation', 100, 4.0, 'Bodyweight', false, 'Lying on your back, alternate bringing each elbow to the opposite knee in a pedaling motion. Works the abs and obliques.'),
  ('Sit-Up', 'core', 'isolation', 105, 4.0, 'Bodyweight', false, 'Lie down with knees bent and raise your torso all the way up to your knees, then lower under control.'),
  ('Ab Wheel Rollout', 'core', 'isolation', 110, 4.5, 'Ab Wheel', false, 'Kneel holding an ab wheel and roll it forward, extending your body, then pull back in. A demanding core exercise.'),
  ('Mountain Climbers', 'core', 'isolation', 115, 8.0, 'Bodyweight', false, 'From a plank, rapidly drive your knees toward your chest one at a time. Works the core and raises the heart rate.'),
  ('Side Plank', 'core', 'isolation', 120, 3.5, 'Bodyweight', false, 'Balance on one forearm and the side of your foot, keeping your body in a straight line. Targets the obliques.'),
  ('Lying Leg Raise', 'core', 'isolation', 125, 4.0, 'Bodyweight', false, 'Lie flat and raise your straight legs to vertical, then lower slowly without touching the floor. Works the lower abs.'),
  ('Cable Woodchopper', 'core', 'isolation', 130, 4.0, 'Cable', false, 'Pull a high cable down and across your body in a chopping motion, rotating through your core. Works the obliques.'),

  -- Full body
  ('Kettlebell Swing', 'full_body', 'compound', 100, 9.5, 'Kettlebell', false, 'Hinge at the hips and swing a kettlebell to chest height using a powerful hip drive. A full-body conditioning and posterior-chain move.'),
  ('Clean and Press', 'full_body', 'compound', 105, 8.0, 'Barbell', false, 'Pull a barbell from the floor to your shoulders, then press it overhead in one sequence. A full-body power movement.'),
  ('Thruster', 'full_body', 'compound', 110, 8.0, 'Barbell', false, 'From a front squat, drive up and press the barbell overhead in one motion. Works the whole body.'),
  ('Turkish Get-Up', 'full_body', 'compound', 115, 6.0, 'Kettlebell', false, 'From lying, stand up while holding a weight overhead, then reverse the steps. Builds full-body stability.'),

  -- Cardio
  ('Battle Ropes', 'cardio', 'cardio', 100, 9.0, 'Battle Rope', false, 'Whip heavy ropes in alternating waves. A high-intensity cardio and conditioning exercise.'),
  ('Sled Push', 'cardio', 'cardio', 110, 9.5, 'Sled', false, 'Drive a weighted sled forward with short, powerful steps. A conditioning exercise that also works the legs.'),
  ('High Knees', 'cardio', 'cardio', 120, 8.0, 'Bodyweight', false, 'Run in place driving your knees up to hip height as fast as you can. A quick cardio burst.'),
  ('Assault Bike', 'cardio', 'cardio', 130, 9.0, 'Air Bike', false, 'Pedal and push/pull the handles on an air bike. A full-body, high-intensity cardio machine.'),
  ('Incline Walk', 'cardio', 'cardio', 140, 6.0, 'Treadmill', false, 'Walk at a brisk pace on a steep treadmill incline. Low-impact steady-state cardio.')
on conflict (name) where user_id is null do update set
  muscle_group = excluded.muscle_group,
  category = excluded.category,
  sort_order = excluded.sort_order,
  met_value = excluded.met_value,
  equipment = excluded.equipment,
  instructions = excluded.instructions;
