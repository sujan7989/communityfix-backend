import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import api from '../../config/api';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved'];
const STATUS_COLORS = {
  Pending: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  'In Progress': { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  Resolved: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
};
const URGENCY_COLORS = { Low: '#16A34A', Medium: '#D97706', High: '#DC2626' };
const RESPONSE_TEMPLATES = [
  'We have received your complaint and will address it shortly.',
  'Our team is currently working on this issue. Expected resolution within 2-3 days.',
  'The issue has been resolved. Please let us know if you face any further problems.',
  'We require more information. Please contact the community office.',
  'This issue has been escalated to the concerned department.',
  'Scheduled for maintenance on the next working day.',
];

export default function ComplaintManageScreen({ route, navigation }) {
  const { complaint, onUpdate } = route.params;
  const [status, setStatus] = useState(complaint.status || 'Pending');
  const [adminComments, setAdminComments] = useState(complaint.adminComments || '');
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleUpdate = async () => {
    if (status === complaint.status && adminComments === (complaint.adminComments || '')) {
      Alert.alert('No Changes', 'Please change the status or add a response before updating.');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/api/complaints/${complaint.id}`, { status, adminComments });
      Alert.alert('✅ Updated', 'Complaint has been updated successfully.', [
        {
          text: 'OK',
          onPress: () => {
            if (onUpdate) onUpdate();
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Failed to update complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStyle = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  const urgencyColor = URGENCY_COLORS[complaint.urgency] || '#94A3B8';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Current status badge */}
      <View style={styles.statusRow}>
        <View style={[styles.currentStatus, { backgroundColor: currentStyle.bg, borderColor: currentStyle.border }]}>
          <Text style={[styles.currentStatusText, { color: currentStyle.text }]}>
            Status: {status}
          </Text>
        </View>
        <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '20' }]}>
          <Text style={[styles.urgencyBadgeText, { color: urgencyColor }]}>
            {complaint.urgency || 'N/A'} Priority
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{complaint.title}</Text>

      {/* Meta info */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>👤</Text>
          <Text style={styles.metaText}>{complaint.userName || 'Unknown'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText}>{complaint.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>🏷️</Text>
          <Text style={styles.metaText}>{complaint.category || 'Other'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>📅</Text>
          <Text style={styles.metaText}>{formatDate(complaint.createdAt)}</Text>
        </View>
      </View>

      {/* Image */}
      {complaint.imageUrl ? (
        <Image source={{ uri: complaint.imageUrl }} style={styles.image} />
      ) : null}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.sectionValue}>{complaint.description}</Text>
      </View>

      {/* User email */}
      {complaint.userEmail ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Submitted By</Text>
          <Text style={styles.sectionValue}>{complaint.userEmail}</Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      {/* Update Status */}
      <Text style={styles.actionTitle}>Update Status</Text>
      <View style={styles.statusOptions}>
        {STATUS_OPTIONS.map((s) => {
          const sc = STATUS_COLORS[s];
          const isActive = status === s;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusOption,
                { borderColor: isActive ? sc.border : '#E2E8F0' },
                isActive && { backgroundColor: sc.bg },
              ]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.statusOptionText, isActive && { color: sc.text, fontWeight: '700' }]}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Official Response with Templates */}
      <View style={styles.responseHeader}>
        <Text style={styles.actionTitle}>Official Response</Text>
        <TouchableOpacity style={styles.templateBtn} onPress={() => setShowTemplates(true)}>
          <Text style={styles.templateBtnText}>📝 Templates</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.commentInput}
        placeholder="Add a response or update for the resident..."
        placeholderTextColor="#94A3B8"
        value={adminComments}
        onChangeText={setAdminComments}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={500}
      />
      <Text style={styles.charCount}>{adminComments.length}/500</Text>

      <TouchableOpacity
        style={[styles.updateBtn, loading && styles.updateBtnDisabled]}
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.updateBtnText}>Update Complaint</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>

      {/* Templates Modal */}
      <Modal visible={showTemplates} animationType="slide" transparent onRequestClose={() => setShowTemplates(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📝 Response Templates</Text>
              <TouchableOpacity onPress={() => setShowTemplates(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {RESPONSE_TEMPLATES.map((t, i) => (
              <TouchableOpacity key={i} style={styles.templateItem} onPress={() => { setAdminComments(t); setShowTemplates(false); }}>
                <Text style={styles.templateText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 48 },

  statusRow: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap' },
  currentStatus: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, marginRight: 8, marginBottom: 6 },
  currentStatusText: { fontSize: 13, fontWeight: '700' },
  urgencyBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 6 },
  urgencyBadgeText: { fontSize: 13, fontWeight: '700' },

  title: { fontSize: 20, fontWeight: '700', color: '#1E3A5F', marginBottom: 14, lineHeight: 26 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginRight: 8, marginBottom: 6 },
  metaIcon: { fontSize: 12, marginRight: 4 },
  metaText: { fontSize: 12, color: '#475569', fontWeight: '500' },

  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16, resizeMode: 'cover' },

  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  sectionValue: { fontSize: 14, color: '#374151', lineHeight: 20 },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },

  actionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 10 },

  statusOptions: { flexDirection: 'row', marginBottom: 20 },
  statusOption: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 4 },
  statusOptionText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  commentInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#fff', height: 110, color: '#1E293B' },
  charCount: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 4, marginBottom: 20 },

  updateBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  updateBtnDisabled: { opacity: 0.6 },
  updateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  cancelBtn: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
  responseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  templateBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  templateBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1E3A5F' },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  templateItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  templateText: { fontSize: 14, color: '#374151', lineHeight: 20 },
});
