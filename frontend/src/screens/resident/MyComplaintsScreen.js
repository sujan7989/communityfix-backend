import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

const STATUS_COLORS = {
  Pending: { bg: '#FEF3C7', text: '#92400E', icon: '🕐' },
  'In Progress': { bg: '#DBEAFE', text: '#1E40AF', icon: '🔧' },
  Resolved: { bg: '#D1FAE5', text: '#065F46', icon: '✅' },
};

const URGENCY_COLORS = {
  Low: '#16A34A', Medium: '#D97706', High: '#DC2626',
};

const FILTERS = ['All', 'Pending', 'In Progress', 'Resolved'];

export default function MyComplaintsScreen({ navigation }) {
  const [complaints, setComplaints] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchComplaints = async () => {
    try {
      setError(null);
      const res = await api.get('/api/complaints/user/list');
      setComplaints(res.data?.data || []);
    } catch (err) {
      setError(err.message);
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

  const filtered = activeFilter === 'All'
    ? complaints
    : complaints.filter((c) => c.status === activeFilter);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.Pending;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ComplaintDetail', { complaint: item, complaintId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{sc.icon} {item.status}</Text>
          </View>
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>📍 {item.location}</Text>
          <View style={styles.urgencyPill}>
            <View style={[styles.dot, { backgroundColor: URGENCY_COLORS[item.urgency] || '#94A3B8' }]} />
            <Text style={[styles.urgencyText, { color: URGENCY_COLORS[item.urgency] || '#94A3B8' }]}>
              {item.urgency}
            </Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Status progress bar */}
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            {
              width: item.status === 'Pending' ? '15%'
                : item.status === 'In Progress' ? '55%'
                  : '100%',
              backgroundColor: sc.text,
            },
          ]} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const count = f === 'All' ? complaints.length : complaints.filter((c) => c.status === f).length;
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {f === 'In Progress' ? 'Active' : f}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchComplaints(); }}
            colors={['#2563EB']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {activeFilter === 'All' ? '📭' : activeFilter === 'Pending' ? '🕐' : activeFilter === 'In Progress' ? '🔧' : '✅'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'All' ? 'No complaints yet' : `No ${activeFilter} complaints`}
            </Text>
            {activeFilter === 'All' && (
              <Text style={styles.emptySubtitle}>Submit a complaint from the Home tab</Text>
            )}
          </View>
        }
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={styles.count}>
              {filtered.length} complaint{filtered.length !== 1 ? 's' : ''}
              {activeFilter !== 'All' ? ` · ${activeFilter}` : ''}
            </Text>
          ) : null
        }
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={fetchComplaints}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Filter bar
  filterRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 8, marginHorizontal: 3 },
  filterTabActive: { backgroundColor: '#EFF6FF' },
  filterText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  filterTextActive: { color: '#2563EB' },
  filterBadge: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  filterBadgeActive: { backgroundColor: '#BFDBFE' },
  filterBadgeText: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
  filterBadgeTextActive: { color: '#1E40AF' },

  listContent: { padding: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  count: { fontSize: 12, color: '#94A3B8', marginBottom: 8 },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardMeta: { fontSize: 11, color: '#94A3B8', flex: 1 },
  urgencyPill: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 4 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 11, color: '#94A3B8' },

  // Progress bar
  progressTrack: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  // Empty
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 52, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 6, textAlign: 'center' },

  // Error
  errorBanner: { backgroundColor: '#FEF2F2', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  retryText: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
});
