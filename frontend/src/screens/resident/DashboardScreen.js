import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, Animated, RefreshControl, Modal, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';

const CATEGORY_ICONS = {
  Garbage: '🗑️', Water: '💧', Electricity: '⚡', Fire: '🔥',
  Road: '🚧', Security: '🔒', Maintenance: '🔧', Other: '📋',
};

const STATUS_COLORS = {
  Pending: { bg: '#FEF3C7', text: '#92400E', icon: '🕐' },
  'In Progress': { bg: '#DBEAFE', text: '#1E40AF', icon: '🔧' },
  Resolved: { bg: '#D1FAE5', text: '#065F46', icon: '✅' },
};

const URGENCY_COLORS = { Low: '#16A34A', Medium: '#D97706', High: '#DC2626' };

const QUICK_ACTIONS = [
  { id: 'submit', icon: '📝', title: 'Submit Complaint', subtitle: 'Report a community issue', colors: ['#4F46E5', '#2563EB'], screen: 'SubmitComplaint' },
  { id: 'complaints', icon: '📋', title: 'My Complaints', subtitle: 'Track your submitted issues', colors: ['#0F766E', '#0D9488'], tab: 'ComplaintsTab' },
  { id: 'profile', icon: '👤', title: 'My Profile', subtitle: 'View profile & history', colors: ['#7C3AED', '#6D28D9'], tab: 'ProfileTab' },
];

