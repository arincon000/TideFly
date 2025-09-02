import { useState } from 'react';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

interface SkillChipsProps {
  selectedSkill: SkillLevel | null;
  onSkillChange: (skill: SkillLevel) => void;
}

export default function SkillChips({ selectedSkill, onSkillChange }: SkillChipsProps) {
  const skills: { value: SkillLevel; label: string; description: string }[] = [
    {
      value: 'beginner',
      label: 'Beginner',
      description: '0.8–1.5m waves, ≤25 km/h wind'
    },
    {
      value: 'intermediate',
      label: 'Intermediate',
      description: '1.2–2.5m waves, ≤30 km/h wind'
    },
    {
      value: 'advanced',
      label: 'Advanced',
      description: '2.0–4.0m waves, ≤35 km/h wind'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-3">
          Skill Level
        </label>
        <p className="text-sm text-slate-600 mb-4">
          We'll use presets for this skill level. Some spots may have stricter local presets.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {skills.map((skill) => (
          <button
            key={skill.value}
            type="button"
            onClick={() => onSkillChange(skill.value)}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedSkill === skill.value
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold text-slate-900 mb-1">
              {skill.label}
            </div>
            <div className="text-sm text-slate-600">
              {skill.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
