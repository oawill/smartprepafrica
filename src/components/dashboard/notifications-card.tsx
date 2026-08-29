import Link from "next/link";
import { Card } from "@/components/dashboard/card";
import { markNotificationRead, markAllNotificationsRead } from "@/app/dashboard/notification-actions";

/** Reusable across every role's dashboard — mirrors the visual pattern
 * already used for partner-only notifications, backed by the general
 * Notification model instead. `path` is the calling dashboard route, so the
 * shared mark-read actions know what to revalidate. */
export function NotificationsCard({
  notifications,
  path,
}: {
  notifications: { id: string; message: string; link: string | null }[];
  path: string;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="mt-4">
      <Card title={`Notifications (${notifications.length} unread)`}>
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <p className="text-sm text-text-secondary">
                {n.link ? (
                  <Link href={n.link} className="hover:text-brand-text hover:underline">
                    {n.message}
                  </Link>
                ) : (
                  n.message
                )}
              </p>
              <form action={markNotificationRead}>
                <input type="hidden" name="notificationId" value={n.id} />
                <input type="hidden" name="path" value={path} />
                <button type="submit" className="shrink-0 text-xs text-text-muted hover:text-text-secondary">
                  Dismiss
                </button>
              </form>
            </div>
          ))}
        </div>
        {notifications.length > 1 && (
          <form action={markAllNotificationsRead} className="mt-2">
            <input type="hidden" name="path" value={path} />
            <button type="submit" className="text-xs text-text-secondary hover:underline">
              Mark all as read
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
