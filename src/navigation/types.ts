// Stack-level routes (public + the tab host)
export type RootStackParamList = {
  Auth:     undefined;
  MainTabs: undefined;
  Test:     undefined;
  // ── Profile sub-screens ───────────────────────────────────────────────────
  PersonalInfo:    undefined;
  Addresses:       undefined;
  AddAddress: {
    editAddress?: {
      id: number;
      label: string;
      apartment: string | null;
      building_name: string | null;
      formatted_address: string | null;
      notes: string | null;
      lat: number | null;
      lng: number | null;
    };
  } | undefined;
  HelpSupport:     undefined;
  Notifications:   undefined;
  PrivacySecurity: undefined;
  // ── Admin navigation ──────────────────────────────────────────────────────
  AdminTabs: undefined;
  AdminOrderDetail: { bookingId: number };
  AdminChatConversation: {
    bookingId:   number;
    customerId:  string;
    customerName: string;
    serviceName?:  string;
    serviceDate?:  string;
    serviceTime?:  string;
    orderStatus?:  string;
  };
};

// Tab-level routes (customer main app tabs)
export type TabParamList = {
  Home:    undefined;
  Booking: { service?: string; serviceId?: number; goToStep2?: boolean } | undefined;
  History: undefined;
  Profile: undefined;
};

// Tab-level routes (admin panel tabs)
export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminOrders:    undefined;
  AdminTeam:      undefined;
  AdminChat:      undefined;
  AdminSettings:  undefined;
};
