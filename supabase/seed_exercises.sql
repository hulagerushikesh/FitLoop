-- FitLoop exercise library seed. Run once in the SQL Editor, after
-- migrations/0002_workouts_nutrition_v2.sql and 0003_workout_plans_v3.sql.
-- Safe to re-run (upserts by name via the exercises_library_name_idx
-- partial unique index).
--
-- sort_order groups compound movements before isolation movements within
-- each muscle group. met_value is approximate (Compendium of Physical
-- Activities), used for calorie-burn estimation. instructions is shown
-- on the exercise detail screen alongside a "watch tutorial" video
-- search link built from the exercise name.

insert into public.exercises (name, muscle_group, category, sort_order, met_value, equipment, is_custom, instructions)
values
  -- Chest
  ('Barbell Bench Press', 'chest', 'compound', 10, 6.0, 'Barbell', false,
    'Lie on a flat bench, grip the bar slightly wider than shoulder-width, lower it to your mid-chest, then press up until arms are extended. Primarily targets the chest, with triceps and front shoulders assisting.'),
  ('Push-Up', 'chest', 'compound', 15, 8.0, 'Bodyweight', false,
    'Start in a plank position with hands under shoulders, lower your chest to the floor keeping your body straight, then push back up. Works the chest, triceps, and shoulders.'),
  ('Incline Dumbbell Press', 'chest', 'compound', 20, 6.0, 'Dumbbell', false,
    'On a bench set to 30-45 degrees, press dumbbells from shoulder height straight up. Emphasizes the upper chest more than a flat press.'),
  ('Decline Bench Press', 'chest', 'compound', 25, 6.0, 'Barbell', false,
    'On a decline bench, lower the bar to your lower chest and press back up. Emphasizes the lower chest.'),
  ('Cable Fly', 'chest', 'isolation', 60, 3.5, 'Cable', false,
    'Stand between two cable stacks with arms slightly bent, and bring the handles together in front of your chest in a hugging motion. Isolates the chest.'),
  ('Cable Crossover', 'chest', 'isolation', 65, 3.5, 'Cable', false,
    'From a high pulley, pull the handles down and across your body, finishing at hip height. Emphasizes the lower and inner chest.'),

  -- Back
  ('Deadlift', 'back', 'compound', 10, 6.0, 'Barbell', false,
    'Stand with feet hip-width, grip the bar outside your knees, keep your back flat, and lift by driving through your heels until standing tall. Works the entire posterior chain, especially the back.'),
  ('Pull-Up', 'back', 'compound', 20, 8.0, 'Bodyweight', false,
    'Hang from a bar with an overhand grip, pull your chest toward the bar, then lower with control. Targets the lats and biceps.'),
  ('Barbell Row', 'back', 'compound', 30, 6.0, 'Barbell', false,
    'Hinge at the hips with a flat back, pull the bar to your lower ribs, then lower with control. Builds mid-back thickness.'),
  ('T-Bar Row', 'back', 'compound', 35, 6.0, 'Barbell', false,
    'Straddle the bar (or a landmine attachment), hinge forward, and row the weight to your chest. Builds back thickness similar to a barbell row.'),
  ('Lat Pulldown', 'back', 'compound', 40, 5.0, 'Cable', false,
    'Sit at a pulldown machine, grip the bar wide, and pull it down to your upper chest while keeping your torso upright. Targets the lats.'),
  ('Seated Cable Row', 'back', 'compound', 50, 5.0, 'Cable', false,
    'Sit with knees slightly bent, pull the handle to your torso while squeezing your shoulder blades together. Works the mid-back.'),
  ('Face Pull', 'back', 'isolation', 55, 3.5, 'Cable', false,
    'Pull a rope attachment toward your face, flaring your elbows out and squeezing your rear shoulders. Targets the rear delts and upper back.'),
  ('Straight-Arm Pulldown', 'back', 'isolation', 70, 3.5, 'Cable', false,
    'With arms straight, pull a cable bar down from overhead to your thighs, hinging slightly at the shoulders. Isolates the lats.'),
  ('Shrugs', 'back', 'isolation', 90, 3.5, 'Dumbbell', false,
    'Hold weights at your sides and lift your shoulders straight up toward your ears, then lower with control. Targets the traps.'),

  -- Shoulders
  ('Overhead Press', 'shoulders', 'compound', 30, 6.0, 'Barbell', false,
    'Press a barbell from shoulder height straight overhead until arms are locked out, keeping your core tight. Targets the front and side shoulders.'),
  ('Dumbbell Shoulder Press', 'shoulders', 'compound', 40, 5.5, 'Dumbbell', false,
    'Press dumbbells from shoulder height overhead, allowing a natural arc. Works all three heads of the shoulder.'),
  ('Arnold Press', 'shoulders', 'compound', 45, 5.5, 'Dumbbell', false,
    'Start with palms facing you at shoulder height, rotate and press overhead so palms face forward at the top. Hits all three deltoid heads with extra rotational work.'),
  ('Upright Row', 'shoulders', 'isolation', 55, 4.0, 'Barbell', false,
    'Pull a barbell or dumbbells straight up along your body to chest height, leading with your elbows. Works the side delts and traps.'),
  ('Lateral Raise', 'shoulders', 'isolation', 65, 3.5, 'Dumbbell', false,
    'Raise dumbbells out to your sides until arms are parallel to the floor, then lower with control. Isolates the side delts for shoulder width.'),

  -- Forearms
  ('Farmer''s Carry', 'forearms', 'compound', 5, 6.0, 'Dumbbell', false,
    'Hold a heavy dumbbell or kettlebell in each hand and walk for distance or time, keeping your grip tight and posture upright. Builds grip and forearm endurance along with core stability.'),
  ('Wrist Curl', 'forearms', 'isolation', 10, 3.0, 'Dumbbell', false,
    'Rest your forearm on a bench with palm up, curl the weight using only your wrist, then lower with control. Targets the forearm flexors.'),
  ('Reverse Wrist Curl', 'forearms', 'isolation', 20, 3.0, 'Dumbbell', false,
    'Same setup as a wrist curl but with your palm facing down, extending the wrist upward. Targets the forearm extensors.'),

  -- Arms (biceps/triceps)
  ('Dips', 'arms', 'compound', 45, 6.0, 'Bodyweight', false,
    'Support yourself on parallel bars and lower your body by bending your elbows, then press back up. Primarily targets the triceps, with the chest assisting.'),
  ('Skull Crushers', 'arms', 'isolation', 65, 3.5, 'Barbell', false,
    'Lying on a bench, lower a barbell or EZ-bar toward your forehead by bending only your elbows, then extend back up. Isolates the triceps.'),
  ('Triceps Pushdown', 'arms', 'isolation', 70, 3.5, 'Cable', false,
    'Using a cable machine, push a bar or rope down until your arms are fully extended, keeping elbows pinned to your sides. Isolates the triceps.'),
  ('Overhead Triceps Extension', 'arms', 'isolation', 75, 3.5, 'Dumbbell', false,
    'Hold a dumbbell overhead with both hands and lower it behind your head by bending the elbows, then extend back up. Targets the long head of the triceps.'),
  ('Barbell Curl', 'arms', 'isolation', 80, 3.5, 'Barbell', false,
    'Curl a barbell from your thighs to your shoulders, keeping your elbows fixed at your sides. Targets the biceps.'),
  ('Dumbbell Hammer Curl', 'arms', 'isolation', 85, 3.5, 'Dumbbell', false,
    'Curl dumbbells with your palms facing each other throughout the movement. Targets the biceps and forearms.'),
  ('Preacher Curl', 'arms', 'isolation', 90, 3.5, 'Barbell', false,
    'With your upper arm braced against a preacher bench, curl the weight up and lower slowly. Isolates the biceps with strict form.'),
  ('Cable Curl', 'arms', 'isolation', 95, 3.5, 'Cable', false,
    'Curl a cable bar from a low pulley, keeping constant tension through the movement. Targets the biceps.'),

  -- Legs
  ('Barbell Back Squat', 'legs', 'compound', 10, 6.0, 'Barbell', false,
    'With the bar across your upper back, squat down until your thighs are at least parallel to the floor, then drive back up. The primary compound lift for the quads and glutes.'),
  ('Romanian Deadlift', 'legs', 'compound', 20, 6.0, 'Barbell', false,
    'With a slight knee bend, hinge at the hips and lower the bar along your legs until you feel a hamstring stretch, then return to standing. Targets the hamstrings and glutes.'),
  ('Hip Thrust', 'legs', 'compound', 25, 5.0, 'Barbell', false,
    'With your upper back on a bench and a barbell across your hips, drive your hips up until your body forms a straight line, then lower. Isolates the glutes.'),
  ('Leg Press', 'legs', 'compound', 30, 5.0, 'Machine', false,
    'Sit in the leg press machine and push the platform away by extending your legs, then lower with control. Targets the quads and glutes.'),
  ('Bulgarian Split Squat', 'legs', 'compound', 35, 5.5, 'Dumbbell', false,
    'With your rear foot elevated behind you on a bench, lower into a single-leg squat on the front leg. Builds unilateral quad and glute strength.'),
  ('Walking Lunge', 'legs', 'compound', 40, 5.0, 'Dumbbell', false,
    'Step forward into a lunge, lowering your back knee toward the floor, then push off into the next step. Works the quads, glutes, and balance.'),
  ('Leg Curl', 'legs', 'isolation', 50, 3.5, 'Machine', false,
    'Lying or seated on a machine, curl the pad toward your glutes by bending your knees. Isolates the hamstrings.'),
  ('Leg Extension', 'legs', 'isolation', 60, 3.5, 'Machine', false,
    'Seated on a machine, extend your knees to lift the pad until your legs are straight. Isolates the quads.'),
  ('Hip Abduction', 'legs', 'isolation', 65, 3.0, 'Machine', false,
    'Seated on a machine, push your legs outward against resistance. Targets the outer glutes and hips.'),
  ('Calf Raise', 'legs', 'isolation', 70, 3.5, 'Machine', false,
    'Rise up onto your toes as high as possible, then lower your heels below the platform for a full stretch. Isolates the calves.'),

  -- Core
  ('Ab Wheel Rollout', 'core', 'compound', 5, 5.0, 'Ab Wheel', false,
    'Kneeling, roll a wheel forward as far as you can control while keeping your core braced, then pull back. A challenging full-core exercise.'),
  ('Plank', 'core', 'isolation', 10, 3.8, 'Bodyweight', false,
    'Hold a push-up position on your forearms with your body in a straight line from head to heels. Builds core and shoulder stability.'),
  ('Hanging Leg Raise', 'core', 'isolation', 20, 4.0, 'Bodyweight', false,
    'Hang from a bar and raise your legs until parallel to the floor (or higher), then lower with control. Targets the lower abs.'),
  ('Cable Crunch', 'core', 'isolation', 30, 3.8, 'Cable', false,
    'Kneel below a cable pulley, hold the rope at your head, and crunch down by contracting your abs. Isolates the abs with added resistance.'),
  ('Bicycle Crunch', 'core', 'isolation', 35, 4.5, 'Bodyweight', false,
    'Lying on your back, alternate bringing opposite elbow to knee in a pedaling motion. Targets the abs and obliques.'),
  ('Russian Twist', 'core', 'isolation', 40, 4.0, 'Bodyweight', false,
    'Sit with knees bent and lean back slightly, rotating a weight or your hands from side to side. Targets the obliques.'),

  -- Full body / cardio
  ('Kettlebell Swing', 'full_body', 'compound', 10, 9.8, 'Kettlebell', false,
    'Hinge at the hips and swing a kettlebell between your legs, then drive your hips forward to swing it to chest height. An explosive full-body and posterior-chain movement.'),
  ('Burpees', 'full_body', 'compound', 20, 8.0, 'Bodyweight', false,
    'From standing, drop into a squat, kick your feet back into a plank, do a push-up, jump your feet back in, then explode up into a jump. A full-body conditioning exercise.'),
  ('Treadmill Running', 'cardio', 'cardio', 10, 9.8, 'Treadmill', false,
    'Run at a steady pace on the treadmill. Primarily a cardiovascular exercise that also works the legs.'),
  ('Cycling', 'cardio', 'cardio', 20, 7.5, 'Stationary Bike', false,
    'Pedal at a steady resistance and cadence. A low-impact cardio exercise that also works the quads.'),
  ('Rowing Machine', 'cardio', 'cardio', 30, 7.0, 'Rowing Machine', false,
    'Drive with your legs, then pull the handle to your chest, extending through your hips and arms. A full-body cardio exercise.'),
  ('Jump Rope', 'cardio', 'cardio', 40, 11.0, 'Jump Rope', false,
    'Jump rhythmically over a rope, staying light on your feet. A high-intensity cardio exercise that also builds calf endurance.'),
  ('Stair Climber', 'cardio', 'cardio', 50, 8.0, 'Stair Climber', false,
    'Step continuously on a stair-climbing machine. A cardio exercise that also targets the glutes and quads.'),
  ('Elliptical', 'cardio', 'cardio', 60, 5.0, 'Elliptical', false,
    'Move in a smooth elliptical motion on the machine. A low-impact cardio exercise.')
on conflict (name) where user_id is null do update set
  muscle_group = excluded.muscle_group,
  category = excluded.category,
  sort_order = excluded.sort_order,
  met_value = excluded.met_value,
  equipment = excluded.equipment,
  instructions = excluded.instructions;
