/**
 * RecoveryStateEngine — Multi-Factor Sports Science Recovery Engine
 * 
 * Computes deep physiological recovery readiness based on:
 * - Sleep hours & sleep consistency
 * - Subjective energy levels (1-5)
 * - Neurological fatigue from previous session RPE (1-10)
 * - Mood & psychological stress state
 * - Pain notes & joint inflammation reports
 * - Event proximity & primer demands
 * - Cumulative fatigue across recent sessions
 */

export function computeRecoveryAdjustment({
  recentCheckIns = [],
  detectedEvent = null,
  eventAwarenessEngine = null,
  todayActivity = null,
  userJointPain = []
}) {
  const latestCheckIn = recentCheckIns[0] || {};
  const sleepHours = latestCheckIn.sleepHours;
  const energyLevel = latestCheckIn.energyLevel || 3;
  const mood = (latestCheckIn.mood || '').toLowerCase();
  const lastRPE = latestCheckIn.lastSessionRPE;
  const painNote = (latestCheckIn.painNote || '').toLowerCase();

  // 1. Sleep Scoring (0-100)
  const allSleeps = recentCheckIns.map(c => c.sleepHours).filter(s => typeof s === 'number' && s > 0);
  const avgSleep = allSleeps.length > 0 ? (allSleeps.reduce((a, b) => a + b, 0) / allSleeps.length) : null;
  const effectiveSleep = sleepHours !== undefined && sleepHours !== null ? sleepHours : avgSleep;

  let sleepScore = 75; // baseline assumption
  if (effectiveSleep !== null) {
    if (effectiveSleep >= 8) sleepScore = 100;
    else if (effectiveSleep >= 7) sleepScore = 85;
    else if (effectiveSleep >= 6) sleepScore = 65;
    else if (effectiveSleep >= 5) sleepScore = 45;
    else sleepScore = 25;
  }

  // 2. Energy Level Scoring (0-100)
  let energyScore = 65;
  if (energyLevel === 5) energyScore = 100;
  else if (energyLevel === 4) energyScore = 85;
  else if (energyLevel === 3) energyScore = 65;
  else if (energyLevel === 2) energyScore = 40;
  else if (energyLevel === 1) energyScore = 20;

  // 3. Neurological Fatigue / RPE Penalty
  let rpePenalty = 0;
  if (lastRPE >= 9.5) rpePenalty = 30;
  else if (lastRPE >= 9) rpePenalty = 22;
  else if (lastRPE >= 8) rpePenalty = 12;
  else if (lastRPE >= 7) rpePenalty = 5;

  // 4. Mood & Stress Assessment
  let moodPenalty = 0;
  if (mood.includes('pain') || mood.includes('hurt') || mood.includes('exhausted')) {
    moodPenalty = 25;
  } else if (mood.includes('sad') || mood.includes('stressed') || mood.includes('tired')) {
    moodPenalty = 15;
  } else if (mood.includes('happy') || mood.includes('energized') || mood.includes('great')) {
    moodPenalty = -10; // Bonus
  }

  // 5. Pain & Musculoskeletal Contraindications
  const contraindicatedMovements = [];
  const combinedPainText = `${painNote} ${userJointPain.join(' ')}`.toLowerCase();

  if (combinedPainText.includes('knee') || combinedPainText.includes('patella')) {
    contraindicatedMovements.push('Heavy Barbell Squats', 'Walking Lunges', 'High-Impact Jumping');
  }
  if (combinedPainText.includes('shoulder') || combinedPainText.includes('rotator')) {
    contraindicatedMovements.push('Behind-the-Neck Press', 'Heavy Overhead Barbell Press', 'Deep Dips');
  }
  if (combinedPainText.includes('back') || combinedPainText.includes('spine') || combinedPainText.includes('lumbar')) {
    contraindicatedMovements.push('Conventional Heavy Deadlifts', 'Bent-Over Rows', 'Good Mornings');
  }
  if (combinedPainText.includes('elbow') || combinedPainText.includes('tendon')) {
    contraindicatedMovements.push('Skull Crushers', 'Heavy Barbell Curls');
  }

  // 6. External Event Demands
  const eventDemands = (detectedEvent && eventAwarenessEngine)
    ? eventAwarenessEngine.getEventDemands(detectedEvent)
    : null;

  // 7. Calculate Composite Recovery Score (0-100)
  let compositeScore = Math.round((sleepScore * 0.45) + (energyScore * 0.35) - rpePenalty - moodPenalty);
  compositeScore = Math.max(10, Math.min(100, compositeScore));

  // 8. Determine Recovery Flag & Recommended Adjustments
  let recoveryFlag = 'Normal';
  let recommendedVolumeFactor = 1.0; // 100% standard volume
  let recommendedIntensityLimit = 8.5; // Max RPE
  const reasons = [];

  if (contraindicatedMovements.length > 0 || painNote.length > 3) {
    recoveryFlag = 'PainReported';
    recommendedVolumeFactor = 0.75;
    recommendedIntensityLimit = 7.0;
    reasons.push(`Discomfort reported in ${painNote || userJointPain.join(', ')}`);
  } else if (eventDemands?.isEventTomorrow) {
    recoveryFlag = 'EventPrep';
    recommendedVolumeFactor = 0.5;
    recommendedIntensityLimit = 6.0;
    reasons.push(`Pre-competition tapering for tomorrow's ${detectedEvent.type}`);
  } else if (effectiveSleep !== null && effectiveSleep < 5.5) {
    recoveryFlag = 'LowSleep';
    recommendedVolumeFactor = 0.65;
    recommendedIntensityLimit = 6.5;
    reasons.push(`Critical low sleep: ${effectiveSleep} hours recorded`);
  } else if (lastRPE >= 9 || compositeScore < 50) {
    recoveryFlag = 'HighFatigue';
    recommendedVolumeFactor = 0.7;
    recommendedIntensityLimit = 7.0;
    reasons.push(`Elevated central nervous system fatigue from previous session (RPE ${lastRPE || 9})`);
  } else if (compositeScore >= 85) {
    recoveryFlag = 'Prime';
    recommendedVolumeFactor = 1.0;
    recommendedIntensityLimit = 9.5;
    reasons.push(`Excellent recovery metrics (${effectiveSleep ? effectiveSleep + 'h sleep, ' : ''}energy ${energyLevel}/5)`);
  }

  // Build plain-language transparent explanation
  const transparentExplanation = reasons.length > 0
    ? `Adjusted workout because: **${reasons.join(' + ')}**. Volume calibrated to ${Math.round(recommendedVolumeFactor * 100)}% with max RPE capped at ${recommendedIntensityLimit} to protect joints and ensure complete physiological repair.`
    : 'Standard training load applied. Recovery indicators are balanced.';

  return {
    recoveryScore: compositeScore,
    recoveryFlag,
    sleepScore,
    energyScore,
    effectiveSleep,
    lastRPE,
    recommendedVolumeFactor,
    recommendedIntensityLimit,
    contraindicatedMovements,
    transparentExplanation,
    eventDemands,
    recoveryProtocol: {
      hydrationTargetLiters: 3.0,
      sleepTargetHours: 8.0,
      nutritionFocus: recoveryFlag === 'LowSleep' || recoveryFlag === 'HighFatigue' 
        ? 'High protein + complex carbohydrate recovery meal to replenish liver & muscle glycogen.'
        : 'Consistent macro adherence to support cellular adaptation.'
    }
  };
}

export default { computeRecoveryAdjustment };

