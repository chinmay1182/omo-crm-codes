/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './styles.module.css';
import { useAuth } from '@/app/context/AuthContext'; // Import your auth context

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type EventType = 'lead' | 'meeting' | 'task';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: EventType;
  description?: string;
  status?: string;
  priority?: string;
  location?: string;
  resourceId?: string;
}

const CalendarPage = () => {
  const { user, loading: authLoading } = useAuth(); // Get user from auth context
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    start: new Date(),
    end: new Date(),
    description: '',
    type: 'meeting',
  });
  const [showEventModal, setShowEventModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get company ID from authenticated user
  const getCompanyId = () => {
    if (!user) return null;
    // Adjust these based on your user object structure
    return user.companyId || user.company_id || user.currentCompanyId;
  };

  const companyId = getCompanyId();

  useEffect(() => {
    // Don't fetch data if auth is still loading
    if (authLoading) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Endpoints for ALL companies data (global view)
        const endpoints = [
          { url: `/api/leads`, type: 'lead' }, // NO companyId filter - shows ALL companies
          { url: `/api/companies/meetings/all`, type: 'meeting' }, // Remove companyId filter
          { url: `/api/companies/tasks/all`, type: 'task' } // Remove companyId filter
        ];

        const results = await Promise.all(
          endpoints.map(async ({ url, type }) => {
            try {
              const response = await fetch(url, {
                credentials: 'include', // Include cookies for authentication
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (!response.ok) {
                throw new Error(`Failed to fetch ${type}s: ${response.status}`);
              }
              return { data: await response.json(), type };
            } catch (err: any) {
              console.error(`Error fetching ${type}s:`, err);
              return { data: [], type, error: err.message };
            }
          })
        );

        // Transform data into calendar events
        const allEvents = results.flatMap(({ data, type }) => {
          switch (type) {
            case 'lead':
              return data
                .filter((lead: any) => lead.closing_date)
                .map((lead: any) => ({
                  id: lead.id,
                  title: lead.assignment_name || 'Untitled Lead',
                  start: new Date(lead.closing_date),
                  end: new Date(new Date(lead.closing_date).setHours(23, 59, 59)),
                  type: 'lead',
                  description: lead.description,
                  priority: lead.priority,
                }));

            case 'meeting':
              return data.map((meeting: any) => ({
                id: meeting.id,
                title: meeting.title || 'Untitled Meeting',
                start: new Date(meeting.start_time),
                end: new Date(meeting.end_time),
                type: 'meeting',
                description: meeting.description,
                location: meeting.location,
              }));

            case 'task':
              return data
                .filter((task: any) => task.due_date)
                .map((task: any) => ({
                  id: task.id,
                  title: task.title || 'Untitled Task',
                  start: new Date(task.due_date),
                  end: new Date(new Date(task.due_date).setHours(23, 59, 59)),
                  type: 'task',
                  description: task.description,
                  status: task.status,
                  priority: task.priority,
                }));

            default:
              return [];
          }
        });

        setEvents(allEvents);
      } catch (error) {
        console.error('Error loading calendar data:', error);
        setError('Failed to load calendar data. Some events may not be displayed.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading]); // Only depend on auth loading

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setNewEvent({
      ...newEvent,
      start: slotInfo.start,
      end: slotInfo.end,
    });
    setShowEventModal(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    let details = `Title: ${event.title}\nType: ${event.type}\n`;
    if (event.description) details += `Description: ${event.description}\n`;
    if (event.priority) details += `Priority: ${event.priority}\n`;
    if (event.status) details += `Status: ${event.status}\n`;
    if (event.location) details += `Location: ${event.location}\n`;
    
    alert(details);
  };

  const handleAddEvent = async () => {
    try {
      setError('');
      
      if (!newEvent.title || !newEvent.start) {
        setError('Title and start time are required');
        return;
      }

      // Removed companyId check since we want global access

      let endpoint = '';
      let body = {};

      switch (newEvent.type) {
        case 'meeting':
          endpoint = '/api/companies/meetings';
          body = {
            // No companyId restriction - can create meetings for any company
            title: newEvent.title,
            description: newEvent.description || '',
            start_time: newEvent.start?.toISOString(),
            end_time: newEvent.end?.toISOString(),
            location: '',
            participants: '',
          };
          break;

        case 'task':
          endpoint = '/api/companies/tasks';
          body = {
            // No companyId restriction - can create tasks for any company
            title: newEvent.title,
            description: newEvent.description || '',
            due_date: newEvent.start?.toISOString().split('T')[0],
            status: 'pending',
            priority: 'medium',
            is_recurring: false,
            related_to: 'company',
          };
          break;

        case 'lead':
          endpoint = '/api/leads';
          body = {
            // No companyId restriction - can create leads for any company
            assignment_name: newEvent.title,
            description: newEvent.description || '',
            closing_date: newEvent.start?.toISOString().split('T')[0],
            stage: 'New',
            priority: 'Medium',
            source: 'Calendar',
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create event');
      }

      const createdEvent = await response.json();

      // Add the new event to the calendar
      const newCalendarEvent: CalendarEvent = {
        id: createdEvent.id || createdEvent.meetingId || createdEvent.taskId || Math.random().toString(),
        title: newEvent.title!,
        start: newEvent.start!,
        end: newEvent.end || new Date(newEvent.start!.getTime() + 60 * 60 * 1000), // Default 1 hour duration
        type: newEvent.type as EventType,
        description: newEvent.description,
        priority: newEvent.type === 'task' ? 'medium' : undefined,
        status: newEvent.type === 'task' ? 'pending' : undefined,
      };

      setEvents(prev => [...prev, newCalendarEvent]);

      setShowEventModal(false);
      setNewEvent({
        title: '',
        start: new Date(),
        end: new Date(),
        description: '',
        type: 'meeting',
      });
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'; // Default blue for meetings
    if (event.type === 'lead') backgroundColor = '#4CAF50'; // Green for leads
    if (event.type === 'task') backgroundColor = '#FF9800'; // Orange for tasks

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
      },
    };
  };

  // Show loading while auth is loading
  if (authLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  // Show error if no user (but still allow viewing global data)
  if (!user) {
    return <div className={styles.error}>Please log in to create events.</div>;
  }

  if (loading) return <div className={styles.loading}>Loading calendar...</div>;

  return (
    <div className={styles.calendarContainer}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      
      <div className={styles.calendarWrapper}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '80vh' }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          views={['month', 'week', 'day', 'agenda']}
          defaultView={Views.MONTH}
          eventPropGetter={eventStyleGetter}
        />
      </div>

      {showEventModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Add New Event</h2>
            <select
              title='none'
              value={newEvent.type}
              onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })}
              className={styles.select}
            >
              <option value="meeting">Meeting</option>
              <option value="task">Task</option>
              <option value="lead">Lead</option>
            </select>
            <input
              type="text"
              placeholder="Title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className={styles.input}
              required
            />
            <textarea
              placeholder="Description"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              className={styles.textarea}
            />
            <div className={styles.dateInputs}>
              <label>
                Start:
                <input
                  type="datetime-local"
                  value={newEvent.start ? format(newEvent.start, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, start: new Date(e.target.value) })
                  }
                  required
                />
              </label>
              {newEvent.type === 'meeting' && (
                <label>
                  End:
                  <input
                    type="datetime-local"
                    value={newEvent.end ? format(newEvent.end, "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, end: new Date(e.target.value) })
                    }
                    required
                  />
                </label>
              )}
            </div>
            {error && <div className={styles.errorText}>{error}</div>}
            <div className={styles.buttonGroup}>
              <button onClick={handleAddEvent} className={styles.saveButton}>
                Save Event
              </button>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setError('');
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;