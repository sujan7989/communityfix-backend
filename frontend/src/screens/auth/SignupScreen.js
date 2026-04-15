import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';

const DEFAULT_COMMUNITIES = [
  'Sunrise Apartments',
  'Green Valley',
  'Blue Ridge',
  'Palm Grove',
  'Other',
];

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    communityId: '',
    flatNumber: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState(DEFAULT_COMMUNITIES);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);

  useEffect(() => {
    // Try to fetch communities from API, fall back to defaults
    api.get('/api/communities')
      .then((res) => {
        const data = res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((c) => c.name || c).filter(Boolean);
          if (!names.includes('Other')) names.push('Other');
          setCommunities(names);
          setForm((f) => ({ ...f, communityId: names[0] }));
        } else {
          setForm((f) => ({ ...f, communityId: DEFAULT_COMMUNITIES[0] }));
        }
      })
      .catch(() => {
        setForm((f) => ({ ...f, communityId: DEFAULT_COMMUNITIES[0] }));
      });
  }, []);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSignup = async () => {
    const { name, email, password, confirmPassword, communityId, flatNumber } = form;
    if (!name.trim() || !email.trim() || !password || !communityId) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        communityId,
        flatNumber: flatNumber.trim() || null,
        phone: form.phone.trim() || null,
      });
    } catch (err) {
      Alert.alert('Signup Failed', err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🏘️</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join your community</Text>
        </View>

        <View style={styles.form}>
          {[
            { label: 'Full Name *', key: 'name', placeholder: 'John Doe', capitalize: 'words' },
            { label: 'Email *', key: 'email', placeholder: 'you@example.com', keyboard: 'email-address', capitalize: 'none' },
            { label: 'Password *', key: 'password', placeholder: '••••••••', secure: true, capitalize: 'none' },
            { label: 'Confirm Password *', key: 'confirmPassword', placeholder: '••••••••', secure: true, capitalize: 'none' },
            { label: 'Flat / Unit Number', key: 'flatNumber', placeholder: 'A-101' },
            { label: 'Phone', key: 'phone', placeholder: '9999999999', keyboard: 'phone-pad', capitalize: 'none' },
          ].map(({ label, key, placeholder, secure, keyboard, capitalize }) => (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                value={form[key]}
                onChangeText={(v) => update(key, v)}
                secureTextEntry={secure}
                keyboardType={keyboard || 'default'}
                autoCapitalize={capitalize || 'sentences'}
                autoCorrect={false}
              />
            </View>
          ))}

          <Text style={styles.label}>Community *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowCommunityPicker(!showCommunityPicker)}
          >
            <Text style={[styles.pickerText, !form.communityId && { color: '#94A3B8' }]}>
              {form.communityId || 'Select your community'}
            </Text>
            <Text style={styles.pickerArrow}>{showCommunityPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showCommunityPicker && (
            <View style={styles.dropdown}>
              {communities.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.dropdownItem, form.communityId === c && styles.dropdownItemActive]}
                  onPress={() => { update('communityId', c); setShowCommunityPicker(false); }}
                >
                  <Text style={[styles.dropdownText, form.communityId === c && styles.dropdownSelected]}>
                    {c}
                  </Text>
                  {form.communityId === c && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  inner: { flexGrow: 1, padding: 24, paddingTop: 48 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#1E3A5F' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#F8FAFC', color: '#1E293B' },
  picker: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, backgroundColor: '#F8FAFC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 15, color: '#1E293B', flex: 1 },
  pickerArrow: { color: '#64748B', fontSize: 12 },
  dropdown: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#fff', marginTop: 4, elevation: 6, zIndex: 999 },
  dropdownItem: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownText: { fontSize: 15, color: '#374151' },
  dropdownSelected: { color: '#2563EB', fontWeight: '700' },
  checkmark: { color: '#2563EB', fontWeight: '700', fontSize: 16 },
  btn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#64748B', fontSize: 14 },
  linkBold: { color: '#2563EB', fontWeight: '700' },
});
