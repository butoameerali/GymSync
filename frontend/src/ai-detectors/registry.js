/**
 * Modular AI Detector Registry
 * 
 * Maps safe string detectorIds to their metadata and lazy dynamic loaders.
 * Executable file paths or arbitrary code are NEVER stored in MongoDB.
 */

export const REGISTERED_DETECTORS = [
  {
    id: 'pushup_v1',
    name: 'Push-Up Detector (v1.0 - Beta)',
    version: '1.0',
    supportedExerciseType: 'push_up',
    status: 'experimental',
    capabilities: ['rep_count', 'stage_tracking'],
    description: 'Local browser-based push-up rep counter using joint angle heuristics',
    loader: () => import('./pushup-v1/index.js')
  }
];

export const getAvailableDetectors = () => REGISTERED_DETECTORS;

export const getDetectorById = (id) => {
  if (!id) return null;
  return REGISTERED_DETECTORS.find(d => d.id === id) || null;
};

export const isValidDetectorId = (id) => {
  return Boolean(getDetectorById(id));
};
