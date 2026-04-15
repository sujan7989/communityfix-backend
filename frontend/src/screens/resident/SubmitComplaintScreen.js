import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../config/api';

const URGENCY_OPTIONS = ['Low', 'Medium', 'High'];

const CATEGORIES = [
  { key: 'Garbage', emoji: '🗑️', label: 'Garbage' },
  { key: 'Water', emoji: '💧', label: 'Water' },
  { key: 'Electricity', emoji: '⚡', label: 'Electricity' },
  { key: 'Fire', emoji: '🔥', label: 'Fire' },
  { key: 'Road', emoji: '🚧', label: 'Road' },
  { key: 'Security', emoji: '🔒', label: 'Security' },
  { key: 'Maintenance', emoji: '🔧', label: 'Maintenance' },
  { key: 'Other', emoji: '📋', label: 'Other' },
];

const URGENCY_COLORS = { Low: '#16A34A', Medium: '#D97706', High: '#DC2626' };
const URGENCY_BG = { Low: '#DCFCE7', Medium: '#FEF3C7', High: '#FEE2E2' };

export default function SubmitComplaintScreen({ navigation }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    urgency: 'Medium',
    category: 'Garbage',
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets?.length > 0) setImage(result.assets[0]);
    } catch { Alert.alert('Error', 'Could not open image picker'); }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [4, 3], quality: 0.6, base64: true,
      });
      if (!result.canceled && result.assets?.length > 0) setImage(result.assets[0]);
    } catch { Alert.alert('Error', 'Could not open camera'); }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: '📷 Camera', onPress: takePhoto },
      { text: '🖼️ Photo Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadImage = async () => {
    if (!image?.base64) return null;
    try {
      setUploadingImage(true);
      const res = await api.post('/api/complaints/upload', {
        base64Data: `data:image/jpeg;base64,${image.base64}`,
        complaintId: 'temp',
      });
      return res.data?.imageUrl || null;
    } catch { return null; }
    finally { setUploadingImage(false); }
  };

  const handleSubmit = async () => {
    const { title, description, location } = form;
    if (!title.trim() || !description.trim() || !location.trim()) {
      Alert.alert('Missing Fields', 'Title, description, and location are required');
      return;
    }
    setLoading(true);
    try {
      let imageUrl = null;
      if (image) imageUrl = await uploadImage();
      await api.post('/api/complaints', {
        title: title.trim(), description: description.trim(),
        location: location.trim(), urgency: form.urgency,
        category: form.category, imageUrl,
      });
      Alert.alert('✅ Submitted!', 'Your complaint has been submitted successfully.', [
        { text: 'View My Complaints', onPress: () => navigation.navigate('MyComplaints') },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Submission Failed', err.message || 'Failed to submit. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Raise Issue</Text>

        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} placeholder="Brief title of the issue" placeholderTextColor="#94A3B8" value={form.title} onChangeText={(v) => update('title', v)} maxLength={100} />

        <Text style={styles.label}>Description *</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder="Describe the issue in detail" placeholderTextColor="#94A3B8" value={form.description} onChangeText={(v) => update('description', v)} multiline numberOfLines={4} textAlignVertical="top" maxLength={500} />

        <Text style={styles.label}>Location *</Text>
        <TextInput style={styles.input} placeholder="e.g. Block A, Near Gate 2" placeholderTextColor="#94A3B8" value={form.location} onChangeText={(v) => update('location', v)} maxLength={100} />

        {/* Category - emoji icon buttons */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isActive = form.category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryBtn, isActive && styles.categoryBtnActive]}
                onPress={() => update('category', cat.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Urgency */}
        <Text style={styles.label}>Urgency</Text>
        <View style={styles.urgencyRow}>
          {URGENCY_OPTIONS.map((u) => {
            const isActive = form.urgency === u;
            return (
              <TouchableOpacity
                key={u}
                style={[styles.urgencyBtn, isActive && { backgroundColor: URGENCY_COLORS[u], borderColor: URGENCY_COLORS[u] }]}
                onPress={() => update('urgency', u)}
              >
                <View style={[styles.urgencyDot, { backgroundColor: isActive ? '#fff' : URGENCY_COLORS[u] }]} />
                <Text style={[styles.urgencyText, isActive && styles.urgencyTextActive]}>{u}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Photo */}
        <TouchableOpacity style={styles.photoBtn} onPress={showImageOptions}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.photoBtnInner}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
        {image && (
          <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImageBtn}>
            <Text style={styles.removeImage}>✕ Remove photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (loading || uploadingImage) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || uploadingImage}
        >
          {loading || uploadingImage ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>{uploadingImage ? 'Uploading...' : 'Submitting...'}</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Submit Ticket</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E3A5F', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff', color: '#1E293B' },
  textarea: { height: 120, textAlignVertical: 'top' },

  // Category grid
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  categoryBtn: { width: '22%', margin: '1.5%', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#E2E8F0', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  categoryBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  categoryEmoji: { fontSize: 28, marginBottom: 6 },
  categoryLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', textAlign: 'center' },
  categoryLabelActive: { color: '#2563EB', fontWeight: '700' },

  // Urgency
  urgencyRow: { flexDirection: 'row', gap: 10 },
  urgencyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, backgroundColor: '#fff', gap: 6 },
  urgencyDot: { width: 10, height: 10, borderRadius: 5 },
  urgencyText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  urgencyTextActive: { color: '#fff' },

  // Photo
  photoBtn: { borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 14, borderStyle: 'dashed', overflow: 'hidden', marginTop: 8, backgroundColor: '#fff', minHeight: 100 },
  photoBtnInner: { height: 100, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  photoBtnIcon: { fontSize: 24 },
  photoBtnText: { fontSize: 15, color: '#2563EB', fontWeight: '700' },
  imagePreview: { width: '100%', height: 200, resizeMode: 'cover' },
  removeImageBtn: { alignItems: 'center', marginTop: 8 },
  removeImage: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  // Submit
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 28, elevation: 3, shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
