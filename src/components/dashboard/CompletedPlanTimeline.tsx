import FullCalendar from '@fullcalendar/react';
import type { EventContentArg, EventMountArg } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { Chain, CompletionHistory, DailyPlanItem } from '../../types';
import { completedHistoryToEvents } from '../../utils/completedPlanTimeline';

interface Props {
  history: CompletionHistory[];
  completedPlanItems: DailyPlanItem[];
  chainById: Map<string, Chain>;
  tr: (zh: string, en: string) => string;
}

function formatTime(time: Date | null) {
  return time
    ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--';
}

function getEventTooltip(eventInfo: Pick<EventContentArg, 'event'>) {
  const durationMinutes =
    (eventInfo.event.extendedProps.durationMinutes as number | undefined) ?? 0;
  return `${eventInfo.event.title} · ${formatTime(eventInfo.event.start)}–${formatTime(eventInfo.event.end)} · ${durationMinutes} min`;
}

function renderEventContent(eventInfo: EventContentArg) {
  const durationMinutes =
    (eventInfo.event.extendedProps.durationMinutes as number | undefined) ?? 0;

  return (
    <div className="h-full min-w-0 overflow-hidden px-1 py-0.5 text-left text-xs leading-tight">
      <div className="truncate font-semibold">{eventInfo.event.title}</div>
      <div className="truncate opacity-90">
        {eventInfo.timeText}
        {durationMinutes > 0 ? ` · ${durationMinutes} min` : ''}
      </div>
    </div>
  );
}

function setEventTooltip(eventInfo: EventMountArg) {
  eventInfo.el.title = getEventTooltip(eventInfo);
}

export function CompletedPlanTimeline({
  history,
  completedPlanItems,
  chainById,
  tr,
}: Props) {
  const events = completedHistoryToEvents(
    history,
    completedPlanItems,
    chainById,
    tr,
  );

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-emerald-300 px-3 py-4 text-sm text-emerald-800/80 dark:border-emerald-700 dark:text-emerald-200/80">
        {tr(
          '这些完成记录没有可用的实际起止时间，暂时无法放入时间表。',
          'No completed tasks have actual start and finish times to show yet.',
        )}
      </p>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-emerald-200 bg-white dark:border-emerald-800/70 dark:bg-slate-900"
      aria-label={tr('今日完成时间表', "Today's completed timeline")}
    >
      <FullCalendar
        plugins={[timeGridPlugin]}
        initialView="timeGridDay"
        initialDate={new Date()}
        events={events}
        headerToolbar={false}
        allDaySlot={false}
        editable={false}
        eventStartEditable={false}
        eventDurationEditable={false}
        eventOverlap={false}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        scrollTime="06:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        height={520}
        eventMinHeight={42}
        eventShortHeight={42}
        eventContent={renderEventContent}
        eventDidMount={setEventTooltip}
      />
    </div>
  );
}
