import { Booking, BookingStatus } from '../types/booking';

export const canCancelBooking = (booking: Booking): boolean => {
  const allowedStatuses: BookingStatus[] = ['pending', 'confirmed'];
  if (!allowedStatuses.includes(booking.status)) return false;
  const now = new Date();
  const serviceDateTime = new Date(`${booking.service_date}T${booking.service_time}`);
  const hoursUntil = (serviceDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil > 24;
};

export const getCancellationBlockedReason = (booking: Booking): string => {
  const allowedStatuses: BookingStatus[] = ['pending', 'confirmed'];
  if (!allowedStatuses.includes(booking.status)) {
    switch (booking.status) {
      case 'in_progress': return 'Cannot cancel a booking that is currently in progress';
      case 'completed':   return 'Cannot cancel a completed booking';
      case 'cancelled':   return 'Booking is already cancelled';
      default:            return 'Cannot cancel booking with current status';
    }
  }
  const now = new Date();
  const serviceDateTime = new Date(`${booking.service_date}T${booking.service_time}`);
  const hoursUntil = (serviceDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil <= 0) return 'Service time has already passed';
  if (hoursUntil <= 24) return `Less than 24 hours to service (${Math.round(hoursUntil)}h remaining)`;
  return 'Cancellation not allowed';
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
