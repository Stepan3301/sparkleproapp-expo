export interface BookingAddressRow {
  street?: string | null;
  city?: string | null;
  apartment?: string | null;
  building_name?: string | null;
  formatted_address?: string | null;
  emirate?: string | null;
  label?: string | null;
}

export function formatBookingAddress(
  booking: {
    custom_address?: string | null;
    addresses?: BookingAddressRow | BookingAddressRow[] | null;
  },
  fallback = '—',
): string {
  const custom = booking.custom_address?.trim();
  if (custom) return custom;

  const raw = booking.addresses;
  const addr = Array.isArray(raw) ? raw[0] : raw;
  if (!addr) return fallback;

  const line =
    addr.formatted_address?.trim() ||
    [addr.building_name, addr.street, addr.apartment ? `Apt ${addr.apartment}` : null]
      .filter(Boolean)
      .join(', ')
      .trim();

  if (!line) return fallback;

  const city = addr.city?.trim();
  if (city && !line.toLowerCase().includes(city.toLowerCase())) {
    return `${line}, ${city}`;
  }
  return line;
}
