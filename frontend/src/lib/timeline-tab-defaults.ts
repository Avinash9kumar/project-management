import { ProjectStatus, TimelineType } from './types';
import { TimelineMode } from './timeline-utils';

export interface TimelineFormDefaults {
  timelineMode: TimelineMode;
  assignees: string[];
  status: ProjectStatus;
  endDurationHours: number;
}

export function getTimelineFormDefaults(_timelineType: TimelineType): TimelineFormDefaults {
  return {
    timelineMode: 'date',
    assignees: [],
    status: 'pending',
    endDurationHours: 1,
  };
}
