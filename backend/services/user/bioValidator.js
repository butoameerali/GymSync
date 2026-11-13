/**
 * Bio Data Validation Helper
 * Ensures required user physiological and training baseline data is complete.
 */

export function isBioComplete(user) {
  if (!user) return false;
  
  // Support both full User object (with bioData subdocument) or direct bioData object
  const bio = user.bioData || user;
  if (!bio || typeof bio !== 'object') return false;

  // 1. Height (positive number)
  const height = Number(bio.height);
  if (!height || isNaN(height) || height <= 0) return false;

  // 2. Weight (positive number)
  const weight = Number(bio.weight);
  if (!weight || isNaN(weight) || weight <= 0) return false;

  // 3. DOB or Age (valid non-empty string or positive number)
  const hasDob = typeof bio.dob === 'string' && bio.dob.trim().length > 0;
  const age = Number(bio.age);
  const hasAge = !isNaN(age) && age > 0;
  if (!hasDob && !hasAge) return false;

  // 4. Gender (non-empty string)
  const gender = bio.gender;
  if (!gender || typeof gender !== 'string' || gender.trim().length === 0) return false;

  // 5. Fitness Level (non-empty string)
  const fitnessLevel = bio.fitnessLevel;
  if (!fitnessLevel || typeof fitnessLevel !== 'string' || fitnessLevel.trim().length === 0) return false;

  // 6. Equipment Access (non-empty string or non-empty array)
  const equipmentAccess = bio.equipmentAccess;
  if (!equipmentAccess) return false;
  if (Array.isArray(equipmentAccess)) {
    if (equipmentAccess.length === 0) return false;
  } else if (typeof equipmentAccess === 'string') {
    if (equipmentAccess.trim().length === 0) return false;
  } else {
    return false;
  }

  // 7. Training Days Per Week (positive number >= 1)
  const trainingDays = Number(bio.trainingDaysPerWeek);
  if (!trainingDays || isNaN(trainingDays) || trainingDays <= 0) return false;

  return true;
}

export default { isBioComplete };
