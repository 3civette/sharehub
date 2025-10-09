'use client';

import { User, Upload, Eye, Zap } from 'lucide-react';

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
        return <User className="w-5 h-5" />;
      case 'organizer':
        return <Upload className="w-5 h-5" />;
      case 'participant':
        return <Eye className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
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
        return 'bg-primary/10 text-primary';
      case 'organizer':
        return 'bg-green-100 text-green-700';
      case 'participant':
        return 'bg-secondary/10 text-secondary';
      default:
        return 'bg-brandSilver text-brandInk';
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <h3 className="text-lg font-semibold text-brandBlack mb-4">Attività Recenti</h3>
        <p className="text-brandInk/50 text-center py-8">Nessuna attività recente</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      <h3 className="text-lg font-semibold text-brandBlack mb-4">Attività Recenti</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-bgSoft transition-colors"
          >
            <div className={`p-2 rounded-full ${getActorColor(activity.actor_type)}`}>
              {getActivityIcon(activity.actor_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-brandBlack">
                <span className="font-medium capitalize">{activity.actor_type}</span>{' '}
                {getActionDescription(activity)}
              </p>
              <p className="text-xs text-brandInk/50 mt-1">
                {formatTimestamp(activity.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
