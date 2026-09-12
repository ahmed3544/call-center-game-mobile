import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const ROLES = [
  { id: 'agent', title: 'Agent', emoji: '🎧', description: 'استقبال المكالمة والتعامل مع العميل' },
  { id: 'quality', title: 'Quality', emoji: '🛡️', description: 'تقييم جودة المكالمة' },
  { id: 'leader', title: 'Team Leader', emoji: '👑', description: 'التوجيه واتخاذ القرار' }
];

export default function App() {
  const [mode, setMode] = useState('home');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [role, setRole] = useState(null);

  const selectedRole = useMemo(() => ROLES.find((item) => item.id === role), [role]);

  const createRoom = () => {
    if (!name.trim()) return Alert.alert('اكتب اسمك', 'محتاج اسم اللاعب الأول.');
    setRoomCode(Math.random().toString(36).slice(2, 7).toUpperCase());
    setMode('role');
  };

  const joinRoom = () => {
    if (!name.trim() || roomCode.trim().length < 4) {
      return Alert.alert('بيانات ناقصة', 'اكتب اسم اللاعب وكود الغرفة.');
    }
    setMode('role');
  };

  const continueToLobby = () => {
    if (!role) return Alert.alert('اختار دورك', 'اختار Agent أو Quality أو Team Leader.');
    setMode('waiting');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Text style={styles.brand}>CALL CENTER</Text>
        <Text style={styles.title}>MULTIPLAYER</Text>
        <Text style={styles.subtitle}>لعبة مركز الاتصال — النسخة المحمولة</Text>

        {mode === 'home' && (
          <View style={styles.card}>
            <Text style={styles.label}>اسم اللاعب</Text>
            <TextInput value={name} onChangeText={setName} placeholder="مثال: Ahmed" placeholderTextColor="#789" style={styles.input} />
            <Pressable style={styles.primary} onPress={createRoom}><Text style={styles.buttonText}>إنشاء غرفة</Text></Pressable>
            <Text style={styles.or}>أو</Text>
            <Text style={styles.label}>كود الغرفة</Text>
            <TextInput value={roomCode} onChangeText={(v) => setRoomCode(v.toUpperCase())} placeholder="ABCDE" placeholderTextColor="#789" autoCapitalize="characters" style={styles.input} />
            <Pressable style={styles.secondary} onPress={joinRoom}><Text style={styles.buttonText}>انضمام للغرفة</Text></Pressable>
          </View>
        )}

        {mode === 'role' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>اختار دورك</Text>
            <Text style={styles.room}>ROOM: {roomCode}</Text>
            {ROLES.map((item) => (
              <Pressable key={item.id} onPress={() => setRole(item.id)} style={[styles.role, role === item.id && styles.roleSelected]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.roleCopy}><Text style={styles.roleTitle}>{item.title}</Text><Text style={styles.roleDesc}>{item.description}</Text></View>
              </Pressable>
            ))}
            <Pressable style={styles.primary} onPress={continueToLobby}><Text style={styles.buttonText}>دخول الغرفة</Text></Pressable>
          </View>
        )}

        {mode === 'waiting' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>غرفة اللعب</Text>
            <Text style={styles.room}>{roomCode}</Text>
            <Text style={styles.wait}>مستني باقي اللاعبين...</Text>
            <View style={styles.player}><Text>🎧 {name}</Text><Text style={styles.badge}>{selectedRole?.title}</Text></View>
            <View style={styles.player}><Text>🛡️ Quality</Text><Text style={styles.empty}>Waiting</Text></View>
            <View style={styles.player}><Text>👑 Team Leader</Text><Text style={styles.empty}>Waiting</Text></View>
            <Text style={styles.note}>المرحلة التالية هتربط الغرفة مباشرة بـ Supabase وتزامن اللاعبين لحظيًا.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07111f' },
  container: { flex: 1, padding: 22, justifyContent: 'center' },
  brand: { color: '#38bdf8', fontSize: 14, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  subtitle: { color: '#8da2bb', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: '#101d30', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: '#20344e' },
  label: { color: '#a9bdd3', marginBottom: 7, fontWeight: '700' },
  input: { backgroundColor: '#091526', borderWidth: 1, borderColor: '#29425f', color: '#fff', borderRadius: 13, padding: 14, marginBottom: 14 },
  primary: { backgroundColor: '#0ea5e9', padding: 15, borderRadius: 13, alignItems: 'center', marginTop: 8 },
  secondary: { backgroundColor: '#172b43', padding: 15, borderRadius: 13, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  or: { color: '#61768f', textAlign: 'center', marginVertical: 10 },
  sectionTitle: { color: '#fff', fontSize: 23, fontWeight: '900' },
  room: { color: '#38bdf8', fontWeight: '900', letterSpacing: 2, marginTop: 5, marginBottom: 16 },
  role: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#0a1728', borderRadius: 15, borderWidth: 1, borderColor: '#1d334d', marginBottom: 10 },
  roleSelected: { borderColor: '#38bdf8', backgroundColor: '#0d2539' },
  emoji: { fontSize: 27, marginRight: 13 },
  roleCopy: { flex: 1 },
  roleTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  roleDesc: { color: '#8298b1', marginTop: 3 },
  wait: { color: '#a9bdd3', marginBottom: 16 },
  player: { backgroundColor: '#0a1728', borderRadius: 13, padding: 14, marginBottom: 9, flexDirection: 'row', justifyContent: 'space-between' },
  badge: { color: '#38bdf8', fontWeight: '800' },
  empty: { color: '#61768f' },
  note: { color: '#7188a0', fontSize: 12, lineHeight: 18, marginTop: 14 }
});
