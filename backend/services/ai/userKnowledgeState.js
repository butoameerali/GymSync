/**
 * Single source of truth for "what do we already know about this user"
 * across every AI entry point (mini-coach, diet swap, trainer escalation).
 * Every new required field added anywhere in the app MUST be registered here,
 * not re-implemented inline — see Part 6 of the master guide.
 */

const REQUIRED_FIELD_REGISTRY = [
  { key: 'height', path: 'bioData.height', isFilled: v => v && v > 0 },
  { key: 'weight', path: 'bioData.weight', isFilled: v => v && v > 0 },
  { key: 'gender', path: 'bioData.gender', isFilled: v => !!v },
  { key: 'jointPain', path: 'bioData.jointPain', isFilled: v => Array.isArray(v) && v.length > 0 },
  { key: 'medicalConditions', path: 'bioData.medicalConditions', isFilled: v => Array.isArray(v) && v.length > 0 },
  { key: 'injuries', path: 'bioData.injuries', isFilled: v => Array.isArray(v) && v.length > 0 },
  { key: 'limitations', path: 'bioData.limitations', isFilled: v => Array.isArray(v) && v.length > 0 },
  { key: 'foodPreferences', path: 'bioData.foodPreferences', isFilled: v => typeof v === 'string' && v.trim() !== '' },
  { key: 'trainingDaysPerWeek', path: 'bioData.trainingDaysPerWeek', isFilled: v => v > 0 },
  { key: 'equipmentAccess', path: 'bioData.equipmentAccess', isFilled: v => !!v }
];

export function getMissingFields(userDoc, requiredKeys) {
  return REQUIRED_FIELD_REGISTRY
    .filter(f => requiredKeys.includes(f.key))
    .filter(f => !f.isFilled(getByPath(userDoc, f.path)))
    .map(f => f.key);
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}
