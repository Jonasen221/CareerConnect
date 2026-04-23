import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Phone, AlertCircle, Flame, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addDays, parseISO } from 'date-fns';

function generateGoogleCalendarUrl(event) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const startDate = event.data.scheduled_date?.replace(/-/g, '') || '';
  const time = event.data.scheduled_time?.replace(':', '') || '0900';
  const startDT = startDate ? `${startDate}T${time}00` : '';
  const endDT = startDate ? `${startDate}T${(parseInt(time) + 100).toString().padStart(4, '0')}00` : '';
  const title = encodeURIComponent(`Interview: ${event.data.company} - ${event.data.job_title || 'Position'}`);
  const details = encodeURIComponent(event.data.meeting_link ? `Meeting link: ${event.data.meeting_link}` : '');
  return `${base}&text=${title}&dates=${startDT}/${endDT}&details=${details}`;
}

function generateICalUrl(event) {
  const startDate = event.data.scheduled_date?.replace(/-/g, '') || '';
  const time = event.data.scheduled_time?.replace(':', '') || '0900';
  const startDT = `${startDate}T${time}00`;
  const endDT = `${startDate}T${(parseInt(time.replace(':', '')) + 100).toString().padStart(4, '0')}00`;
  const title = `Interview: ${event.data.company} - ${event.data.job_title || 'Position'}`;
  const description = event.data.meeting_link ? `Meeting link: ${event.data.meeting_link}` : '';
  const ical = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  `DTSTART:${startDT}`,
  `DTEND:${endDT}`,
  `SUMMARY:${title}`,
  `DESCRIPTION:${description}`,
  'END:VEVENT',
  'END:VCALENDAR'].
  join('\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ical)}`;
}

