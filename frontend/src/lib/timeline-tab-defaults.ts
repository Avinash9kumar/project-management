import { ProjectStatus, TimelineType } from './types';
import { TimelineMode } from './timeline-utils';

export interface TimelineFormDefaults {
  timelineMode: TimelineMode;
  assignMain: string;
  assignCc: string[];
  status: ProjectStatus;
  endDurationHours: number;
}

export function getTimelineFormDefaults(_timelineType: TimelineType): TimelineFormDefaults {
  return {
    timelineMode: 'date',
    assignMain: '',
    assignCc: [],
    status: 'pending',
    endDurationHours: 1,
  };
}
