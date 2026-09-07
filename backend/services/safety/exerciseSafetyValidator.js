/**
 * Medical & Joint Safety Screening Engine (Zero Tolerance)
 * Enforces hard medical and orthopedic exclusions, provides clinical explanations,
 * and handles triage for acute or unexplained pain.
 */

export const exerciseSafetyValidator = {
  /**
   * Filter an array of candidate exercises against user medical conditions,
   * joint pain areas, and physical limitations.
   *
   * @param {Array} exercises - Candidate exercises from registry
   * @param {Object} profile - User health profile { medicalConditions, jointPain, injuries, limitations }
   * @returns {Object} { safeExercises, excludedExercises, safetyWarnings, requiresMedicalReferral }
   */
  filterSafeExercises(exercises = [], profile = {}) {
    const jointPain = (profile.jointPain || profile.jointPainAreas || []).map(p => String(p).toLowerCase().replace(/\s+/g, ''));
    const medicalConditions = (profile.medicalConditions || []).map(m => String(m).toLowerCase());
    const injuries = (profile.injuries || []).map(i => String(i).toLowerCase());
    const limitations = (profile.limitations || []).map(l => String(l).toLowerCase());

    const combinedPainAndInjuries = [...new Set([...jointPain, ...injuries, ...limitations])];

    const safeExercises = [];
    const excludedExercises = [];
    const safetyWarnings = [];

    // Check for acute or red-flag pain keywords
    let requiresMedicalReferral = false;
    const acuteKeywords = ['sharp', 'severe', 'unbearable', 'shooting', 'numbness', 'tingling', 'popping', 'swelling', 'unexplained'];
    const allNotes = [...jointPain, ...medicalConditions, ...injuries, ...limitations].join(' ');
    if (acuteKeywords.some(k => allNotes.includes(k))) {
      requiresMedicalReferral = true;
      safetyWarnings.push('⚠️ Immediate Clinical Warning: You reported acute, sharp, or severe symptoms. Please consult a licensed physical therapist or orthopedic physician before performing loaded resistance training.');
    }

    exercises.forEach(ex => {
      let isExcluded = false;
      let reason = '';

      // 1. Joint Pain & Orthopedic Exclusions
      for (const pain of combinedPainAndInjuries) {
        // Direct match in exercise injury exclusions
        if (ex.injuryExclusions && ex.injuryExclusions.some(e => pain.includes(e) || e.includes(pain))) {
          isExcluded = true;
          reason = `Contraindicated for ${pain}: puts direct shear/compression stress on affected joint.`;
          break;
        }

        // Specific anatomical rules
        if (pain.includes('knee')) {
          const p = (ex.movementPattern || '').toLowerCase();
          const n = ex.name.toLowerCase();
          if (p === 'squat' && (n.includes('barbell back') || n.includes('hack') || n.includes('jump') || n.includes('pistol'))) {
            isExcluded = true;
            reason = 'Deep knee flexion and heavy axial knee loading contraindicated for active knee discomfort.';
            break;
          }
          if (n.includes('leg extension') || n.includes('jump') || n.includes('running (gps)')) {
            isExcluded = true;
            reason = 'High patellofemoral shear or high-impact shock contraindicated for knee pain.';
            break;
          }
        }

        if (pain.includes('shoulder')) {
          const p = (ex.movementPattern || '').toLowerCase();
          const n = ex.name.toLowerCase();
          if (p === 'vertical push' && (n.includes('overhead') || n.includes('military') || n.includes('barbell press') || n.includes('behind-neck'))) {
            isExcluded = true;
            reason = 'Overhead vertical barbell pressing contraindicated during shoulder impingement or pain.';
            break;
          }
          if (n.includes('dip') || n.includes('upright row')) {
            isExcluded = true;
            reason = 'Extreme internal rotation or extreme end-range extension contraindicated for shoulder pain.';
            break;
          }
        }

        if (pain.includes('lowerback') || pain.includes('back') || pain.includes('spine') || pain.includes('disc')) {
          const n = ex.name.toLowerCase();
          if (n.includes('conventional deadlift') || (n.includes('barbell back squat') && ex.difficulty === 'Advanced') || n.includes('good morning')) {
            isExcluded = true;
            reason = 'High spinal shear and heavy axial loading contraindicated for lower back symptoms.';
            break;
          }
        }

        if (pain.includes('neck')) {
          const n = ex.name.toLowerCase();
          if (n.includes('neck') || n.includes('behind-neck') || n.includes('shrug')) {
            isExcluded = true;
            reason = 'Direct cervical strain contraindicated for neck discomfort.';
            break;
          }
        }

        if (pain.includes('wrist')) {
          const n = ex.name.toLowerCase();
          if (n.includes('barbell curl') || (n.includes('push-up') && !n.includes('knuckle') && !n.includes('parallette'))) {
            isExcluded = true;
            reason = 'Hyperextended wrist loading contraindicated for active wrist pain.';
            break;
          }
        }
      }

      // 2. Systemic & Medical Conditions Exclusions
      if (!isExcluded && medicalConditions.length > 0) {
        for (const cond of medicalConditions) {
          if (cond.includes('hypertension') || cond.includes('high blood pressure')) {
            const n = ex.name.toLowerCase();
            if (n.includes('heavy deadlift') || n.includes('handstand') || n.includes('inverted') || n.includes('valsalva')) {
              isExcluded = true;
              reason = 'Prolonged inversions or maximum isometric straining contraindicated for hypertension.';
              break;
            }
          }
          if (cond.includes('asthma') || cond.includes('respiratory')) {
            const n = ex.name.toLowerCase();
            if (n.includes('sprint') || n.includes('hiit') || n.includes('burpee')) {
              isExcluded = true;
              reason = 'Sustained maximal anaerobic burst contraindicated without graded aerobic conditioning.';
              break;
            }
          }
          if (cond.includes('vertigo') || cond.includes('dizziness')) {
            const n = ex.name.toLowerCase();
            if (n.includes('burpee') || n.includes('jump') || n.includes('rapid change') || n.includes('inversion')) {
              isExcluded = true;
              reason = 'Rapid vertical elevation shifts contraindicated for vestibular vertigo.';
              break;
            }
          }
        }
      }

      if (isExcluded) {
        excludedExercises.push({
          exerciseId: ex.exerciseId,
          name: ex.name,
          reason
        });
      } else {
        safeExercises.push(ex);
      }
    });

    if (excludedExercises.length > 0) {
      safetyWarnings.push(`🩺 Medical Safety Hard-Filter: Screened out ${excludedExercises.length} exercise(s) incompatible with your joints/medical profile.`);
    }

    return {
      safeExercises,
      excludedExercises,
      safetyWarnings,
      requiresMedicalReferral
    };
  },

  /**
   * Recommend low-impact or pain-free regressions when a high-value movement is blocked
   */
  suggestSafeAlternative(blockedExerciseName, painArea) {
    const area = (painArea || '').toLowerCase();
    const name = (blockedExerciseName || '').toLowerCase();

    if (area.includes('knee')) {
      return {
        alternativeName: 'Glute Bridges or Bodyweight Romanian Deadlifts',
        pattern: 'hinge',
        clinicalRationale: 'Shifts kinetic load away from the patellofemoral joint into the posterior chain (glutes and hamstrings).'
      };
    }
    if (area.includes('shoulder')) {
      return {
        alternativeName: 'Neutral-Grip Dumbbell Floor Press or Face Pulls',
        pattern: 'horizontal push / pull',
        clinicalRationale: 'Neutral grip eliminates acromial impingement and floor stops hyperextension of the glenohumeral joint.'
      };
    }
    if (area.includes('lowerback') || area.includes('back')) {
      return {
        alternativeName: 'Chest-Supported Dumbbell Rows and Bird-Dogs',
        pattern: 'horizontal pull / core',
        clinicalRationale: 'Eliminates unsupported spinal shear while strengthening scapular retractors and multifidus core stabilization.'
      };
    }

    return {
      alternativeName: 'Bodyweight Isometric Hold',
      pattern: 'activation',
      clinicalRationale: 'Pain-free submaximal isometric muscle activation.'
    };
  }
};

export default exerciseSafetyValidator;