export default function DashboardCalendar({ userType, userEmail }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [streak, setStreak] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendarData();
  }, [userEmail, userType]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const allCalls = await base44.entities.CallRequest.filter({ status: 'scheduled' });

      let userCalls = [];
      if (userType === 'student') {
        userCalls = allCalls.filter((c) => c.student_email === userEmail);
      } else if (userType === 'recruiter') {
        userCalls = allCalls.filter((c) => c.recruiter_email === userEmail);
      } else if (userType === 'admin') {
        userCalls = allCalls;
      }

      let gameProgress = null;
      if (userType === 'student') {
        const progData = await base44.entities.GameProgress.filter({ created_by: userEmail });
        gameProgress = progData[0];
      }

      const [allEvents, myRsvps] = await Promise.all([
        base44.entities.Event.list('-date'),
        userEmail ? base44.entities.EventRSVP.filter({ created_by: userEmail }) : Promise.resolve([])
      ]);
      const rsvpedEventIds = new Set(myRsvps.map(r => r.event_id));

      const calendarEvents = [];

      userCalls.forEach((call) => {
        if (call.scheduled_date) {
          calendarEvents.push({
            id: call.id,
            type: 'call',
            date: call.scheduled_date,
            title: `Call: ${call.company || 'Company'} - ${call.job_title || 'Position'}`,
            data: call,
            color: 'bg-[#EAF5FB] text-[#2D5F7A] border-[#A8D4E8]'
          });

          const reminderDate = format(addDays(parseISO(call.scheduled_date), -1), 'yyyy-MM-dd');
          calendarEvents.push({
            id: `reminder-${call.id}`,
            type: 'reminder',
            date: reminderDate,
            title: `Prepare for ${call.company || 'call'}`,
            data: call,
            color: 'bg-amber-50 text-amber-800 border-amber-200'
          });
        }
      });

      allEvents.forEach((ev) => {
        if (ev.date) {
          const rsvped = rsvpedEventIds.has(ev.id);
          calendarEvents.push({
            id: `event-${ev.id}`,
            type: 'platform_event',
            date: ev.date,
            title: ev.title,
            data: ev,
            rsvped,
            color: rsvped
              ? 'bg-[#5BA4C4] text-white border-[#3D87AA]'
              : 'bg-[#EAF5FB] text-[#3D87AA] border-[#A8D4E8]'
          });
        }
      });

      setEvents(calendarEvents);
      setStreak(gameProgress?.streak_days || 0);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
    setLoading(false);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const firstDayOfMonth = startOfMonth(currentDate);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  const calendarDays = Array.from({ length: Math.ceil((days.length + firstDayOfMonth.getDay()) / 7) * 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    return date;
  });

  const getEventsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter((e) => e.date === dateStr);
  };

  const dayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <Card className="border border-[#A8D4E8]/30 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#2E3F4F]">Calendar & Events</CardTitle>
          {streak > 0 &&
          <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600">{streak} day streak</span>
            </div>
          }
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            {loading ?
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-[#5BA4C4] border-t-transparent rounded-full animate-spin" />
              </div> :

            <>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                  variant="outline"
                  size="icon" className="bg-slate-300 text-gray-400 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 w-9 border-[#A8D4E8]/50 hover:bg-[#EAF5FB]"

                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>

                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h3 className="text-lg font-semibold text-[#2E3F4F]">
                    {format(currentDate, 'MMMM yyyy')}
                  </h3>
                  <Button
                  variant="outline"
                  size="icon" className="bg-slate-300 text-gray-400 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 w-9 border-[#A8D4E8]/50 hover:bg-[#EAF5FB]"

                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>

                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) =>
                <div key={day} className="text-center text-xs font-semibold text-[#7A7870] py-2">
                      {day}
                    </div>
                )}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, idx) => {
                  const dateEvents = getEventsForDate(date);
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isTodayDate = isToday(date);
                  const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={`aspect-square p-1 rounded-lg border text-xs font-medium transition-all ${
                      isTodayDate ?
                      'border-[#5BA4C4] bg-[#EAF5FB] text-[#2D5F7A] font-bold' :
                      isSelected ?
                      'border-[#5BA4C4] bg-[#daeef7] text-[#2D5F7A]' :
                      isCurrentMonth ?
                      'border-slate-100 bg-white hover:bg-[#EAF5FB] text-[#2E3F4F]' :
                      'border-slate-50 bg-slate-50 text-slate-300'}`
                      }>

                        <div className="flex flex-col h-full items-center">
                          <span>{format(date, 'd')}</span>
                          {dateEvents.length > 0 &&
                        <div className="flex flex-col gap-0.5 mt-1 w-full">
                              {dateEvents.slice(0, 2).map((event) =>
                          <div
                            key={event.id}
                            className={`w-full rounded text-[9px] font-bold px-1 truncate leading-tight py-0.5 ${
                            event.type === 'call' ? 'bg-[#5BA4C4] text-white' :
                            event.type === 'platform_event' ? (event.rsvped ? 'bg-[#3D87AA] text-white' : 'bg-[#A8D4E8] text-[#2d5f7a]') :
                            'bg-amber-400 text-white'}`
                            }>
                            {event.type === 'platform_event' ? (event.rsvped ? '✓ ' : '') + event.title.slice(0, 8) :
                             event.type === 'call' ? '📞' : '⚠️'}
                          </div>
                          )}
                          {dateEvents.length > 2 && <div className="text-[9px] text-slate-400 text-center">+{dateEvents.length - 2}</div>}
                            </div>
                        }
                        </div>
                      </button>);

                })}
                </div>
              </>
            }
          </div>

          {/* Events Sidebar */}
          <div className="bg-[#EAF5FB]/40 rounded-xl p-4 border border-[#A8D4E8]/30">
            <h4 className="font-semibold text-[#2E3F4F] mb-3">
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
            </h4>

            {!selectedDate &&
            <p className="text-sm text-[#7A7870]">Click a day to see events</p>
            }

            {selectedDate && dayEvents.length === 0 &&
            <p className="text-sm text-[#7A7870]">No events scheduled</p>
            }

            <div className="space-y-3">
              {dayEvents.map((event) =>
              <div key={event.id} className={`${event.color} border rounded-xl p-3 text-sm`}>
                  <div className="flex items-start gap-2">
                    {event.type === 'call' ?
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#5BA4C4]" /> :
                  event.type === 'platform_event' ?
                  <span className="text-base mt-0.5 flex-shrink-0">📅</span> :
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  }
                    <div className="flex-1">
                      <p className="font-semibold">{event.title}</p>
                      {event.type === 'platform_event' && (
                        <>
                          {event.data.time && <p className="text-xs opacity-80 mt-1">🕐 {event.data.time}{event.data.end_time ? ` – ${event.data.end_time}` : ''}</p>}
                          {event.data.location && <p className="text-xs opacity-80">📍 {event.data.location}</p>}
                          {event.rsvped && <span className="inline-block mt-1 text-xs font-bold bg-white/30 rounded-full px-2 py-0.5">✓ Signed up</span>}
                        </>
                      )}
                      {event.type === 'call' && event.data.scheduled_time &&
                    <p className="text-xs opacity-75 mt-1">Time: {event.data.scheduled_time}</p>
                    }
                      {event.type === 'reminder' &&
                    <p className="text-xs opacity-75 mt-1">Tip: Research the company & prepare questions about {event.data.job_title}</p>
                    }
                      {event.type === 'call' &&
                    <div className="flex gap-2 mt-2">
                          <a href={generateGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs bg-white border border-[#A8D4E8] text-[#3D87AA] px-2 py-1 rounded-lg hover:bg-[#EAF5FB] transition-colors font-medium">
                            <CalendarPlus className="w-3 h-3" />Google
                          </a>
                          <a href={generateICalUrl(event)} download="event.ics"
                        className="flex items-center gap-1 text-xs bg-white border border-[#A8D4E8] text-[#3D87AA] px-2 py-1 rounded-lg hover:bg-[#EAF5FB] transition-colors font-medium">
                            <CalendarPlus className="w-3 h-3" />iCal
                          </a>
                        </div>
                    }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>);

}