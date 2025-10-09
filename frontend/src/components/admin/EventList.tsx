'use client';

// EventList Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Event list with sort/filter UI using URL search params

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Event {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  date: string; // ISO date
  description: string | null;
  visibility: 'public' | 'private';
  status: 'upcoming' | 'past' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  sessions_count?: number;
  speeches_count?: number;
}

interface EventListProps {
  events: Event[];
  onEventClick: (id: string) => void;
}

type SortOption = 'date-asc' | 'date-desc' | 'created-desc';
type FilterOption = 'all' | 'upcoming' | 'past' | 'archived';

export default function EventList({ events, onEventClick }: EventListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sort, setSort] = useState<SortOption>('date-asc');
  const [filter, setFilter] = useState<FilterOption>('all');

  // Initialize state from URL params
  useEffect(() => {
    const sortParam = searchParams.get('sort') as SortOption;
    const filterParam = searchParams.get('filter') as FilterOption;

    if (sortParam && ['date-asc', 'date-desc', 'created-desc'].includes(sortParam)) {
      setSort(sortParam);
    }

    if (filterParam && ['all', 'upcoming', 'past', 'archived'].includes(filterParam)) {
      setFilter(filterParam);
    }
  }, [searchParams]);

  // Update URL when sort/filter changes
  const updateURL = (newSort: SortOption, newFilter: FilterOption) => {
    const params = new URLSearchParams();
    params.set('sort', newSort);
    params.set('filter', newFilter);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as SortOption;
    setSort(newSort);
    updateURL(newSort, filter);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilter = e.target.value as FilterOption;
    setFilter(newFilter);
    updateURL(sort, newFilter);
  };

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    return event.status === filter;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sort) {
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'created-desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isPastEvent = (event: Event) => {
    return event.status === 'past';
  };

  return (
    <div className="space-y-4">
      {/* Sort and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              id="sort"
              value={sort}
              onChange={handleSortChange}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="date-asc">Date (Soonest First)</option>
              <option value="date-desc">Date (Newest First)</option>
              <option value="created-desc">Recently Created</option>
            </select>
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter" className="text-sm font-medium text-gray-700">
              Filter:
            </label>
            <select
              id="filter"
              value={filter}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          {sortedEvents.length} {sortedEvents.length === 1 ? 'event' : 'events'}
        </div>
      </div>

      {/* Events Table */}
      {sortedEvents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No events found</p>
          <p className="text-xs text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEvents.map((event) => (
                <tr
                  key={event.id}
                  onClick={() => onEventClick(event.id)}
                  className={`hover:bg-primary/5 transition-colors cursor-pointer ${
                    isPastEvent(event) ? 'opacity-60' : ''
                  }`}
                >
                  {/* Event Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {event.name}
                    </div>
                    {event.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {event.description}
                      </div>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <span>📂</span>
                        {event.sessions_count || 0} {event.sessions_count === 1 ? 'sessione' : 'sessioni'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>💬</span>
                        {event.speeches_count || 0} {event.speeches_count === 1 ? 'intervento' : 'interventi'}
                      </span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(event.date)}
                  </td>

                  {/* Visibility */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.visibility === 'public'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {event.visibility === 'public' ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {event.visibility}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800'
                          : event.status === 'past'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`/events/${event.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-900 active:scale-95 transition-all duration-200 flex items-center gap-1"
                        title="Apri pagina pubblica"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Pubblica
                      </a>
                      <a
                        href={`/admin/events/${event.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 active:scale-95 transition-all duration-200"
                        title={isPastEvent(event) ? 'Visualizza evento' : 'Modifica evento'}
                      >
                        {isPastEvent(event) ? 'Visualizza' : 'Modifica'}
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
