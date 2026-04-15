import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, StatusBar, Modal, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_TABS = ['All', 'Pending', 'In Progress', 'Resolved'];
const STATUS_COLORS = {
  Pending: { bg: '#FEF3C7', text: '#92400E' },
  'In Progress': { bg: '#DBEAFE', text: '#1E40AF' },
  Resolved: { bg: '#D1FAE5', text: '#065F46' },
};
const URGENCY_COLORS = { Low: '#16A34A', Medium: '#D97706', High: '#DC2626' };

export default function AdminPanelScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('In Progress');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [sortBy, setSortBy] = useState('date');

  const fetchComplaints = async () => {
    try {
      setError(null);
      const res = await api.get('/api/complaints/admin/all');
      const data = res.data?.data || [];
      setComplaints(data);
      applyFilter(data, activeTab, search, sortBy);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchComplaints(); }, []));

  const applyFilter = (data, tab, q, sort) => {
    let result = [...data];
    if (tab !== 'All') result = result.filter((c) => c.status === tab);
    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter((c) =>
        c.title?.toLowerCase().includes(lower) ||
        c.location?.toLowerCase().includes(lower) ||
        c.userName?.toLowerCase().includes(lower) ||
        c.category?.toLowerCase().includes(lower)
      );
    }
    if (sort === 'urgency') {
      const order = { High: 0, Medium: 1, Low: 2 };
      result.sort((a, b) => (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3));
    } else if (sort === 'sla') {
      result.sort((a, b) => {
        const da = a.createdAt?._seconds || 0;
        const db = b.createdAt?._seconds || 0;
        return da - db;
      });
    }
    setFiltered(result);
  };

  const handleTabChange = (tab) => { setActiveTab(tab); applyFilter(complaints, tab, search, sortBy); };
  const handleSearch = (q) => { setSearch(q); applyFilter(complaints, activeTab, q, sortBy); };
  const handleSort = (s) => { setSortBy(s); applyFilter(complaints, activeTab, search, s); };

  const getDaysOpen = (ts) => {
    if (!ts) return 0;
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const counts = {
    All: complaints.length,
    Pending: complaints.filter((c) => c.status === 'Pending').length,
    'In Progress': complaints.filter((c) => c.status === 'In Progress').length,
    Resolved: complaints.filter((c) => c.status === 'Resolved').length,
  };

  const resolutionRate = complaints.length > 0
    ? Math.round((counts.Resolved / complaints.length) * 100) : 0;

  const avgDaysOpen = complaints.filter((c) => c.status !== 'Resolved').length > 0
    ? Math.round(complaints.filter((c) => c.status !== 'Resolved')
      .reduce((sum, c) => sum + getDaysOpen(c.createdAt), 0) /
      complaints.filter((c) => c.status !== 'Resolved').length)
    : 0;

  const categoryStats = complaints.reduce((acc, c) => {
    acc[c.category || 'Other'] = (acc[c.category || 'Other'] || 0) + 1;
    return acc;
  }, {});

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => api.put(`/api/complaints/${id}`, { status: bulkStatus })));
      Alert.alert('Success', `${selectedIds.length} complaints updated to ${bulkStatus}`);
      setSelectedIds([]);
      setBulkMode(false);
      setShowBulkModal(false);
      fetchComplaints();
    } catch (err) {
      Alert.alert('Error', 'Could not update some complaints');
    }
  };

  const renderItem = ({ item }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.Pending;
    const days = getDaysOpen(item.createdAt);
    const isOverdue = days > 3 && item.status !== 'Resolved';
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected, isOverdue && styles.cardOverdue]}
        onPress={() => {
          if (bulkMode) { toggleSelect(item.id); return; }
          navigation.navigate('ComplaintManage', { complaint: item, onUpdate: fetchComplaints });
        }}
        onLongPress={() => { setBulkMode(true); toggleSelect(item.id); }}
        activeOpacity={0.75}
      >
        {bulkMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta} numberOfLines={1}>👤 {item.userName || 'Unknown'}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>📍 {item.location}</Text>
        </View>
        <View style={styles.cardFooter2}>
          <View style={[styles.urgencyTag, { backgroundColor: (URGENCY_COLORS[item.urgency] || '#94A3B8') + '20' }]}>
            <Text style={[styles.urgencyTagText, { color: URGENCY_COLORS[item.urgency] || '#94A3B8' }]}>{item.urgency || 'N/A'}</Text>
          </View>
          <Text style={styles.categoryTag}>🏷️ {item.category || 'Other'}</Text>
          {isOverdue && <Text style={styles.overdueTag}>⚠️ {days}d overdue</Text>}
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={[styles.center, { paddingTop: insets.top }]}><ActivityIndicator size="large" color="#2563EB" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      <LinearGradient colors={['#1E3A5F', '#2563EB']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>🏛️ Admin Panel</Text>
            <Text style={styles.headerSub}>{user?.name?.split(' ')[0]} · {user?.communityId}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.analyticsBtn} onPress={() => setShowAnalytics(true)}>
              <Text style={styles.analyticsBtnText}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: counts.All, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Pending', value: counts.Pending, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Active', value: counts['In Progress'], color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Resolved', value: counts.Resolved, color: '#059669', bg: '#D1FAE5' },
        ].map(({ label, value, color, bg }) => (
          <View key={label} style={[styles.statCard, { backgroundColor: bg }]}>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={[styles.statLabel, { color }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.toolRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {[['date', '📅 Latest'], ['urgency', '🔴 Priority'], ['sla', '⏱️ Oldest']].map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.sortBtn, sortBy === key && styles.sortBtnActive]} onPress={() => handleSort(key)}>
              <Text style={[styles.sortBtnText, sortBy === key && styles.sortBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {bulkMode && (
          <View style={styles.bulkActions}>
            <Text style={styles.bulkCount}>{selectedIds.length} selected</Text>
            <TouchableOpacity style={styles.bulkUpdateBtn} onPress={() => setShowBulkModal(true)}>
              <Text style={styles.bulkUpdateText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setBulkMode(false); setSelectedIds([]); }}>
              <Text style={styles.bulkCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TextInput style={styles.searchInput} placeholder="🔍  Search complaints..." placeholderTextColor="#94A3B8" value={search} onChangeText={handleSearch} />

      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => handleTabChange(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'In Progress' ? 'Active' : tab}</Text>
            <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>{counts[tab]}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchComplaints(); }} colors={['#2563EB']} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>{search ? 'No results found' : 'No complaints found'}</Text>
            {search ? <TouchableOpacity onPress={() => handleSearch('')}><Text style={styles.clearSearch}>Clear search</Text></TouchableOpacity> : null}
          </View>
        }
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={fetchComplaints}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      )}

      {/* Analytics Modal */}
      <Modal visible={showAnalytics} animationType="slide" transparent onRequestClose={() => setShowAnalytics(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Analytics Dashboard</Text>
              <TouchableOpacity onPress={() => setShowAnalytics(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.analyticsRow}>
                <View style={[styles.analyticsCard, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={styles.analyticsValue}>{resolutionRate}%</Text>
                  <Text style={styles.analyticsLabel}>Resolution Rate</Text>
                </View>
                <View style={[styles.analyticsCard, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={styles.analyticsValue}>{avgDaysOpen}d</Text>
                  <Text style={styles.analyticsLabel}>Avg Days Open</Text>
                </View>
              </View>
              <Text style={styles.analyticsSectionTitle}>By Category</Text>
              {Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <View key={cat} style={styles.categoryStatRow}>
                  <Text style={styles.categoryStatLabel}>{cat}</Text>
                  <View style={styles.categoryStatBar}>
                    <View style={[styles.categoryStatFill, { width: `${count / complaints.length * 100}%` }]} />
                  </View>
                  <Text style={styles.categoryStatCount}>{count}</Text>
                </View>
              ))}
              <Text style={styles.analyticsSectionTitle}>By Urgency</Text>
              {['High', 'Medium', 'Low'].map((u) => {
                const cnt = complaints.filter((c) => c.urgency === u).length;
                return (
                  <View key={u} style={styles.categoryStatRow}>
                    <Text style={[styles.categoryStatLabel, { color: URGENCY_COLORS[u] }]}>{u}</Text>
                    <View style={styles.categoryStatBar}>
                      <View style={[styles.categoryStatFill, { width: complaints.length > 0 ? `${cnt / complaints.length * 100}%` : '0%', backgroundColor: URGENCY_COLORS[u] }]} />
                    </View>
                    <Text style={styles.categoryStatCount}>{cnt}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bulk Update Modal */}
      <Modal visible={showBulkModal} animationType="slide" transparent onRequestClose={() => setShowBulkModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: 320 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Update {selectedIds.length} complaints</Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={styles.bulkLabel}>Set status to:</Text>
              {['Pending', 'In Progress', 'Resolved'].map((s) => (
                <TouchableOpacity key={s} style={[styles.bulkOption, bulkStatus === s && styles.bulkOptionActive]} onPress={() => setBulkStatus(s)}>
                  <Text style={[styles.bulkOptionText, bulkStatus === s && styles.bulkOptionTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.bulkConfirmBtn} onPress={handleBulkUpdate}>
                <Text style={styles.bulkConfirmText}>Confirm Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  analyticsBtn: { backgroundColor: 'rgba(255,255,255,0.2)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  analyticsBtnText: { fontSize: 18 },
  logoutBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', marginHorizontal: 3 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  toolRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8, backgroundColor: '#fff' },
  sortBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  sortBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  sortBtnTextActive: { color: '#2563EB' },
  bulkActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, gap: 8 },
  bulkCount: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  bulkUpdateBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bulkUpdateText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  bulkCancelText: { color: '#DC2626', fontWeight: '600', fontSize: 12 },
  searchInput: { margin: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 11, fontSize: 14, backgroundColor: '#fff', color: '#1E293B' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, marginHorizontal: 2 },
  tabActive: { backgroundColor: '#EFF6FF' },
  tabText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  tabTextActive: { color: '#2563EB' },
  tabBadge: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 3 },
  tabBadgeActive: { backgroundColor: '#BFDBFE' },
  tabBadgeText: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  tabBadgeTextActive: { color: '#1E40AF' },
  listContent: { padding: 12, paddingBottom: 24 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardSelected: { borderWidth: 2, borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  cardOverdue: { borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  checkboxSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', marginBottom: 4 },
  cardFooter2: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardMeta: { fontSize: 11, color: '#94A3B8', marginRight: 12, flex: 1 },
  urgencyTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
  urgencyTagText: { fontSize: 11, fontWeight: '700' },
  categoryTag: { fontSize: 11, color: '#64748B', marginRight: 8 },
  overdueTag: { fontSize: 11, color: '#DC2626', fontWeight: '700', marginRight: 8 },
  cardDate: { fontSize: 11, color: '#94A3B8', marginLeft: 'auto' },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  clearSearch: { color: '#2563EB', fontWeight: '600', marginTop: 8, fontSize: 14 },
  errorBanner: { backgroundColor: '#FEF2F2', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  retryText: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E3A5F' },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  analyticsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  analyticsCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  analyticsValue: { fontSize: 28, fontWeight: '800', color: '#1E3A5F' },
  analyticsLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4, textAlign: 'center' },
  analyticsSectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 8 },
  categoryStatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  categoryStatLabel: { width: 90, fontSize: 12, color: '#374151', fontWeight: '600' },
  categoryStatBar: { flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  categoryStatFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 5 },
  categoryStatCount: { width: 24, fontSize: 12, color: '#64748B', fontWeight: '700', textAlign: 'right' },
  bulkLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  bulkOption: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8, backgroundColor: '#fff' },
  bulkOptionActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  bulkOptionText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  bulkOptionTextActive: { color: '#2563EB', fontWeight: '700' },
  bulkConfirmBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  bulkConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