const STAT_CONFIG = [
  { key: 'total', label: 'Total', color: '#6366F1', bg: '#EEF2FF', icon: '📊', filter: 'All' },
  { key: 'pending', label: 'Pending', color: '#D97706', bg: '#FEF3C7', icon: '🕐', filter: 'Pending' },
  { key: 'inProgress', label: 'Active', color: '#2563EB', bg: '#DBEAFE', icon: '🔧', filter: 'In Progress' },
  { key: 'resolved', label: 'Resolved', color: '#059669', bg: '#D1FAE5', icon: '✅', filter: 'Resolved' },
];

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [allComplaints, setAllComplaints] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFilter, setModalFilter] = useState('All');
  const [modalComplaints, setModalComplaints] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/complaints/user/list');
      const data = res.data?.data || [];
      setAllComplaints(data);
      setCounts({
        total: data.length,
        pending: data.filter((c) => c.status === 'Pending').length,
        inProgress: data.filter((c) => c.status === 'In Progress').length,
        resolved: data.filter((c) => c.status === 'Resolved').length,
      });
    } catch (_) { }
    finally { setLoadingStats(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoadingStats(true); fetchData(); }, []));

  const handleStatPress = (stat) => {
    const filtered = stat.filter === 'All' ? allComplaints : allComplaints.filter((c) => c.status === stat.filter);
    setModalFilter(stat.label);
    setModalComplaints(filtered);
    setModalVisible(true);
  };

  const handleAction = (action) => {
    if (action.screen) navigation.navigate(action.screen);
    else if (action.tab) navigation.getParent()?.navigate(action.tab);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderModalItem = ({ item }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.Pending;
    const isResolved = item.status === 'Resolved';
    return (
      <TouchableOpacity
        style={styles.modalCard}
        onPress={() => { setModalVisible(false); navigation.navigate('ComplaintDetail', { complaint: item, complaintId: item.id }); }}
        activeOpacity={0.8}
      >
        <View style={styles.modalCardHeader}>
          <Text style={styles.modalCategoryIcon}>{CATEGORY_ICONS[item.category] || '📋'}</Text>
          <View style={styles.modalCardInfo}>
            <Text style={styles.modalCardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.modalCardDate}>📅 {formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.modalStatusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.modalStatusText, { color: sc.text }]}>{sc.icon}</Text>
          </View>
        </View>
        <Text style={styles.modalCardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.modalCardFooter}>
          <Text style={styles.modalCardMeta}>📍 {item.location}</Text>
          <View style={[styles.urgencyTag, { backgroundColor: (URGENCY_COLORS[item.urgency] || '#94A3B8') + '20' }]}>
            <Text style={[styles.urgencyTagText, { color: URGENCY_COLORS[item.urgency] || '#94A3B8' }]}>{item.urgency}</Text>
          </View>
        </View>
        {isResolved && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Rate this resolution:</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star} style={styles.star}>{star <= (item.rating || 0) ? '⭐' : '☆'}</Text>
              ))}
            </View>
            {item.adminComments ? (
              <Text style={styles.officialResponse}>💬 {item.adminComments}</Text>
            ) : null}
          </View>
        )}
        {item.updatedAt && item.status !== 'Pending' && (
          <Text style={styles.updatedAt}>🔄 Updated: {formatDate(item.updatedAt)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={['#2563EB']} />}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <LinearGradient colors={['#1E3A5F', '#2563EB']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
              <View style={styles.communityBadge}>
                <Text style={styles.communityText}>🏘️ {user?.communityId}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('ProfileTab')}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Your Activity - HORIZONTAL */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Your Activity</Text>
        <View style={styles.statsRow}>
          {loadingStats ? (
            <ActivityIndicator color="#2563EB" style={{ marginVertical: 16, flex: 1 }} />
          ) : (
            STAT_CONFIG.map((stat) => (
              <TouchableOpacity
                key={stat.key}
                style={[styles.statCard, { backgroundColor: stat.bg }]}
                onPress={() => handleStatPress(stat)}
                activeOpacity={0.75}
              >
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{counts[stat.key]}</Text>
                <Text style={[styles.statLabel, { color: stat.color }]}>{stat.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      {QUICK_ACTIONS.map((action) => (
        <Animated.View key={action.id} style={{ opacity: fadeAnim }}>
          <TouchableOpacity style={styles.actionCard} onPress={() => handleAction(action)} activeOpacity={0.85}>
            <LinearGradient colors={action.colors} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          Tap any activity card above to view your complaints by status with full details.
        </Text>
      </View>

      {/* Modal for complaint details */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalFilter} Complaints</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalCount}>{modalComplaints.length} complaint{modalComplaints.length !== 1 ? 's' : ''}</Text>
            {modalComplaints.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyIcon}>📭</Text>
                <Text style={styles.modalEmptyText}>No {modalFilter.toLowerCase()} complaints</Text>
              </View>
            ) : (
              <FlatList
                data={modalComplaints}
                keyExtractor={(item) => item.id}
                renderItem={renderModalItem}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 32 },

  headerGradient: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, marginBottom: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  userName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  communityBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  communityText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },

  statsSection: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A5F', marginBottom: 12, paddingHorizontal: 16 },

  // HORIZONTAL stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', marginHorizontal: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },

  actionCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  actionGradient: { padding: 18, flexDirection: 'row', alignItems: 'center' },
  actionIcon: { fontSize: 28, marginRight: 14 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  actionSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  actionArrow: { fontSize: 22, color: 'rgba(255,255,255,0.8)' },

  infoCard: { flexDirection: 'row', backgroundColor: '#EFF6FF', borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 8, borderLeftWidth: 4, borderLeftColor: '#2563EB' },
  infoIcon: { fontSize: 18, marginRight: 10, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingTop: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E3A5F' },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  modalCount: { fontSize: 12, color: '#94A3B8', paddingHorizontal: 20, paddingVertical: 8 },
  modalEmpty: { alignItems: 'center', paddingVertical: 48 },
  modalEmptyIcon: { fontSize: 48, marginBottom: 12 },
  modalEmptyText: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },

  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginHorizontal: 16, marginTop: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  modalCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalCategoryIcon: { fontSize: 28, marginRight: 10 },
  modalCardInfo: { flex: 1 },
  modalCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  modalCardDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  modalStatusBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalStatusText: { fontSize: 14 },
  modalCardDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 8 },
  modalCardFooter: { flexDirection: 'row', alignItems: 'center' },
  modalCardMeta: { fontSize: 11, color: '#94A3B8', flex: 1 },
  urgencyTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  urgencyTagText: { fontSize: 11, fontWeight: '700' },

  // Rating for resolved
  ratingRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  ratingLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  stars: { flexDirection: 'row', marginBottom: 6 },
  star: { fontSize: 20, marginRight: 2 },
  officialResponse: { fontSize: 12, color: '#1E40AF', backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginTop: 4 },
  updatedAt: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
});
