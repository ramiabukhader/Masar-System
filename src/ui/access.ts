import type { AccessSurvey } from '../core/types';

/**
 * How the access survey should be described to a human.
 *
 * `hasElevator` and `elevatorFitsAppliance` are two separately recorded facts, and a
 * two-way ternary over them told the crew "no elevator" for 11 of the 78 customers in the
 * seeded wave — buildings that do have a lift, just not one that takes a boxed appliance.
 * That is a different job from a stair carry and a different thing to plan for, so it
 * gets its own answer rather than being rounded down to the worse one.
 */
export function accessLabelKey(access: AccessSurvey): 'elevator' | 'elevatorTooSmall' | 'noElevator' {
  if (!access.hasElevator) return 'noElevator';
  return access.elevatorFitsAppliance ? 'elevator' : 'elevatorTooSmall';
}

/** True when the appliances have to go up by hand — the case the crew must plan for. */
export function needsStairCarry(access: AccessSurvey): boolean {
  return access.floor > 0 && !(access.hasElevator && access.elevatorFitsAppliance);
}
