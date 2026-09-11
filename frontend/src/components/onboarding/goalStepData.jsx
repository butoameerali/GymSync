import React from 'react';
import { Briefcase, Dumbbell, Activity, Heart, User } from 'lucide-react';

export const GOALS_DATA = [
  {
    category: "Career & Professional Training",
    icon: <Briefcase size={22} />,
    subs: [
      "Military & Armed Forces Prep",
      "Law Enforcement & Police Academy",
      "Combat Sports Conditioning",
      "Athletic Performance"
    ]
  },
  {
    category: "Body Transformation",
    icon: <Dumbbell size={22} />,
    subs: [
      "Weight Loss & Fat Burn",
      "Muscle Building (Hypertrophy)",
      "Healthy Weight Gain (Bulking)",
      "Lean & Shredded Definition",
      "Body Recomposition"
    ]
  },
  {
    category: "General Fitness & Physical Capability",
    icon: <Activity size={22} />,
    subs: [
      "Stamina & Endurance Boost",
      "Raw Strength & Power",
      "Flexibility & Mobility",
      "Agility & Reflexes",
      "Cardiovascular Health"
    ]
  },
  {
    category: "Lifestyle & Wellness",
    icon: <Heart size={22} />,
    subs: [
      "Sedentary to Active",
      "Stress Relief & Mental Wellness",
      "Daily Energy Enhancement",
      "Posture Correction"
    ]
  },
  {
    category: "Age-Specific Milestones",
    icon: <User size={22} />,
    subs: [
      "Youth & Teenage Growth",
      "Healthy Aging (Seniors)"
    ]
  }
];

export const PLAN_DURATIONS = [
  { id: '1 Month', label: '1 Month', sub: '30 Days Quick Start' },
  { id: '3 Months', label: '3 Months', sub: '90 Days (Recommended)', recommended: true },
  { id: '6 Months', label: '6 Months', sub: '180 Days Overload' },
  { id: '1 Year', label: '1 Year', sub: '12 Months Full Transformation' }
];
