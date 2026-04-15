import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import api from '../../config/api';

const STATUS_CONFIG = {
  Pending: { bg: '#FEF3C7', text: '#92400E', icon: '🕐' },
  'In Progress': { bg: '#DBEAFE', text: '#1E40AF', icon: '🔧' },
  Resolved: { bg: '#D1FAE5', text: '#065F46', icon: '✅' },
};
const URGENCY_COLORS = { Low: '#16A34A', Medium: '#D97706', High: '#DC2626' };
const TIMELINE_STEPS = [
  { key: 'Pending', label: 'Submitted', icon: '📝', sub: 'Complaint received' },
  { key: 'Under Review', label: 'Under Review', icon: '🔍', sub: 'Being reviewed by officials' },
  { key: 'In Progress', label: 'In Progress', icon: '🔧', sub: 'Work has started' },
  { key: 'Resolved', label: 'Resolved', icon: '✅', sub: 'Issue fixed' },
];
const STEP_INDEX = { Pending: 0, 'Under Review': 1, 'In Progress': 2, Resolved: 3 };

export default function ComplaintDetailScreen({ route, navigation }) {
  const { complaint: initialComplaint, complaintId } = route.params || {};
  const [complaint, setComplaint] = useState(initialComplaint || null);
  const [loading, setLoading] = useState(!initialComplaint);
  const [rating, setRating] = useState(initialComplaint?.rating || 0);
  const [feedback, setFeedback] = useState(initialComplaint?.feedback || '');
  const [ratingSubmitted, setRatingSubmitted] = useState(!!initialComplaint?.rating);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const id = complaintId || initialComplaint?.id;
    if (id) fetchComplaint(id);
  }, []);

  const fetchComplaint = async (id) => {
    try {
      const res = await api.get(`/api/complaints/${id}`);
      const data = res.data?.data || res.data;
      setComplaint(data);
      setRating(data?.rating || 0);
      setFeedback(data?.feedback || '');
      setRatingSubmitted(!!data?.rating);
    } catch (err) {
      if (!complaint) Alert.alert('Error', 'Could not load complaint details');
    } finally { setLoading(false); }
  };

  const canEdit = () => {
    if (!complaint || complaint.status !== 'Pending') return false;
    const created = complaint.createdAt?._seconds
      ? new Date(complaint.createdAt._seconds * 1000)
      : new Date(complaint.createdAt);
    return (Date.now() - created.getTime()) < 60 * 60 * 1000; // 1 hour
  };

  const handleEdit = () => {
    setEditTitle(complaint.title);
    setEditDesc(complaint.description);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editTitle.trim() || !editDesc.trim()) {
      Alert.alert('Error', 'Title and description cannot be empty');
      return;
    }
    setSavingEdit(true);
    try {
      await api.put(`/api/complaints/${complaint.id}`, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        status: complaint.status,
      });
      setComplaint({ ...complaint, title: editTitle.trim(), description: editDesc.trim() });
      setEditing(false);
      Alert.alert('✅ Updated', 'Complaint updated successfully');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update complaint');
    } finally { setSavingEdit(false); }
  };

  const submitRating = async () => {
    if (rating === 0) { Alert.alert('Please select a rating', 'Tap a star to rate'); return; }
    setSubmittingRating(true);
    try {
      await api.put(`/api/complaints/${complaint.id}`, {
        status: complaint.status,
        rating,
        feedback: feedback.trim(),
      });
      setRatingSubmitted(true);
      Alert.alert('⭐ Thank you!', 'Your rating has been submitted');
    } catch (err) {
      Alert.alert('Error', 'Could not submit rating');
    } finally { setSubmittingRating(false); }
  };

  const getDaysOpen = () => {
    if (!complaint?.createdAt) return null;
    const created = complaint.createdAt._seconds
      ? new Date(complaint.createdAt._seconds * 1000)
      : new Date(complaint.createdAt);
    const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (!complaint) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Could not load complaint</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const sc = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.Pending;
  const currentStep = STEP_INDEX[complaint.status] ?? 0;
  const daysOpen = getDaysOpen();
  const isResolved = complaint.status === 'Resolved';

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Badges */}
      <View style={styles.badgeRow}>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusBadgeText, { color: sc.text }]}>{sc.icon} {complaint.status}</Text>
        </View>
        <View style={[styles.urgencyBadge, { backgroundColor: (URGENCY_COLORS[complaint.urgency] || '#94A3B8') + '20' }]}>
          <Text style={[styles.urgencyBadgeText, { color: URGENCY_COLORS[complaint.urgency] || '#94A3B8' }]}>
            {complaint.urgency || 'N/A'} Priority
          </Text>
        </View>
        {daysOpen !== null && !isResolved && (
          <View style={[styles.slaBadge, { backgroundColor: daysOpen > 3 ? '#FEE2E2' : '#F0FDF4' }]}>
            <Text style={[styles.slaText, { color: daysOpen > 3 ? '#DC2626' : '#16A34A' }]}>
              ⏱️ {daysOpen}d open
            </Text>
          </View>
        )}
      </View>

      {/* Title + Edit */}
      <View style={styles.titleRow}>
        {editing ? (
          <View style={styles.editBox}>
            <TextInput style={styles.editInput} value={editTitle} onChangeText={setEditTitle} placeholder="Title" />
            <TextInput style={[styles.editInput, styles.editTextarea]} value={editDesc} onChangeText={setEditDesc} placeholder="Description" multiline numberOfLines={3} textAlignVertical="top" />
            <View style={styles.editBtns}>
              <TouchableOpacity style={styles.saveBtnSmall} onPress={saveEdit} disabled={savingEdit}>
                <Text style={styles.saveBtnText}>{savingEdit ? 'Saving...' : '✅ Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtnSmall} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{complaint.title}</Text>
            {canEdit() && (
              <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
                <Text style={styles.editBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.timelineHeading}>📍 Status Timeline</Text>
        <View style={styles.timeline}>
          {TIMELINE_STEPS.map((step, idx) => {
            const done = idx <= currentStep;
            const active = idx === currentStep;
            const isLast = idx === TIMELINE_STEPS.length - 1;
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, done && styles.timelineDotDone, active && styles.timelineDotActive]}>
                    {done ? <Text style={styles.timelineDotIcon}>{step.icon}</Text> : <View style={styles.timelineDotInner} />}
                  </View>
                  {!isLast && <View style={[styles.timelineLine, done && idx < currentStep && styles.timelineLineDone]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>{step.label}</Text>
                  <Text style={styles.timelineSub}>{step.sub}</Text>
                  {active && <Text style={styles.timelineSubLabel}>● Current status</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Image */}
      {complaint.imageUrl ? <Image source={{ uri: complaint.imageUrl }} style={styles.image} /> : null}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.sectionValue}>{complaint.description}</Text>
      </View>

      {/* Info grid */}
      <View style={styles.infoGrid}>
        {[
          { label: '📍 Location', value: complaint.location },
          { label: '🏷️ Category', value: complaint.category || 'Other' },
          { label: '📅 Submitted', value: formatDate(complaint.createdAt) },
          { label: '🔄 Last Updated', value: formatDate(complaint.updatedAt) },
        ].map(({ label, value }) => (
          <View key={label} style={styles.infoCard}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Official Response */}
      {complaint.adminComments ? (
        <View style={styles.responseCard}>
          <Text style={styles.responseLabel}>💬 Official Response</Text>
          <Text style={styles.responseText}>{complaint.adminComments}</Text>
        </View>
      ) : (
        <View style={styles.noResponseCard}>
          <Text style={styles.noResponseText}>⏳ Awaiting official response</Text>
        </View>
      )}

      {/* Rating section for resolved complaints */}
      {isResolved && (
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>⭐ Rate this Resolution</Text>
          {ratingSubmitted ? (
            <View style={styles.ratingDone}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Text key={s} style={styles.starLarge}>{s <= rating ? '⭐' : '☆'}</Text>
                ))}
              </View>
              <Text style={styles.ratingDoneText}>Thank you for your feedback!</Text>
              {feedback ? <Text style={styles.feedbackDisplay}>"{feedback}"</Text> : null}
            </View>
          ) : (
            <>
              <Text style={styles.ratingSubtitle}>How satisfied are you with the resolution?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Text style={styles.starLarge}>{s <= rating ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Add feedback (optional)..."
                placeholderTextColor="#94A3B8"
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity
                style={[styles.submitRatingBtn, submittingRating && { opacity: 0.6 }]}
                onPress={submitRating}
                disabled={submittingRating}
              >
                <Text style={styles.submitRatingText}>{submittingRating ? 'Submitting...' : 'Submit Rating'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Refresh */}
      <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchComplaint(complaint.id)}>
        <Text style={styles.refreshBtnText}>🔄 Refresh Status</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 18, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#DC2626', marginBottom: 16 },
  backBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: '#fff', fontWeight: '700' },

  badgeRow: { flexDirection: 'row', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  urgencyBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  urgencyBadgeText: { fontSize: 13, fontWeight: '700' },
  slaBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  slaText: { fontSize: 12, fontWeight: '700' },

  titleRow: { marginBottom: 18 },
  title: { fontSize: 21, fontWeight: '700', color: '#1E3A5F', lineHeight: 28 },
  editBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  editBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  editBox: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  editInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1E293B', marginBottom: 8 },
  editTextarea: { height: 80, textAlignVertical: 'top' },
  editBtns: { flexDirection: 'row', gap: 10 },
  saveBtnSmall: { flex: 1, backgroundColor: '#2563EB', borderRadius: 8, padding: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtnSmall: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10, alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 13 },

  timelineCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  timelineHeading: { fontSize: 14, fontWeight: '700', color: '#1E3A5F', marginBottom: 16 },
  timeline: {},
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  timelineLeft: { alignItems: 'center', width: 36, marginRight: 14 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  timelineDotDone: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  timelineDotActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  timelineDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CBD5E1' },
  timelineDotIcon: { fontSize: 15 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  timelineLineDone: { backgroundColor: '#93C5FD' },
  timelineContent: { flex: 1, paddingTop: 4, paddingBottom: 12 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  timelineLabelActive: { color: '#1E3A5F', fontWeight: '700' },
  timelineSub: { fontSize: 11, color: '#CBD5E1', marginTop: 1 },
  timelineSubLabel: { fontSize: 11, color: '#2563EB', marginTop: 3, fontWeight: '600' },

  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 14, resizeMode: 'cover' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sectionValue: { fontSize: 14, color: '#374151', lineHeight: 22 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  infoCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, margin: 5 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
  infoValue: { fontSize: 13, color: '#374151', fontWeight: '600' },

  responseCard: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#2563EB', marginTop: 4, marginBottom: 10 },
  responseLabel: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  responseText: { fontSize: 14, color: '#1E3A5F', lineHeight: 21 },
  noResponseCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', marginTop: 4, marginBottom: 10 },
  noResponseText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  ratingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, borderWidth: 1, borderColor: '#FEF3C7' },
  ratingTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A5F', marginBottom: 6 },
  ratingSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  starsRow: { flexDirection: 'row', marginBottom: 12 },
  starLarge: { fontSize: 32, marginRight: 4 },
  feedbackInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 14, color: '#1E293B', marginBottom: 12, height: 70, textAlignVertical: 'top' },
  submitRatingBtn: { backgroundColor: '#F59E0B', borderRadius: 10, padding: 13, alignItems: 'center' },
  submitRatingText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ratingDone: { alignItems: 'center' },
  ratingDoneText: { fontSize: 14, color: '#059669', fontWeight: '600', marginTop: 8 },
  feedbackDisplay: { fontSize: 13, color: '#64748B', fontStyle: 'italic', marginTop: 6, textAlign: 'center' },

  refreshBtn: { marginTop: 12, borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#EFF6FF' },
  refreshBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
});
