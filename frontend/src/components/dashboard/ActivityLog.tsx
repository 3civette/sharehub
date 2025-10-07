'use client';

interface Activity {
  id: string;
  actor_type: 'admin' | 'organizer' | 'participant' | 'system';
  action_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface ActivityLogProps {
  activities: Activity[];
}

export default function ActivityLog({ activities }: ActivityLogProps) {
  const getActivityIcon = (actorType: string) => {
    switch (actorType) {
      case 'admin':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'organizer':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case 'participant':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const getActionDescription = (activity: Activity) => {
    const actionMap: Record<string, string> = {
      event_created: 'ha creato un evento',
      event_updated: 'ha aggiornato un evento',
      event_deleted: 'ha eliminato un evento',
      slide_uploaded: 'ha caricato una slide',
      slide_deleted: 'ha eliminato una slide',
      slide_viewed: 'ha visualizzato una slide',
      slide_downloaded: 'ha scaricato una slide',
      branding_updated: 'ha aggiornato il branding',
      admin_login: 'ha effettuato l\'accesso',
      admin_logout: 'ha effettuato il logout',
    };

    const description = actionMap[activity.action_type] || activity.action_type;
    const metadata = activity.metadata?.event_title ? ` "${activity.metadata.event_title}"` : '';

    return `${description}${metadata}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Proprio ora';
    if (minutes < 60) return `${minutes} minut${minutes === 1 ? 'o' : 'i'} fa`;
    if (hours < 24) return `${hours} or${hours === 1 ? 'a' : 'e'} fa`;
    return `${days} giorn${days === 1 ? 'o' : 'i'} fa`;
  };

  const getActorColor = (actorType: string) => {
    switch (actorType) {
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'organizer':
        return 'bg-green-100 text-green-700';
      case 'participant':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attività Recenti</h3>
        <p className="text-gray-500 text-center py-8">Nessuna attività recente</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Attività Recenti</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className={`p-2 rounded-full ${getActorColor(activity.actor_type)}`}>
              {getActivityIcon(activity.actor_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium capitalize">{activity.actor_type}</span>{' '}
                {getActionDescription(activity)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatTimestamp(activity.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
