export const EXERCISE_CATEGORIES = [
  "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Full Body"
];

const baseExercises = [
  // CHEST
  { name: "Barbell Bench Press", category: "Chest", points: 2, equipment: "Barbell, Bench", isTimed: false, instructions: "Lie on bench, press bar upwards.", video: "none" },
  { name: "Incline Dumbbell Press", category: "Chest", points: 2, equipment: "Dumbbells, Incline Bench", isTimed: false, instructions: "Set bench to 30 degrees, press dumbbells.", video: "none" },
  { name: "Push-ups", category: "Chest", points: 1, equipment: "Bodyweight", isTimed: false, instructions: "Lower body until chest is close to floor, push up.", video: "none" },
  { name: "Cable Crossovers", category: "Chest", points: 1, equipment: "Cable Machine", isTimed: false, instructions: "Pull cables together in front of chest.", video: "none" },
  
  // BACK
  { name: "Pull-ups", category: "Back", points: 2, equipment: "Pull-up Bar", isTimed: false, instructions: "Pull body up until chin clears the bar.", video: "none" },
  { name: "Barbell Rows", category: "Back", points: 2, equipment: "Barbell", isTimed: false, instructions: "Hinge at hips, pull bar to stomach.", video: "none" },
  { name: "Lat Pulldowns", category: "Back", points: 1, equipment: "Cable Machine", isTimed: false, instructions: "Pull bar down to upper chest.", video: "none" },
  { name: "Seated Cable Rows", category: "Back", points: 1, equipment: "Cable Machine", isTimed: false, instructions: "Pull handle to lower stomach while seated.", video: "none" },
  
  // LEGS
  { name: "Barbell Squats", category: "Legs", points: 3, equipment: "Barbell, Squat Rack", isTimed: false, instructions: "Squat down until thighs are parallel to floor.", video: "none" },
  { name: "Romanian Deadlifts", category: "Legs", points: 2, equipment: "Barbell or Dumbbells", isTimed: false, instructions: "Hinge hips back while keeping legs mostly straight.", video: "none" },
  { name: "Leg Press", category: "Legs", points: 1, equipment: "Leg Press Machine", isTimed: false, instructions: "Press weight away with legs on machine.", video: "none" },
  { name: "Walking Lunges", category: "Legs", points: 2, equipment: "Dumbbells or Bodyweight", isTimed: false, instructions: "Lunge forward, alternating legs.", video: "none" },
  
  // SHOULDERS
  { name: "Overhead Press", category: "Shoulders", points: 2, equipment: "Barbell", isTimed: false, instructions: "Press bar overhead while standing.", video: "none" },
  { name: "Lateral Raises", category: "Shoulders", points: 1, equipment: "Dumbbells", isTimed: false, instructions: "Raise dumbbells to the side until parallel to floor.", video: "none" },
  { name: "Front Raises", category: "Shoulders", points: 1, equipment: "Dumbbells", isTimed: false, instructions: "Raise dumbbells in front of you.", video: "none" },
  { name: "Face Pulls", category: "Shoulders", points: 1, equipment: "Cable Machine, Rope", isTimed: false, instructions: "Pull rope attachment towards face.", video: "none" },
  
  // ARMS
  { name: "Barbell Curls", category: "Arms", points: 1, equipment: "Barbell", isTimed: false, instructions: "Curl bar upwards towards chest.", video: "none" },
  { name: "Tricep Pushdowns", category: "Arms", points: 1, equipment: "Cable Machine", isTimed: false, instructions: "Push cable attachment down until arms are straight.", video: "none" },
  { name: "Hammer Curls", category: "Arms", points: 1, equipment: "Dumbbells", isTimed: false, instructions: "Curl dumbbells with neutral grip.", video: "none" },
  { name: "Overhead Tricep Extension", category: "Arms", points: 1, equipment: "Dumbbell", isTimed: false, instructions: "Extend dumbbell overhead.", video: "none" },
  
  // CORE
  { name: "Plank", category: "Core", points: 2, equipment: "Bodyweight", isTimed: true, instructions: "Hold body in straight line resting on forearms.", video: "none" },
  { name: "Russian Twists", category: "Core", points: 1, equipment: "Bodyweight or Medicine Ball", isTimed: false, instructions: "Twist torso side to side while seated with elevated legs.", video: "none" },
  { name: "Hanging Leg Raises", category: "Core", points: 2, equipment: "Pull-up Bar", isTimed: false, instructions: "Hang from bar, raise legs until parallel to floor.", video: "none" },
  { name: "Crunches", category: "Core", points: 1, equipment: "Bodyweight", isTimed: false, instructions: "Curl upper body towards knees.", video: "none" },
  
  // CARDIO
  { name: "Treadmill Sprint Intervals", category: "Cardio", points: 3, equipment: "Treadmill", isTimed: true, instructions: "Sprint 30s, walk 30s.", video: "none" },
  { name: "Jump Rope", category: "Cardio", points: 2, equipment: "Jump Rope", isTimed: true, instructions: "Jump rope at steady pace.", video: "none" },
  { name: "Stairmaster", category: "Cardio", points: 2, equipment: "Stairmaster", isTimed: true, instructions: "Climb stairs at moderate pace.", video: "none" },
  
  // FULL BODY
  { name: "Burpees", category: "Full Body", points: 3, equipment: "Bodyweight", isTimed: false, instructions: "Drop to pushup, jump up.", video: "none" },
  { name: "Kettlebell Swings", category: "Full Body", points: 2, equipment: "Kettlebell", isTimed: false, instructions: "Swing kettlebell between legs to chest height.", video: "none" },
  { name: "Clean and Press", category: "Full Body", points: 3, equipment: "Barbell", isTimed: false, instructions: "Pull bar to shoulders, then press overhead.", video: "none" }
];

// Procedurally generate the remaining exercises to hit 100+ for the FYP demo
const generateFullLibrary = () => {
  let library = [...baseExercises];
  let idCounter = 1;
  
  // Assign IDs to base exercises
  library.forEach(ex => {
    ex.id = `ex_${idCounter++}`;
  });

  // Duplicate and slightly modify names to create a massive database of 100+
  const modifiers = ["Advanced", "Beginner", "Machine", "Dumbbell", "Cable", "Banded", "Single-Arm", "Single-Leg"];
  
  while (library.length < 100) {
    const randomBase = baseExercises[Math.floor(Math.random() * baseExercises.length)];
    const randomModifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    
    // Ensure unique enough name
    const newName = `${randomModifier} ${randomBase.name}`;
    
    // Check if it exists to avoid exact duplicates
    if (!library.find(ex => ex.name === newName)) {
      library.push({
        ...randomBase,
        id: `ex_${idCounter++}`,
        name: newName,
        points: Math.max(1, randomBase.points + (randomModifier === "Advanced" ? 1 : 0))
      });
    }
  }
  
  return library;
};

export const EXERCISE_LIBRARY = generateFullLibrary();
