// Servicio principal
export {
  createClientNotification,
  markAsRead,
  markAsClicked,
  getClientNotifications,
  getUnreadCount,
  deleteNotification,
  getNotificationsHistory,
} from './studio-client-notification.service';

// Utilidades
export { buildRoute } from './utils';

// Helpers por tipo
export {
  notifyDeliverableAdded,
  notifyDeliverableUpdated,
  notifyDeliverableDeleted,
} from './helpers/deliverable-notifications';

export {
  notifyPaymentReceived,
  notifyPaymentCancelled,
} from './helpers/payment-notifications';

export {
  notifyContractAvailable,
} from './helpers/contract-notifications';

export {
  notifyEventStageChanged,
} from './helpers/event-notifications';

// Types
export type {
  CreateClientNotificationInput,
  ClientNotificationMetadata,
  ClientNotificationRouteParams,
} from './types';

export { ClientNotificationType, NotificationPriority } from './types';

