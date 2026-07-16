import React from 'react';
import type { OSRMStep } from '../../types/routing';
import { TurnInstruction } from './TurnInstruction';

interface TurnListProps {
  steps: OSRMStep[];
  currentStepIndex: number;
}

export function TurnList({ steps, currentStepIndex }: TurnListProps) {
  return (
    <div className="overflow-y-auto max-h-[50vh]">
      {steps.map((step, idx) => (
        <TurnInstruction
          key={idx}
          maneuver={step.maneuver.type}
          modifier={step.maneuver.modifier}
          bearingBefore={step.maneuver.bearing_before}
          bearingAfter={step.maneuver.bearing_after}
          roadName={step.name}
          previousRoadName={idx > 0 ? steps[idx - 1].name : undefined}
          distance={step.distance}
          isActive={idx === currentStepIndex}
        />
      ))}
    </div>
  );
}
