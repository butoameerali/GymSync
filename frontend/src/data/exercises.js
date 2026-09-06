export const EXERCISE_CATEGORIES = [
  "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Full Body"
];

export const EXERCISE_LIBRARY = [
  // CHEST
  { id: "ex_1", name: "Barbell Bench Press", category: "Chest", points: 2, equipment: "Barbell, Bench", isTimed: false, instructions: "Lie flat on the bench with eyes under the bar. Grip bar slightly wider than shoulder width. Lower bar smoothly to mid-chest, then press forcefully back to arms extended.", video: "none" },
  { id: "ex_2", name: "Incline Dumbbell Press", category: "Chest", points: 2, equipment: "Dumbbells, Incline Bench", isTimed: false, instructions: "Set bench to 30 degrees. Press dumbbells upwards in an arc, focusing on upper chest contraction.", video: "none" },
  { id: "ex_3", name: "Push-ups", category: "Chest", points: 1, equipment: "Bodyweight", isTimed: false, isAiTrackable: true, aiDetection: { enabled: true, detectorId: "pushup_v1", detectorVersion: "1.0" }, instructions: "Maintain a rigid plank posture. Lower body until elbows reach 90 degrees, then press back up.", video: "none" },
  { id: "ex_4", name: "Cable Chest Flyes", category: "Chest", points: 1, equipment: "Cable Machine", isTimed: false, instructions: "Bring cables together in a hugging motion, squeezing pecs at peak contraction.", video: "none" },
  { id: "ex_5", name: "Parallel Bar Dips", category: "Chest", points: 2, equipment: "Dip Station", isTimed: false, instructions: "Lean torso slightly forward. Lower until shoulders are below elbows, then press up to lockout.", video: "none" },
  { id: "ex_6", name: "Decline Bench Press", category: "Chest", points: 2, equipment: "Barbell, Decline Bench", isTimed: false, instructions: "Lie on decline bench, unrack barbell, lower to lower chest line and press up smoothly.", video: "none" },

  // BACK
  { id: "ex_7", name: "Pull-ups", category: "Back", points: 2, equipment: "Pull-up Bar", isTimed: false, instructions: "Grip bar overhand wider than shoulders. Pull chest towards the bar until chin clears bar.", video: "none" },
  { id: "ex_8", name: "Barbell Bent-Over Rows", category: "Back", points: 2, equipment: "Barbell", isTimed: false, instructions: "Hinge at hips with flat back. Pull bar towards lower ribcage, driving elbows back.", video: "none" },
  { id: "ex_9", name: "Lat Pulldowns", category: "Back", points: 1, equipment: "Cable Machine", isTimed: false, instructions: "Sit upright, pull wide bar down to upper chest, engaging lats and squeezing shoulder blades.", video: "none" },
  { id: "ex_10", name: "Seated Cable Rows", category: "Back", points: 1, equipment: "Cable Machine", isTimed: false, instructions: "Pull handle to navel with a neutral spine. Retract scapulae and release under control.", video: "none" },
  { id: "ex_11", name: "Deadlift", category: "Back", points: 3, equipment: "Barbell, Plates", isTimed: false, instructions: "Stand with mid-foot under bar. Hinge, grip bar, set back straight, drive feet into floor to stand tall.", video: "none" },
  { id: "ex_12", name: "Single-Arm Dumbbell Row", category: "Back", points: 2, equipment: "Dumbbell, Bench", isTimed: false, instructions: "Rest one knee on bench. Row dumbbell up toward hip, keeping elbow close to torso.", video: "none" },

  // LEGS
  { id: "ex_13", name: "Barbell Back Squats", category: "Legs", points: 3, equipment: "Barbell, Squat Rack", isTimed: false, instructions: "Rest bar across upper traps. Break at hips and knees, descend until thighs parallel floor, drive up.", video: "none" },
  { id: "ex_14", name: "Romanian Deadlifts", category: "Legs", points: 2, equipment: "Barbell or Dumbbells", isTimed: false, instructions: "Hinge hips backward with soft knees. Lower bar along shins until hamstrings stretch, return.", video: "none" },
  { id: "ex_15", name: "Leg Press", category: "Legs", points: 1, equipment: "Leg Press Machine", isTimed: false, instructions: "Place feet shoulder-width on sled. Lower weight to 90 degrees knee bend, press back without locking knees.", video: "none" },
  { id: "ex_16", name: "Walking Lunges", category: "Legs", points: 2, equipment: "Dumbbells or Bodyweight", isTimed: false, instructions: "Step forward into a deep lunge, back knee hovering above ground. Alternate steps smoothly.", video: "none" },
  { id: "ex_17", name: "Leg Extensions", category: "Legs", points: 1, equipment: "Leg Extension Machine", isTimed: false, instructions: "Extend legs fully against pad to contract quadriceps. Pause briefly at the top.", video: "none" },
  { id: "ex_18", name: "Lying Leg Curls", category: "Legs", points: 1, equipment: "Leg Curl Machine", isTimed: false, instructions: "Curl heels toward glutes against pad resistance, squeezing hamstrings at peak.", video: "none" },
  { id: "ex_19", name: "Standing Calf Raises", category: "Legs", points: 1, equipment: "Calf Machine or Step", isTimed: false, instructions: "Elevate onto balls of feet, squeeze calves at full plantar flexion, lower for deep stretch.", video: "none" },

  // SHOULDERS
  { id: "ex_20", name: "Overhead Barbell Press", category: "Shoulders", points: 2, equipment: "Barbell", isTimed: false, instructions: "Press bar overhead from collarbones, locking out with head through the window.", video: "none" },
  { id: "ex_21", name: "Dumbbell Lateral Raises", category: "Shoulders", points: 1, equipment: "Dumbbells", isTimed: false, instructions: "Raise dumbbells laterally with slight elbow bend until parallel to floor. Control descent.", video: "none" },
  { id: "ex_22", name: "Face Pulls", category: "Shoulders", points: 1, equipment: "Cable Machine, Rope", isTimed: false, instructions: "Pull rope attachment to eye level while externally rotating shoulders.", video: "none" },
  { id: "ex_23", name: "Arnold Press", category: "Shoulders", points: 2, equipment: "Dumbbells", isTimed: false, instructions: "Start with dumbbells at chin level, palms facing you. Rotate outward as you press overhead.", video: "none" },
  { id: "ex_24", name: "Reverse Pec Deck Flyes", category: "Shoulders", points: 1, equipment: "Pec Deck Machine", isTimed: false, instructions: "Isolate rear deltoids by pulling machine arms outward and backward.", video: "none" },

  // ARMS
  { id: "ex_25", name: "Barbell Bicep Curls", category: "Arms", points: 1, equipment: "Barbell", isTimed: false, instructions: "Hold bar with underhand grip. Curl weight upward without swinging hips or elbows.", video: "none" },
  { id: "ex_26", name: "Tricep Rope Pushdowns", category: "Arms", points: 1, equipment: "Cable Machine, Rope", isTimed: false, instructions: "Push rope downward, spreading ends apart at bottom for complete tricep lockout.", video: "none" },
  { id: "ex_27", name: "Incline Dumbbell Curls", category: "Arms", points: 1, equipment: "Dumbbells, Incline Bench", isTimed: false, instructions: "Lie on incline bench for maximum bicep stretch. Curl dumbbells with full range.", video: "none" },
  { id: "ex_28", name: "Skull Crushers", category: "Arms", points: 2, equipment: "EZ Bar, Flat Bench", isTimed: false, instructions: "Lower EZ bar toward forehead bending at elbows only. Press back to vertical lockout.", video: "none" },
  { id: "ex_29", name: "Hammer Curls", category: "Arms", points: 1, equipment: "Dumbbells", isTimed: false, instructions: "Curl dumbbells with palms facing each other to target brachialis and forearms.", video: "none" },

  // CORE
  { id: "ex_30", name: "Forearm Plank", category: "Core", points: 2, equipment: "Bodyweight", isTimed: true, instructions: "Hold straight body line resting on forearms and toes. Brace core and glutes tightly.", video: "none" },
  { id: "ex_31", name: "Hanging Leg Raises", category: "Core", points: 2, equipment: "Pull-up Bar", isTimed: false, instructions: "Hang from bar without swinging. Flex hips and curl pelvis up until thighs are parallel to ground.", video: "none" },
  { id: "ex_32", name: "Russian Twists", category: "Core", points: 1, equipment: "Bodyweight or Medicine Ball", isTimed: false, instructions: "Sit on floor with knees bent and feet elevated. Rotate torso smoothly side to side.", video: "none" },
  { id: "ex_33", name: "Ab Wheel Rollouts", category: "Core", points: 2, equipment: "Ab Wheel", isTimed: false, instructions: "Kneel on floor, roll wheel forward keeping core hollow, pull back using abs.", video: "none" },

  // CARDIO
  { id: "ex_34", name: "Outdoor Running (GPS)", category: "Cardio", points: 3, equipment: "Running Shoes, GPS", isTimed: true, isAiTrackable: true, aiDetection: { enabled: true, detectorId: "running_v1", detectorVersion: "1.0" }, instructions: "Maintain upright posture, mid-foot strike, and relaxed cadence. GPS tracks route and distance.", video: "none" },
  { id: "ex_35", name: "Treadmill High-Intensity Intervals", category: "Cardio", points: 3, equipment: "Treadmill", isTimed: true, instructions: "Alternate 30 seconds sprint with 30 seconds recovery walk for target rounds.", video: "none" },
  { id: "ex_36", name: "Jump Rope Conditioning", category: "Cardio", points: 2, equipment: "Jump Rope", isTimed: true, instructions: "Stay on balls of feet, turn rope using wrist movement, maintain consistent breathing rhythm.", video: "none" },
  { id: "ex_37", name: "Rowing Machine Intervals", category: "Cardio", points: 2, equipment: "Rowing Machine", isTimed: true, instructions: "Drive through heels, open hips, finish stroke with arms. Reverse motion under control.", video: "none" },

  // FULL BODY
  { id: "ex_38", name: "Burpees", category: "Full Body", points: 3, equipment: "Bodyweight", isTimed: false, instructions: "Drop into plank, perform push-up, jump feet in, and jump vertically with hands overhead.", video: "none" },
  { id: "ex_39", name: "Kettlebell Swings", category: "Full Body", points: 2, equipment: "Kettlebell", isTimed: false, instructions: "Hinge at hips, propel kettlebell forward to chest height using glute and hamstring snap.", video: "none" },
  { id: "ex_40", name: "Barbell Clean and Press", category: "Full Body", points: 3, equipment: "Barbell", isTimed: false, instructions: "Pull bar powerfully from floor to shoulders, catch in front rack, and press directly overhead.", video: "none" }
];
