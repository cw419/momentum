import FullCalendar from '@fullcalendar/react';
import type {
  EventClickArg,
  EventContentArg,
  EventMountArg,
} from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
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

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return localDate(shifted);
}

interface ExpandedEvent {
  id: string;
  title: string;
  description?: string;
  notes?: string;
}

function getEventTooltip(eventInfo: Pick<EventContentArg, 'event'>) {
  const durationMinutes =
    (eventInfo.event.extendedProps.durationMinutes as number | undefined) ?? 0;
  const description = eventInfo.event.extendedProps.description as
    | string
    | undefined;
  const notes = eventInfo.event.extendedProps.notes as string | undefined;
  return [
    `${eventInfo.event.title} · ${formatTime(eventInfo.event.start)}–${formatTime(eventInfo.event.end)} · ${durationMinutes} min`,
    description,
    notes,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderEventContent(eventInfo: EventContentArg) {
  const durationMinutes =
    (eventInfo.event.extendedProps.durationMinutes as number | undefined) ?? 0;
  const description = eventInfo.event.extendedProps.description as
    | string
    | undefined;
  const notes = eventInfo.event.extendedProps.notes as string | undefined;

  return (
    <div className="h-full min-w-0 overflow-hidden px-1 py-0.5 text-left text-xs leading-tight">
      <div className="truncate font-semibold">{eventInfo.event.title}</div>
      <div className="truncate opacity-90">
        {eventInfo.timeText}
        {durationMinutes > 0 ? ` · ${durationMinutes} min` : ''}
        {description ? ` · ${description}` : ''}
        {notes ? ` · ${notes}` : ''}
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
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [expandedEvent, setExpandedEvent] = useState<ExpandedEvent | null>(
    null,
  );
  const events = completedHistoryToEvents(
    history,
    completedPlanItems,
    chainById,
    tr,
    selectedDate,
  );

  const handleEventClick = (eventInfo: EventClickArg) => {
    const description = eventInfo.event.extendedProps.description as
      | string
      | undefined;
    const notes = eventInfo.event.extendedProps.notes as string | undefined;
    setExpandedEvent({
      id: eventInfo.event.id,
      title: eventInfo.event.title,
      description,
      notes,
    });
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setExpandedEvent(null);
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border border-emerald-200 bg-white dark:border-emerald-800/70 dark:bg-slate-900"
      aria-label={tr('完成时间表', 'Completed timeline')}
    >
      <div className="flex items-center justify-between gap-2 border-b border-emerald-100 px-3 py-2 dark:border-emerald-800/70">
        <button
          type="button"
          aria-label={tr('前一天', 'Previous day')}
          onClick={() => selectDate(shiftDate(selectedDate, -1))}
          className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          aria-label={tr('选择完成记录日期', 'Choose completion date')}
          value={selectedDate}
          onChange={(event) => selectDate(event.target.value)}
          className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-sm font-semibold text-emerald-950 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-100"
        />
        <button
          type="button"
          aria-label={tr('后一天', 'Next day')}
          onClick={() => selectDate(shiftDate(selectedDate, 1))}
          className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <FullCalendar
        key={selectedDate}
        plugins={[timeGridPlugin]}
        initialView="timeGridDay"
        initialDate={selectedDate}
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
        eventClick={handleEventClick}
      />
      {events.length === 0 && (
        <p className="border-t border-dashed border-emerald-200 px-3 py-4 text-sm text-emerald-800/80 dark:border-emerald-800 dark:text-emerald-200/80">
          {tr(
            '这一天还没有完成记录。',
            'There are no completion records for this day yet.',
          )}
        </p>
      )}
      {expandedEvent && (expandedEvent.description || expandedEvent.notes) && (
        <div className="border-t border-emerald-100 px-3 py-3 text-sm text-emerald-950 dark:border-emerald-800/70 dark:text-emerald-100">
          <p className="font-semibold">{expandedEvent.title}</p>
          {expandedEvent.description && (
            <p className="mt-1 whitespace-pre-wrap">
              {expandedEvent.description}
            </p>
          )}
          {expandedEvent.notes && (
            <p className="mt-1 whitespace-pre-wrap">{expandedEvent.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
