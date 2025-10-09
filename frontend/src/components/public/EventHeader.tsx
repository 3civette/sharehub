// Feature 004: Public Event Page - Event Header Component
// Date: 2025-10-07
// Displays event name, date, status, and description

interface EventHeaderProps {
  event: {
    name: string;
    title: string;
    organizer?: string;
    date: string;
    status: 'upcoming' | 'past' | 'archived';
    description: string | null;
  };
}

const STATUS_STYLES = {
  upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
  past: 'bg-gray-100 text-gray-800 border-gray-200',
  archived: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const STATUS_LABELS = {
  upcoming: 'Upcoming',
  past: 'Past',
  archived: 'Archived',
};

export default function EventHeader({ event }: EventHeaderProps) {
  // Format date using Intl.DateTimeFormat
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(event.date));

  return (
    <header className="mb-8 pb-6 border-b border-gray-200">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {event.title}
          </h1>
          {event.organizer && (
            <p className="text-md text-gray-700 mb-1">
              <span className="font-medium">Organizzatore:</span> {event.organizer}
            </p>
          )}
          <p className="text-lg text-gray-600">{formattedDate}</p>
        </div>

        <div className="flex-shrink-0">
          <span
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${
              STATUS_STYLES[event.status]
            }`}
          >
            {STATUS_LABELS[event.status]}
          </span>
        </div>
      </div>

      {event.description && (
        <p className="mt-4 text-gray-700 leading-relaxed">{event.description}</p>
      )}
    </header>
  );
}
