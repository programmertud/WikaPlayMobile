import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
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

import { EmptyState } from '../../components/EmptyState';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { VolumeButton } from '../../components/VolumeButton';
import { teacherService } from '../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../theme';
import type { StudentMonitoringItem } from '../../types';

export default function StudentsMonitoringScreen() {
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<StudentMonitoringItem[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'online' | 'active' | 'disabled'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected student for detailed modal
  const [selectedStudent, setSelectedStudent] = useState<StudentMonitoringItem | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Star Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setError(null);
      const res = await teacherService.getStudents();
      setStudents(res.students);
      if (res.sections) {
        setSections(res.sections);
      }
    } catch (err: any) {
      setError(err?.message || 'Nabigong kunin ang listahan ng estudyante.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    const t = setInterval(loadStudents, 25000);
    return () => clearInterval(t);
  }, [loadStudents]);

  const handleOpenStudentModal = async (student: StudentMonitoringItem) => {
    setSelectedStudent(student);
    setLoadingDetails(true);
    try {
      const res = await teacherService.getStudentHistory(student.id);
      setStudentDetails(res);
    } catch {
      // Non-critical, modal shows basic info
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseStudentModal = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
  };

  const handleToggleStatus = async (student: StudentMonitoringItem) => {
    const newStatus = student.status === 'disabled' ? 'active' : 'disabled';
    const actionLabel = newStatus === 'active' ? 'buhayin (activate)' : 'i-disable';

    Alert.alert(
      'Kumpirmahin ang Aksyon',
      `Nais mo bang ${actionLabel} ang account ni ${student.name}?`,
      [
        { text: 'Kanselahin', style: 'cancel' },
        {
          text: 'Ipagpatuloy',
          onPress: async () => {
            setUpdatingStatusId(student.id);
            try {
              await teacherService.updateStudentStatus(student.id, newStatus);
              setStudents((prev) =>
                prev.map((s) => (s.id === student.id ? { ...s, status: newStatus } : s))
              );
              if (selectedStudent && selectedStudent.id === student.id) {
                setSelectedStudent((prev) => (prev ? { ...prev, status: newStatus } : null));
              }
              Alert.alert('Tagumpay', `Na-update na ang account status ni ${student.name}.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Nabigong i-update ang status.');
            } finally {
              setUpdatingStatusId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenAdjustModal = () => {
    setAdjustAmount('');
    setAdjustReason('');
    setShowAdjustModal(true);
  };

  const handleConfirmAdjustStars = async () => {
    if (!selectedStudent) return;
    const amountNum = parseInt(adjustAmount, 10);
    if (isNaN(amountNum) || amountNum === 0) {
      Alert.alert('Maling Halaga', 'Pakilagay ang wastong bilang ng bituin (hal. +10 o -5).');
      return;
    }
    if (!adjustReason.trim() || adjustReason.trim().length < 3) {
      Alert.alert('Dahilan ay Kinakailangan', 'Pakilagay ang malinaw na dahilan para sa pagsasaayos ng bituin.');
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await teacherService.adjustStudentStars(selectedStudent.id, amountNum, adjustReason.trim());
      Alert.alert('Tagumpay ⭐', res.message);

      // Refresh student details and students list
      const updatedBalance = res.student.stars_balance;
      setSelectedStudent((prev) => (prev ? { ...prev, stars_balance: updatedBalance } : null));
      setStudents((prev) =>
        prev.map((s) => (s.id === selectedStudent.id ? { ...s, stars_balance: updatedBalance } : s))
      );
      setShowAdjustModal(false);

      // Reload fresh history
      const freshHistory = await teacherService.getStudentHistory(selectedStudent.id);
      setStudentDetails(freshHistory);
    } catch (err: any) {
      Alert.alert('Hindi Naisakatuparan', err?.message || 'Nabigong isaayos ang bituin.');
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (s.student_id_code && s.student_id_code.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
      (s.section && s.section.toLowerCase().includes(searchQuery.toLowerCase().trim()));

    if (!matchesSearch) return false;

    if (filterTab === 'online') return s.is_online;
    if (filterTab === 'active') return s.status !== 'disabled';
    if (filterTab === 'disabled') return s.status === 'disabled';
    return true;
  });

  if (loading && !refreshing) return <LoadingView message="Kinukuha ang mga estudyante..." />;
  if (error && students.length === 0) return <ErrorView message={error} onRetry={loadStudents} />;

  return (
    <AnimatedBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 10 },
        ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadStudents();
          }}
          colors={[Colors.teacherPurple]}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="people" size={24} color={Colors.teacherPurple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Pamamahala ng Mag-aaral</Text>
          <Text style={styles.pageSubtitle}>
            {students.length} nakatalang mag-aaral · {students.filter((s) => s.is_online).length} online
          </Text>
        </View>
        <VolumeButton activeColor={Colors.teacherPurple} size={38} />
      </View>

      {/* Managed Sections Banner */}
      {sections.length > 0 && (
        <View style={styles.sectionBannerContainer}>
          {sections.map((sec) => (
            <View key={sec.id} style={[styles.sectionBannerCard, Shadows.subtle]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="school" size={16} color={Colors.teacherPurple} />
                  <Text style={styles.sectionBannerName}>{sec.name}</Text>
                </View>
                <Text style={styles.sectionBannerSub}>
                  {sec.students_count || 0} mag-aaral ang kasalukuyang naka-enroll
                </Text>
              </View>
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeLabel}>CODE</Text>
                <Text style={styles.codeBadgeText} selectable>{sec.enrollment_code}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Search Bar */}
      <View style={[styles.searchBox, Shadows.subtle]}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ihanap ayon sa pangalan, ID code, o seksyon..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: `Lahat (${students.length})` },
          { key: 'online', label: `Online (${students.filter((s) => s.is_online).length})` },
          { key: 'active', label: `Aktibo (${students.filter((s) => s.status !== 'disabled').length})` },
          { key: 'disabled', label: `Naka-disable (${students.filter((s) => s.status === 'disabled').length})` },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterChip, filterTab === tab.key && styles.filterChipActive]}
            onPress={() => setFilterTab(tab.key as any)}
          >
            <Text
              style={[styles.filterChipText, filterTab === tab.key && styles.filterChipTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          emoji="👨‍🎓"
          title={searchQuery ? 'Walang nahanap' : 'Walang Estudyante'}
          message={
            searchQuery
              ? `Walang tumutugma sa "${searchQuery}". Pakisuri ang baybay o filter.`
              : 'Walang estudyante na natagpuan sa kategoryang ito.'
          }
        />
      ) : (
        filteredStudents.map((student) => {
          const lifetimeStars = student.lifetime_stars ?? student.stars_balance;

          return (
            <View key={student.id} style={[styles.studentCard, Shadows.soft]}>
              <PressableScale
                onPress={() => handleOpenStudentModal(student)}
                style={styles.studentRow}
              >
                {/* Avatar with status indicator */}
                <View style={styles.avatarWrap}>
                  <LinearGradient
                    colors={student.is_online ? Gradients.grass : Gradients.teacher}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  {student.is_online ? <View style={styles.avatarOnlinePip} /> : null}
                </View>

                {/* Details */}
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {student.name}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    {student.student_id_code ? (
                      <Text style={styles.idBadge}>{student.student_id_code}</Text>
                    ) : null}
                    {student.section ? <Text style={styles.section}>{student.section}</Text> : null}
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: student.status === 'disabled' ? Colors.coralPinkDark : Colors.grassGreenDark },
                      ]}
                    >
                      {student.status === 'disabled' ? 'Naka-disable' : 'Aktibo'}
                    </Text>
                  </View>

                  <Text style={styles.activity} numberOfLines={1}>
                    {student.is_online
                      ? `🟢 ${student.current_activity || 'Nag-aaral...'}`
                      : `Huling aktibo: ${student.last_active_at || 'Kamakailan'}`}
                  </Text>
                </View>

                {/* Star Counts (Spendable & Lifetime) */}
                <View style={styles.starStatsCol}>
                  <View style={styles.statPillSpendable}>
                    <Ionicons name="star" size={13} color={Colors.sunYellowDark} />
                    <Text style={styles.statPillText}>{student.stars_balance}</Text>
                  </View>
                  <Text style={styles.lifetimeSubText}>
                    {lifetimeStars} lifetime
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
                </View>
              </PressableScale>
            </View>
          );
        })
      )}

      {/* DETAILED STUDENT MODAL */}
      <Modal
        visible={!!selectedStudent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseStudentModal}
      >
        {selectedStudent && (
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedStudent.name}</Text>
                <Text style={styles.modalSub}>
                  {selectedStudent.student_id_code || 'ID-' + selectedStudent.id} · {selectedStudent.section || 'Klase'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseStudentModal} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Star Accounting Card (No 480 Cap) */}
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCard, Shadows.card]}
              >
                <View style={styles.heroRow}>
                  <View style={styles.heroStarCircle}>
                    <Ionicons name="star" size={32} color={Colors.sunYellow} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroLabel}>Kasalukuyang Balanse ng Bituin</Text>
                    <Text style={styles.heroBalanceText}>
                      {selectedStudent.stars_balance.toLocaleString()} ⭐
                    </Text>
                    <Text style={styles.heroSubNotice}>
                      Walang 480-star cap. Autoritatibong datos mula sa backend.
                    </Text>
                  </View>
                </View>

                {/* Ledger breakdown row */}
                <View style={styles.ledgerRow}>
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerValue}>
                      {studentDetails?.student?.lifetime_stars ?? selectedStudent.lifetime_stars ?? selectedStudent.stars_balance}
                    </Text>
                    <Text style={styles.ledgerLabel}>Lifetime Naipon</Text>
                  </View>
                  <View style={styles.ledgerDivider} />
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerValue}>
                      {selectedStudent.stars_balance}
                    </Text>
                    <Text style={styles.ledgerLabel}>Magagamit</Text>
                  </View>
                  <View style={styles.ledgerDivider} />
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerValue}>
                      {studentDetails?.student?.stars_spent ?? selectedStudent.stars_spent ?? 0}
                    </Text>
                    <Text style={styles.ledgerLabel}>Nagamit</Text>
                  </View>
                </View>

                {/* Teacher Action: Adjust Stars */}
                <TouchableOpacity
                  style={styles.adjustStarsBtn}
                  onPress={handleOpenAdjustModal}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={16} color={Colors.teacherPurple} />
                  <Text style={styles.adjustStarsBtnText}>Isaayos ang Bituin (Teacher Adjustment)</Text>
                </TouchableOpacity>
              </LinearGradient>

              {/* Status and Authorization Management */}
              <View style={[styles.sectionBox, Shadows.soft]}>
                <Text style={styles.sectionBoxTitle}>Katayuan ng Account</Text>
                <View style={styles.statusActionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusLabelText}>
                      Kasalukuyang Estado:{' '}
                      <Text style={{ fontWeight: 'bold', color: selectedStudent.status === 'disabled' ? Colors.coralPinkDark : Colors.grassGreenDark }}>
                        {selectedStudent.status === 'disabled' ? 'Naka-disable' : 'Aktibo'}
                      </Text>
                    </Text>
                    <Text style={styles.statusHelpText}>
                      Kapag naka-disable, hindi makakapasok ang bata sa WikaPlay.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleStatusButton,
                      selectedStudent.status === 'disabled' ? styles.btnReactivate : styles.btnDisable,
                    ]}
                    onPress={() => handleToggleStatus(selectedStudent)}
                    disabled={updatingStatusId === selectedStudent.id}
                  >
                    <Text style={styles.toggleStatusButtonText}>
                      {selectedStudent.status === 'disabled' ? 'Buhayin' : 'I-disable'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Badges Earned Section */}
              <View style={[styles.sectionBox, Shadows.soft]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="ribbon" size={18} color="#8B5CF6" />
                  <Text style={styles.sectionBoxTitle}>Mga Badge ng Gantimpala</Text>
                </View>

                <View style={styles.badgesRow}>
                  {[
                    { key: 'first_star', title: 'Unang Bituin', thresh: 10, icon: '🌱' },
                    { key: 'star_collector', title: 'Kolektor ng Bituin', thresh: 50, icon: '⭐' },
                    { key: 'super_learner', title: 'Super Mag-aaral', thresh: 100, icon: '🌟' },
                    { key: 'bookworm', title: 'Mahilig Magbasa', thresh: 150, icon: '📚' },
                    { key: 'quiz_master', title: 'Dalubhasa sa Pagsusulit', thresh: 200, icon: '🎯' },
                    { key: 'rising_star', title: 'Papasikat na Bituin', thresh: 250, icon: '🚀' },
                    { key: 'learning_champion', title: 'Kampeon ng Karunungan', thresh: 300, icon: '🏆' },
                    { key: 'word_wizard', title: 'Salamangkero ng Salita', thresh: 360, icon: '🪄' },
                    { key: 'ultimate_learner', title: 'Tunay na Henyo ng WikaPlay', thresh: 480, icon: '👑' },
                    { key: 'knowledge_seeker', title: 'Tagahangad ng Kaalaman', thresh: 600, icon: '🔭' },
                    { key: 'legend', title: 'Alamat ng WikaPlay', thresh: 750, icon: '🦅' },
                    { key: 'grandmaster', title: 'Pinakadakilang Henyo', thresh: 900, icon: '💎' },
                    { key: 'wika_hero', title: 'Bayani ng Wika', thresh: 1100, icon: '🦸' },
                    { key: 'galaxy_brain', title: 'Galaktikong Isipan', thresh: 1350, icon: '🌌' },
                    { key: 'immortal_scholar', title: 'Walang Hanggang Iskolar', thresh: 1650, icon: '🏛️' },
                  ].map((b) => {
                    const studentLifetime = studentDetails?.student?.lifetime_stars ?? selectedStudent.stars_balance;
                    const isUnlocked = studentLifetime >= b.thresh;

                    return (
                      <View
                        key={b.key}
                        style={[styles.badgeChip, isUnlocked ? styles.badgeChipEarned : styles.badgeChipLocked]}
                      >
                        <Text style={{ fontSize: 18 }}>{b.icon}</Text>
                        <View>
                          <Text style={styles.badgeChipTitle}>{b.title}</Text>
                          <Text style={styles.badgeChipSub}>{b.thresh} ⭐ {isUnlocked ? '✓' : '🔒'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Quiz History */}
              <View style={[styles.sectionBox, Shadows.soft]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="newspaper-outline" size={18} color={Colors.teacherPurple} />
                  <Text style={styles.sectionBoxTitle}>Kasaysayan ng Pagsusulit</Text>
                </View>

                {studentDetails?.quiz_history && studentDetails.quiz_history.length > 0 ? (
                  studentDetails.quiz_history.map((q: any, idx: number) => (
                    <View key={q.id || idx} style={styles.historyItemRow}>
                      <Ionicons
                        name={q.passed ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={q.passed ? Colors.grassGreenDark : Colors.coralPinkDark}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitleText}>
                          {q.category?.name || 'Pagsusulit'} ({q.difficulty ? q.difficulty.toUpperCase() : 'MADALI'})
                        </Text>
                        <Text style={styles.historyDateText}>
                          {q.created_at ? new Date(q.created_at).toLocaleString('fil-PH') : ''}
                        </Text>
                      </View>
                      <Text style={[styles.historyScoreText, { color: q.passed ? Colors.grassGreenDark : Colors.coralPinkDark }]}>
                        {q.score} / {q.total_questions} pts
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyHistoryText}>
                    {loadingDetails ? 'Kinukuha ang kasaysayan...' : 'Walang naitalang pagsusulit.'}
                  </Text>
                )}
              </View>

              {/* Mini-Games History */}
              <View style={[styles.sectionBox, Shadows.soft]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="game-controller-outline" size={18} color="#EC4899" />
                  <Text style={styles.sectionBoxTitle}>Kasaysayan ng Mini-Games</Text>
                </View>

                {studentDetails?.game_history && studentDetails.game_history.length > 0 ? (
                  studentDetails.game_history.map((g: any, idx: number) => (
                    <View key={g.id || idx} style={styles.historyItemRow}>
                      <Ionicons name="game-controller" size={18} color="#EC4899" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitleText}>{g.game_type}</Text>
                        <Text style={styles.historyDateText}>
                          {g.created_at ? new Date(g.created_at).toLocaleString('fil-PH') : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.historyScoreText}>{g.score} / 20 pts</Text>
                        <Text style={{ fontSize: 11, color: Colors.sunYellowDark, fontWeight: 'bold' }}>
                          +{g.stars_awarded ?? 0} ⭐
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyHistoryText}>
                    {loadingDetails ? 'Kinukuha ang kasaysayan...' : 'Walang naitalang nilarong laro.'}
                  </Text>
                )}
              </View>

              {/* Star Transactions Ledger */}
              <View style={[styles.sectionBox, Shadows.soft]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="receipt-outline" size={18} color={Colors.sunYellowDark} />
                  <Text style={styles.sectionBoxTitle}>Audit Ledger ng mga Bituin</Text>
                </View>

                {studentDetails?.star_transactions && studentDetails.star_transactions.length > 0 ? (
                  studentDetails.star_transactions.map((tx: any, idx: number) => (
                    <View key={tx.id || idx} style={styles.txRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txDescText}>{tx.description || tx.source_type}</Text>
                        <Text style={styles.txDateText}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleString('fil-PH') : ''} · Balanse: {tx.balance_after} ⭐
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.txAmountText,
                          { color: tx.amount >= 0 ? Colors.grassGreenDark : Colors.coralPinkDark },
                        ]}
                      >
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} ⭐
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyHistoryText}>
                    {loadingDetails ? 'Kinukuha ang ledger...' : 'Walang naitalang transaksyon.'}
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* TEACHER STAR ADJUSTMENT MODAL */}
      <Modal
        visible={showAdjustModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdjustModal(false)}
      >
        <View style={styles.adjustModalOverlay}>
          <View style={[styles.adjustModalCard, Shadows.card]}>
            <View style={styles.adjustModalHeader}>
              <Ionicons name="star" size={24} color={Colors.sunYellowDark} />
              <Text style={styles.adjustModalTitle}>Isaayos ang Bituin</Text>
            </View>

            <Text style={styles.adjustModalSub}>
              Para kay: <Text style={{ fontWeight: 'bold' }}>{selectedStudent?.name}</Text>
            </Text>
            <Text style={styles.adjustModalCurrent}>
              Kasalukuyang Balanse: {selectedStudent?.stars_balance} ⭐
            </Text>

            <Text style={styles.inputLabel}>Bilang ng Bituin (+ o -):</Text>
            <TextInput
              style={styles.adjustInput}
              placeholder="Halimbawa: 20 o -10"
              keyboardType="numbers-and-punctuation"
              value={adjustAmount}
              onChangeText={setAdjustAmount}
            />

            <Text style={styles.inputLabel}>Dahilan ng Pagsasaayos (Required):</Text>
            <TextInput
              style={[styles.adjustInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Halimbawa: Gantimpala sa aktibong pakikilahok sa silid-aralan"
              multiline
              value={adjustReason}
              onChangeText={setAdjustReason}
            />

            <View style={styles.adjustModalActions}>
              <TouchableOpacity
                style={styles.adjustCancelBtn}
                onPress={() => setShowAdjustModal(false)}
                disabled={isAdjusting}
              >
                <Text style={styles.adjustCancelText}>Kanselahin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adjustSubmitBtn}
                onPress={handleConfirmAdjustStars}
                disabled={isAdjusting}
              >
                <Text style={styles.adjustSubmitText}>
                  {isAdjusting ? 'Nai-save...' : 'I-save ang Pagbabago'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  pageTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  pageSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  filterChipActive: {
    backgroundColor: Colors.teacherPurple,
    borderColor: Colors.teacherPurple,
  },
  filterChipText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  studentCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 10,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  avatarOnlinePip: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.grassGreen,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  idBadge: {
    fontSize: 10,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: Colors.textMuted,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  section: {
    fontSize: 10,
    color: Colors.textLight,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
  },
  activity: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
  },
  starStatsCol: {
    alignItems: 'flex-end',
  },
  statPillSpendable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statPillText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  lifetimeSubText: {
    fontSize: 10,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.teacherPurpleBg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  modalSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroStarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Typography.family.body,
  },
  heroBalanceText: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.black,
    color: Colors.white,
    marginTop: 2,
  },
  heroSubNotice: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  ledgerItem: {
    alignItems: 'center',
  },
  ledgerValue: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  ledgerLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  ledgerDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  adjustStarsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    marginTop: 14,
  },
  adjustStarsBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  sectionBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
  },
  sectionBoxTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusLabelText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.text,
  },
  statusHelpText: {
    fontSize: 11,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
  },
  toggleStatusButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  btnDisable: {
    backgroundColor: '#FEE2E2',
  },
  btnReactivate: {
    backgroundColor: '#DCFCE7',
  },
  toggleStatusButtonText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  badgeChipEarned: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  badgeChipLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  badgeChipTitle: {
    fontSize: 11,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  badgeChipSub: {
    fontSize: 9,
    color: Colors.textLight,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  historyTitleText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  historyDateText: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  historyScoreText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  emptyHistoryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  txDescText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  txDateText: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  txAmountText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  adjustModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adjustModalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
  },
  adjustModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  adjustModalTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  adjustModalSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.text,
    marginBottom: 4,
  },
  adjustModalCurrent: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  adjustInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  adjustModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  adjustCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: '#F3F4F6',
  },
  adjustCancelText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  adjustSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.teacherPurple,
  },
  adjustSubmitText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  sectionBannerContainer: {
    marginBottom: 14,
    gap: 8,
  },
  sectionBannerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  sectionBannerName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.bold,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
  },
  sectionBannerSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  codeBadge: {
    backgroundColor: '#F3E8FF',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  codeBadgeLabel: {
    fontSize: 9,
    fontFamily: Typography.family.bold,
    fontWeight: Typography.weights.heavy,
    color: Colors.teacherPurple,
    letterSpacing: 0.5,
  },
  codeBadgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.bold,
    fontWeight: Typography.weights.heavy,
    color: Colors.teacherPurple,
    marginTop: 1,
  },
});
