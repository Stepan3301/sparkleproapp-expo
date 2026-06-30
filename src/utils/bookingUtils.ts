import { Booking, BookingStatus } from '../types/booking';
import { TOptions } from './i18n';

type TranslateFn = (key: string, fallback?: string, options?: TOptions) => string;

export const canCancelBooking = (booking: Booking): boolean => {
  const allowedStatuses: BookingStatus[] = ['pending', 'confirmed'];
  if (!allowedStatuses.includes(booking.status)) return false;
  const now = new Date();
  const serviceDateTime = new Date(`${booking.service_date}T${booking.service_time}`);
  const hoursUntil = (serviceDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil > 24;
};

export const getCancellationBlockedReason = (booking: Booking, t?: TranslateFn): string => {
  const tr = t ?? ((key: string, fb?: string) => fb ?? key);
  const allowedStatuses: BookingStatus[] = ['pending', 'confirmed'];
  if (!allowedStatuses.includes(booking.status)) {
    switch (booking.status) {
      case 'in_progress': return tr('ui.cancellation.inProgress', 'Cannot cancel a booking that is currently in progress');
      case 'completed':   return tr('ui.cancellation.completed', 'Cannot cancel a completed booking');
      case 'cancelled':   return tr('ui.cancellation.alreadyCancelled', 'Booking is already cancelled');
      default:            return tr('ui.cancellation.unknownStatus', 'Cannot cancel booking with current status');
    }
  }
  const now = new Date();
  const serviceDateTime = new Date(`${booking.service_date}T${booking.service_time}`);
  const hoursUntil = (serviceDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil <= 0) return tr('ui.cancellation.timePassed', 'Service time has already passed');
  if (hoursUntil <= 24) {
    return tr('ui.cancellation.lessThan24h', 'Less than 24 hours to service', {
      values: { hours: Math.round(hoursUntil) },
    });
  }
  return tr('ui.cancellation.unknownStatus', 'Cancellation not allowed');
};

export const getTimeUntilService = (booking: Booking): string => {
  const now = new Date();
  const serviceDateTime = new Date(`${booking.service_date}T${booking.service_time}`);
  const ms = serviceDateTime.getTime() - now.getTime();
  if (ms <= 0) return 'Service time has passed';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
