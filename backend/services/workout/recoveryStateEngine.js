export function computeRecoveryAdjustment({ recentCheckIns = [], detectedEvent = null, eventAwarenessEngine = null }) {
  const eventDemands = (detectedEvent && eventAwarenessEngine) 
    ? eventAwarenessEngine.getEventDemands(detectedEvent) 
    : null;
  
  const sleeps = recentCheckIns.map(c => c.sleepHours).filter(s => s != null);
  const avgSleep = sleeps.length > 0 ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;
  
  const lastRPE = recentCheckIns[0]?.lastSessionRPE;

  let recoveryFlag = 'Normal';
  if (avgSleep !== null && avgSleep < 6) recoveryFlag = 'LowSleep';
  if (lastRPE >= 9) recoveryFlag = 'HighFatigue';

  return { recoveryFlag, eventDemands };
}
