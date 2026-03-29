import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const WHATSAPP_NUMBER = '+971400000000';
const SUPPORT_EMAIL   = 'support@sparkleuae.com';
const SUPPORT_PHONE   = '+97140000000';

const POPULAR_TOPICS = [
  'How to reschedule a booking',
  'Cancellation policy',
  'What products do you use?',
  'How to add an address',
  'Payment methods accepted',
  'How to contact my cleaner',
];

const FAQ: { q: string; a: string }[] = [
  { q: 'How to reschedule a booking', a: 'You can reschedule a booking up to 24 hours before the appointment. Go to History, tap the booking, and choose "Reschedule".' },
  { q: 'Cancellation policy', a: 'Free cancellation up to 24 hours before the booking. After that, a 50% cancellation fee applies.' },
  { q: 'What products do you use?', a: 'We use eco-friendly, hospital-grade cleaning products that are safe for children and pets.' },
  { q: 'How to add an address', a: 'Go to Profile → Addresses → Add New Address. Enter your building, apartment, and city details.' },
  { q: 'Payment methods accepted', a: 'We accept all major credit/debit cards, Apple Pay, and Google Pay. Cash payment is available on request.' },
  { q: 'How to contact my cleaner', a: 'Once your booking is confirmed, you will receive the cleaner\'s contact details via SMS and in-app notification.' },
];

const HelpSupportScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const [search, setSearch]     = useState('');
  const [openFaq, setOpenFaq]   = useState<string | null>(null);

  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp.'));
  };
  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => Alert.alert('Error', 'Could not open mail app.'));
  };
  const openPhone = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => Alert.alert('Error', 'Could not open phone.'));
  };

  const filteredFaq = FAQ.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  interface QuickItem { icon: IoniconName; label: string; gradient: [string, string]; }
  const quickItems: QuickItem[] = [
    { icon: 'book-outline',     label: 'FAQ',          gradient: ['#0891B2', '#22D3EE'] },
    { icon: 'play-circle',      label: 'How It Works', gradient: ['#2563EB', '#3B82F6'] },
    { icon: 'locate-outline',   label: 'Track Order',  gradient: ['#10B981', '#34D399'] },
  ];

  interface ContactItem { icon: IoniconName; label: string; sub: string; iconBg: string; onPress: () => void; online?: boolean; }
  const contactItems: ContactItem[] = [
    { icon: 'chatbubbles',      label: 'Live Chat',      sub: 'Chat with us now',        iconBg: '#25D366', onPress: openWhatsApp, online: true },
    { icon: 'logo-whatsapp',    label: 'WhatsApp',       sub: 'Message on WhatsApp',     iconBg: '#25D366', onPress: openWhatsApp },
    { icon: 'mail',             label: 'Email Support',  sub: SUPPORT_EMAIL,             iconBg: '#3B82F6', onPress: openEmail },
    { icon: 'call',             label: 'Call Us',        sub: SUPPORT_PHONE,             iconBg: '#F59E0B', onPress: openPhone },
  ];

  return (
    <View style={s.root}>
      <LinearGradient colors={['#070B18', '#0D1526', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help & Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#22D3EE" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search for help..."
            placeholderTextColor="#475569"
          />
        </View>

        {/* Quick Help */}
        <Text style={s.sectionLabel}>QUICK HELP</Text>
        <View style={s.quickRow}>
          {quickItems.map(item => (
            <TouchableOpacity key={item.label} style={s.quickCard} activeOpacity={0.8}
              onPress={() => Alert.alert(item.label, `${item.label} coming soon.`)}>
              <LinearGradient colors={item.gradient} style={s.quickIcon}>
                <Ionicons name={item.icon} size={26} color="#FFFFFF" />
              </LinearGradient>
              <Text style={s.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Us */}
        <Text style={s.sectionLabel}>CONTACT US</Text>
        <View style={s.card}>
          {/* Online indicator */}
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>online</Text>
          </View>
          {contactItems.map((item, idx) => (
            <TouchableOpacity key={item.label} style={[s.contactRow, idx < contactItems.length - 1 && s.rowBorder]} onPress={item.onPress} activeOpacity={0.75}>
              <View style={[s.contactIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={20} color="#FFFFFF" />
              </View>
              <View style={s.contactMeta}>
                <Text style={s.contactLabel}>{item.label}</Text>
                <Text style={s.contactSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#334155" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular Topics / FAQ */}
        <Text style={s.sectionLabel}>POPULAR TOPICS</Text>
        <View style={s.card}>
          {(search ? filteredFaq : FAQ).map((item, idx) => (
            <View key={item.q}>
              <TouchableOpacity
                style={[s.faqRow, idx < FAQ.length - 1 && s.rowBorder]}
                onPress={() => setOpenFaq(openFaq === item.q ? null : item.q)}
                activeOpacity={0.75}
              >
                <Text style={s.faqQuestion}>{item.q}</Text>
                <Ionicons name={openFaq === item.q ? 'chevron-up' : 'chevron-forward'} size={16} color="#334155" />
              </TouchableOpacity>
              {openFaq === item.q && (
                <View style={s.faqAnswer}>
                  <Text style={s.faqAnswerText}>{item.a}</Text>
                </View>
              )}
            </View>
          ))}
          {search && filteredFaq.length === 0 && (
            <Text style={s.noResults}>No results for "{search}"</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F1F5F9' },

  content: { padding: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.8, marginTop: 20, marginBottom: 12 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(34,211,238,0.30)',
    paddingHorizontal: 14, marginBottom: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 13, color: '#F1F5F9', fontSize: 14 },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  quickCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 14, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  onlineText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },

  contactRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  contactIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactMeta: { flex: 1 },
  contactLabel: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  contactSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  faqRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '500', color: '#E2E8F0' },
  faqAnswer: { paddingHorizontal: 16, paddingBottom: 14, backgroundColor: 'rgba(34,211,238,0.04)' },
  faqAnswerText: { fontSize: 13, color: '#94A3B8', lineHeight: 20 },
  noResults: { textAlign: 'center', color: '#64748B', fontSize: 14, padding: 24 },
});

export default HelpSupportScreen;
