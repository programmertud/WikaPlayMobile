import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from '@/utils/haptics';

import { LoadingView } from '../../components/LoadingView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { UserAvatar } from '../../components/UserAvatar';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { VolumeSettingsCard } from '../../components/VolumeButton';
import { useAuth } from '../../hooks/use-auth';
import { authService, teacherService } from '../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../theme';

const TEACHER_PRESET_AVATARS = [
  { id: 'teacher_f', emoji: '👩‍🏫', label: 'Guro (B)' },
  { id: 'teacher_m', emoji: '👨‍🏫', label: 'Guro (L)' },
  { id: 'books', emoji: '📚', label: 'Aklat' },
  { id: 'grad', emoji: '🎓', label: 'Toga' },
  { id: 'pencil', emoji: '✏️', label: 'Lapis' },
  { id: 'star', emoji: '🌟', label: 'Bituin' },
];

export default function TeacherProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [sectionInput, setSectionInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    authService.getMe()
      .catch(() => { /* non-critical */ })
      .finally(() => setLoading(false));
  }, []);

  const openEditModal = () => {
    setNameInput(user?.name ?? '');
    setSectionInput(user?.section ?? 'Kaguruan');
    setSelectedAvatar(user?.avatar ?? null);
    setShowEditModal(true);
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Pahintulot', 'Kailangan ng pahintulot upang mabuksan ang gallery ng litrato.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processAndSetAvatar(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Nabigong pumili ng larawan.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Pahintulot', 'Kailangan ng pahintulot upang magamit ang camera.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processAndSetAvatar(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Nabigong kumuha ng litrato.');
    }
  };

  const processAndSetAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadingImage(true);
    try {
      let avatarUrl = '';
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg';
        const base64Data = `data:${mime};base64,${asset.base64}`;
        try {
          const res = await authService.uploadAvatarBase64(base64Data);
          avatarUrl = res.avatar;
        } catch {
          avatarUrl = base64Data;
        }
      } else {
        const formData = new FormData();
        const filename = asset.uri.split('/').pop() || 'teacher_avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('avatar', {
          uri: asset.uri,
          name: filename,
          type,
        } as any);
        const res = await authService.uploadAvatar(formData);
        avatarUrl = res.avatar;
      }

      setSelectedAvatar(avatarUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('Paumanhin', e.message || 'Hindi nai-upload ang larawan.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert('Paalala', 'Pakilagay ang inyong buong pangalan (hindi bababa sa 2 titik).');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: trimmedName,
        avatar: selectedAvatar || '',
        section: sectionInput.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowEditModal(false);
      Alert.alert('Tagumpay! ✨', 'Matagumpay na na-update ang profile ng guro!');
    } catch (err: any) {
      Alert.alert('Paumanhin', err.message || 'Hindi nai-save ang mga pagbabago.');
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {}
    finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
      router.replace('/');
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  if (loading) return <LoadingView message="Kinukuha ang profile..." />;

  const displayName = user?.name ?? 'Guro';

  return (
    <AnimatedBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar with Teacher Gradient Ring and Edit Trigger */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            activeOpacity={0.8}
            onPress={openEditModal}
          >
            <UserAvatar
              avatar={user?.avatar}
              name={displayName}
              size={96}
              isTeacher
              showRing
              ringColors={Gradients.teacher}
            />
            <View style={styles.avatarEditPill}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{displayName}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="school" size={14} color={Colors.teacherPurple} />
            <Text style={styles.roleLabel}>Guro (Teacher Portal)</Text>
          </View>
          {user?.email ? <Text style={styles.emailLabel}>{user.email}</Text> : null}

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={[styles.editProfileBtn, Shadows.subtle]}
            onPress={openEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color={Colors.teacherPurple} />
            <Text style={styles.editProfileBtnText}>I-edit ang Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, Shadows.card]}>
          <InfoRow icon="person" label="Buong Pangalan" value={user?.name ?? '—'} />
          <InfoRow icon="mail" label="Email Address" value={user?.email ?? '—'} />
          <InfoRow icon="business" label="Seksyon / Departamento" value={user?.section ?? 'Kaguruan'} />
          <InfoRow icon="shield-checkmark" label="Tungkulin" value="Guro / Administrator" />
        </View>

      {/* WikaPlay Info Card */}
      <View style={[styles.aboutCard, Shadows.card]}>
        <View style={styles.aboutHeader}>
          <Ionicons name="information-circle" size={20} color={Colors.teacherPurple} />
          <Text style={styles.aboutTitle}>Tungkol sa WikaPlay</Text>
        </View>
        <Text style={styles.aboutText}>
          Ang WikaPlay ay isang mobile learning application para sa mga mag-aaral sa kindergarten na nagtuturo ng
          Filipino vocabulary sa pamamagitan ng interactive flashcards, audio quizzes, at mini-games.
        </Text>
        <Text style={styles.version}>Bersyon: 1.0.0 (Expo SDK 58)</Text>
      </View>

      {/* Reports & CSV Export Hub */}
      <View style={[styles.aboutCard, Shadows.card]}>
        <View style={styles.aboutHeader}>
          <Ionicons name="document-text" size={20} color={Colors.teacherPurple} />
          <Text style={styles.aboutTitle}>Mga Ulat at CSV Export</Text>
        </View>
        <Text style={styles.aboutText}>
          I-download o i-export ang opisyal na mga datos ng mag-aaral para sa pagtatala ng grado at ebalwasyon ng klase:
        </Text>

        <View style={styles.exportList}>
          <TouchableOpacity
            style={styles.exportItemBtn}
            onPress={async () => {
              try {
                const res = await teacherService.exportReportsCsv('quizzes');
                Alert.alert(
                  'Ulat ng Pagsusulit (CSV)',
                  `Matagumpay na naihanda ang "${res.filename}" na may ${res.total_records} rekord ng pagsusulit.`
                );
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Nabigong i-export ang ulat.');
              }
            }}
          >
            <View style={[styles.exportIconCircle, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="newspaper" size={18} color={Colors.teacherPurple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportItemTitle}>Ulat ng Pagsusulit (Quiz Records)</Text>
              <Text style={styles.exportItemSub}>Mga marka, kahirapan, tamang sagot, at resulta</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={Colors.teacherPurple} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportItemBtn}
            onPress={async () => {
              try {
                const res = await teacherService.exportReportsCsv('minigames');
                Alert.alert(
                  'Ulat ng Mini-Games (CSV)',
                  `Matagumpay na naihanda ang "${res.filename}" na may ${res.total_records} sesyon ng laro.`
                );
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Nabigong i-export ang ulat.');
              }
            }}
          >
            <View style={[styles.exportIconCircle, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="game-controller" size={18} color="#DB2777" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportItemTitle}>Ulat ng Mini-Games</Text>
              <Text style={styles.exportItemSub}>Puntos sa 5 mini-games at mystery box qualifiers</Text>
            </View>
            <Ionicons name="download-outline" size={18} color="#DB2777" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportItemBtn}
            onPress={async () => {
              try {
                const res = await teacherService.exportReportsCsv('stars');
                Alert.alert(
                  'Ledger ng mga Bituin (CSV)',
                  `Matagumpay na naihanda ang "${res.filename}" na may ${res.total_records} transaksyon.`
                );
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Nabigong i-export ang ulat.');
              }
            }}
          >
            <View style={[styles.exportIconCircle, { backgroundColor: '#FEF08A' }]}>
              <Ionicons name="star" size={18} color={Colors.sunYellowDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportItemTitle}>Ledger ng mga Bituin (Star Audit)</Text>
              <Text style={styles.exportItemSub}>Pumasok, lumabas, at adjustments ng guro</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={Colors.sunYellowDark} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportItemBtn}
            onPress={async () => {
              try {
                const res = await teacherService.exportReportsCsv('students');
                Alert.alert(
                  'Talaan ng Mag-aaral (CSV)',
                  `Matagumpay na naihanda ang "${res.filename}" na may ${res.total_records} mag-aaral.`
                );
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Nabigong i-export ang ulat.');
              }
            }}
          >
            <View style={[styles.exportIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="people" size={18} color={Colors.grassGreenDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportItemTitle}>Talaan ng Mag-aaral (Roster)</Text>
              <Text style={styles.exportItemSub}>Pangalan, Student ID, seksyon, at estado ng account</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={Colors.grassGreenDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sound & Music Settings */}
      <VolumeSettingsCard accentColor={Colors.teacherPurple} />

      {/* Logout Button */}
      <PrimaryButton
        title={loggingOut ? 'Lumalabas...' : 'Mag-logout'}
        variant="danger"
        size="lg"
        icon="log-out"
        onPress={handleLogout}
        disabled={loggingOut}
        style={{ marginTop: 12 }}
      />
    </ScrollView>

    {/* Edit Teacher Profile Modal */}
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!savingProfile) setShowEditModal(false);
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={modalStyles.overlay}
      >
        <View style={[styles.editCard, Shadows.card]}>
          <View style={styles.editCardHeader}>
            <View style={styles.editCardTitleRow}>
              <Ionicons name="person-circle" size={26} color={Colors.teacherPurple} />
              <Text style={styles.editCardTitle}>I-edit ang Profile ng Guro</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              disabled={savingProfile}
              style={styles.closeModalBtn}
            >
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            {/* Avatar Preview & Actions */}
            <View style={styles.editAvatarSection}>
              <UserAvatar
                avatar={selectedAvatar}
                name={nameInput || displayName}
                size={84}
                isTeacher
                showRing
                ringColors={Gradients.teacher}
              />

              <Text style={styles.editAvatarLabel}>Palitan ang Profile Picture:</Text>

              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.photoActionBtn, { backgroundColor: '#EDE9FE' }]}
                  disabled={uploadingImage || savingProfile}
                  onPress={handlePickImage}
                >
                  <Ionicons name="images" size={20} color={Colors.teacherPurple} />
                  <Text style={[styles.photoActionText, { color: Colors.teacherPurple }]}>
                    Gallery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoActionBtn, { backgroundColor: '#F3E8FF' }]}
                  disabled={uploadingImage || savingProfile}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={20} color={Colors.teacherPurple} />
                  <Text style={[styles.photoActionText, { color: Colors.teacherPurple }]}>
                    Camera
                  </Text>
                </TouchableOpacity>

                {selectedAvatar && (
                  <TouchableOpacity
                    style={[styles.photoActionBtn, { backgroundColor: '#FEE2E2' }]}
                    disabled={uploadingImage || savingProfile}
                    onPress={() => setSelectedAvatar(null)}
                  >
                    <Ionicons name="refresh" size={20} color="#EF4444" />
                    <Text style={[styles.photoActionText, { color: '#EF4444' }]}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {uploadingImage && (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="small" color={Colors.teacherPurple} />
                  <Text style={styles.uploadingText}>Ina-upload ang larawan...</Text>
                </View>
              )}

              {/* Preset Teacher Avatars */}
              <Text style={styles.presetLabel}>O pumili ng avatar badge:</Text>
              <View style={styles.presetRow}>
                {TEACHER_PRESET_AVATARS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.presetChip,
                      selectedAvatar === p.emoji && styles.presetChipActive,
                    ]}
                    onPress={() => setSelectedAvatar(p.emoji)}
                  >
                    <Text style={styles.presetEmoji}>{p.emoji}</Text>
                    <Text style={styles.presetChipLabel}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Input Fields */}
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Buong Pangalan (Full Name):</Text>
              <TextInput
                style={styles.textInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Hal. Maria Santos"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                editable={!savingProfile}
                maxLength={60}
              />

              <Text style={styles.inputLabel}>Seksyon / Kaguruan (Department):</Text>
              <TextInput
                style={styles.textInput}
                value={sectionInput}
                onChangeText={setSectionInput}
                placeholder="Hal. Kinder - Mabait / Kaguruan"
                placeholderTextColor={Colors.textMuted}
                editable={!savingProfile}
                maxLength={60}
              />
            </View>

            {/* Save & Cancel Buttons */}
            <View style={styles.editActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                disabled={savingProfile}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Kanselahin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, savingProfile && { opacity: 0.7 }]}
                disabled={savingProfile || uploadingImage}
                onPress={handleSaveProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>I-save</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Logout Confirmation Modal */}
    <Modal
      visible={showLogoutModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loggingOut) setShowLogoutModal(false);
      }}
    >
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.card, Shadows.card]}>
          <View style={modalStyles.iconCircle}>
            <Ionicons name="log-out" size={32} color="#EF4444" />
          </View>
          <Text style={modalStyles.title}>Mag-logout sa Portal ng Guro?</Text>
          <Text style={modalStyles.subtitle}>
            Sigurado ka bang nais mong lumabas sa portal, {user?.name || 'Guro'}?
          </Text>
          <View style={modalStyles.btnGroup}>
            <PrimaryButton
              title={loggingOut ? 'Lumalabas...' : 'Oo, Lumabas'}
              variant="danger"
              size="md"
              icon="log-out"
              onPress={confirmLogout}
              disabled={loggingOut}
              style={{ width: '100%', marginBottom: 10 }}
            />
            <PrimaryButton
              title="Bumalik"
              variant="outline"
              size="md"
              onPress={() => setShowLogoutModal(false)}
              disabled={loggingOut}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  </AnimatedBackground>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconWrapper}>
        <Ionicons name={icon} size={18} color={Colors.teacherPurple} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.teacherPurpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    padding: 3,
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  displayName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarEditPill: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: Colors.teacherPurple,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: Colors.teacherPurpleLight,
  },
  editProfileBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.teacherPurpleLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 6,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.teacherPurple,
    fontWeight: Typography.weights.bold,
  },
  emailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  /* Edit Profile Modal Styles */
  editCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 20,
  },
  editCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  editCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editCardTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  editAvatarLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textMuted,
    marginTop: 10,
    marginBottom: 8,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  photoActionText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: Colors.teacherPurpleLight,
    borderRadius: Radius.md,
    width: '100%',
    marginBottom: 8,
  },
  uploadingText: {
    fontSize: Typography.sizes.xs,
    color: Colors.teacherPurple,
    fontWeight: Typography.weights.medium,
  },
  presetLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetChipActive: {
    backgroundColor: Colors.teacherPurpleLight,
    borderColor: Colors.teacherPurple,
  },
  presetEmoji: {
    fontSize: 16,
  },
  presetChipLabel: {
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  formSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    color: Colors.text,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.teacherPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
    marginBottom: 16,
  },
  aboutCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    marginBottom: 20,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aboutTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  aboutText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    lineHeight: 18,
    marginBottom: 10,
  },
  version: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  exportList: {
    marginTop: 8,
    gap: 8,
  },
  exportItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportItemTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  exportItemSub: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 1,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btnGroup: {
    width: '100%',
  },
});
