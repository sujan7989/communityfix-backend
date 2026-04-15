import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';

const STATUS_CONFIG = {
  Pending: { bg: '#FEF3C7', text: '#92400E', icon: '🕐' },
  'In Progress': { bg: '#DBEAFE', text: '#1E40AF', icon: '🔧' },
  Resolved: { bg: '#D1FAE5', text: '#065F46', icon: '✅' },
};

const URGENCY_COLOR = { Low: '#16A34A', Medium: '#D97706', High: '#DC2626' };

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/api/complaints/user/list');
      setComplaints(res.data?.data || []);
    } catch (err) {
      // silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchComplaints();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Summary counts
  const counts = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'Pending').length,
    inProgress: complaints.filter((c) => c.status === 'In Progress').length,
    resolved: complaints.filter((c) => c.status === 'Resolved').length,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchComplaints(); }} colors={['#2563EB']} />
      }
    >
      {/* ── Profile Card ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>👤 {user?.role}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🏘️ {user?.communityId}</Text>
          </View>
          {user?.flatNumber ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🏠 {user.flatNumber}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: counts.total, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Pending', value: counts.pending, color: '#D97706', bg: '#FEF3C7' },
          { label: 'In Progress', value: counts.inProgress, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Resolved', value: counts.resolved, color: '#059669', bg: '#D1FAE5' },
        ].map(({ label, value, color, bg }) => (
          <View key={label} style={[styles.statCard, { backgroundColor: bg }]}>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={[styles.statLabel, { color }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── My Complaints ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Complaints</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MyComplaints')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 24 }} />
      ) : complaints.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No complaints submitted yet</Text>
        </View>
      ) : (
        complaints.map((item) => {
          const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => navigation.navigate('ComplaintDetail', { complaint: item, complaintId: item.id })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>
                    {sc.icon} {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>📍 {item.location}</Text>
                <View style={[styles.urgencyDot, { backgroundColor: URGENCY_COLOR[item.urgency] + '22' }]}>
                  <View style={[styles.dot, { backgroundColor: URGENCY_COLOR[item.urgency] || '#94A3B8' }]} />
                  <Text style={[styles.urgencyText, { color: URGENCY_COLOR[item.urgency] }]}>
                    {item.urgency}
                  </Text>
                </View>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: item.status === 'Pending' ? '15%'
                        : item.status === 'In Progress' ? '55%'
                          : '100%',
                      backgroundColor: sc.text,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪  Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },

  // Profile card
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#1E3A5F' },
  email: { fontSize: 13, color: '#64748B', marginTop: 2, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 0 },
  badge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, margin: 4 },
  badgeText: { fontSize: 12, color: '#475569', fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A5F' },
  seeAll: { fontSize: 13, color: '#2563EB', fontWeight: '600' },

  // Complaint card
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  metaText: { fontSize: 11, color: '#94A3B8', flex: 1 },
  urgencyDot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 11, color: '#94A3B8' },

  // Progress bar
  progressBar: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#94A3B8' },

  // Logout
  logoutBtn: { marginTop: 24, borderWidth: 1.5, borderColor: '#FECACA', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#FFF5F5' },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
});
