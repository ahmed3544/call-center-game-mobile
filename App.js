import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/supabase';

const ROLES = [
  { id: 'agent', title: 'Agent', emoji: '🎧', description: 'استقبال المكالمة والتعامل مع العميل' },
  { id: 'quality', title: 'Quality', emoji: '🛡️', description: 'تقييم جودة المكالمة' },
  { id: 'leader', title: 'Team Leader', emoji: '👑', description: 'التوجيه واتخاذ القرار' }
];
const CALLS = [
  { name: 'محمد أحمد', issue: 'الإنترنت عندي بيفصل كل شوية ومحتاج حل سريع.', answers: [['أفهم حضرتك، خلينا نفحص الخط ونحل المشكلة خطوة بخطوة.', 'good'], ['لازم تستنى لحد ما المشكلة تتحل.', 'bad'], ['دي مش مشكلة عندنا.', 'bad']] },
  { name: 'سارة محمود', issue: 'اتخصم مني مبلغ مرتين في نفس العملية.', answers: [['آسف على الإزعاج، هراجع العملية وأتأكد من حالة الخصم مع حضرتك.', 'good'], ['أكيد البنك هو السبب.', 'bad'], ['مش هقدر أساعدك في الموضوع ده.', 'bad']] },
  { name: 'أحمد علي', issue: 'عايز أغير الباقة بتاعتي لأعلى باقة.', answers: [['بكل تأكيد، هراجع الباقات المتاحة وأساعد حضرتك تختار الأنسب.', 'good'], ['غيرها من التطبيق وخلاص.', 'bad'], ['مفيش باقات تانية.', 'bad']] }
];
const roleOf = (id) => ROLES.find((r) => r.id === id) || ROLES[0];
const makeCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

export default function App() {
  const [mode, setMode] = useState('home');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [role, setRole] = useState(null);
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [callIndex, setCallIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [answerType, setAnswerType] = useState(null);
  const [qualityVote, setQualityVote] = useState(null);
  const [leaderAction, setLeaderAction] = useState(null);
  const [score, setScore] = useState(100);
  const [qualityScore, setQualityScore] = useState(100);
  const [csat, setCsat] = useState(100);
  const [aht, setAht] = useState(0);
  const [loading, setLoading] = useState(false);

  const selectedRole = useMemo(() => roleOf(role), [role]);
  const currentCall = CALLS[callIndex % CALLS.length];

  useEffect(() => {
    if (!room?.id) return undefined;
    let mounted = true;
    const load = async () => {
      const [{ data: ps }, { data: r }] = await Promise.all([
        supabase.from('cc_players').select('*').eq('room_id', room.id).order('joined_at'),
        supabase.from('cc_rooms').select('*').eq('id', room.id).single()
      ]);
      if (!mounted) return;
      setPlayers(ps || []);
      if (r) setRoom(r);
    };
    load();
    const channel = supabase
      .channel(`cc-room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cc_players', filter: `room_id=eq.${room.id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cc_rooms', filter: `id=eq.${room.id}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cc_events', filter: `room_id=eq.${room.id}` }, ({ new: event }) => {
        if (!mounted) return;
        applyEvent(event);
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [room?.id]);

  const applyEvent = (event) => {
    const p = event?.payload || {};
    if (event.type === 'answer') {
      setCallIndex(p.callIndex ?? 0); setAnswerType(p.type); setAnswered(true); setScore(p.score ?? 100); setCsat(p.csat ?? 100); setAht(p.aht ?? 0);
    }
    if (event.type === 'quality') { setQualityVote(p.vote); setQualityScore(p.qualityScore ?? 100); }
    if (event.type === 'leader') { setLeaderAction(p.action); }
    if (event.type === 'next') { setCallIndex(p.callIndex ?? 0); setAnswered(false); setAnswerType(null); setQualityVote(null); setLeaderAction(null); }
  };

  const chooseRoleAndEnter = async () => {
    if (!role) return Alert.alert('اختار دورك', 'اختار Agent أو Quality أو Team Leader.');
    setLoading(true);
    try {
      if (mode === 'role-create') {
        const { data: r, error: re } = await supabase.from('cc_rooms').insert({ code: roomCode, status: 'waiting' }).select().single();
        if (re) throw re;
        const { data: p, error: pe } = await supabase.from('cc_players').insert({ room_id: r.id, name: name.trim(), role }).select().single();
        if (pe) throw pe;
        setRoom(r); setMe(p); setMode('waiting');
      } else {
        const { data: r, error: re } = await supabase.from('cc_rooms').select('*').eq('code', roomCode).single();
        if (re || !r) throw new Error('الغرفة غير موجودة');
        if (r.status !== 'waiting') throw new Error('الغرفة بدأت بالفعل');
        const { data: ps } = await supabase.from('cc_players').select('*').eq('room_id', r.id);
        if ((ps || []).length >= 3) throw new Error('الغرفة مكتملة');
        if ((ps || []).some((p) => p.role === role)) throw new Error('الدور ده محجوز بالفعل');
        const { data: p, error: pe } = await supabase.from('cc_players').insert({ room_id: r.id, name: name.trim(), role }).select().single();
        if (pe) throw pe;
        setRoom(r); setMe(p); setPlayers([...(ps || []), p]); setMode('waiting');
      }
    } catch (e) { Alert.alert('تعذر الدخول', e.message || 'حصل خطأ غير متوقع'); }
    finally { setLoading(false); }
  };

  const createRoom = () => {
    if (!name.trim()) return Alert.alert('اكتب اسمك', 'محتاج اسم اللاعب الأول.');
    setRoomCode(makeCode()); setMode('role-create');
  };
  const joinRoom = () => {
    if (!name.trim() || roomCode.trim().length < 4) return Alert.alert('بيانات ناقصة', 'اكتب اسم اللاعب وكود الغرفة.');
    setRoomCode(roomCode.trim().toUpperCase()); setMode('role-join');
  };

  const startRoom = async () => {
    if (players.length !== 3 || !['agent', 'quality', 'leader'].every((r) => players.some((p) => p.role === r))) return;
    const { error } = await supabase.from('cc_rooms').update({ status: 'playing' }).eq('id', room.id);
    if (error) return Alert.alert('خطأ', 'تعذر بدء اللعب');
    setRoom({ ...room, status: 'playing' }); setMode('game');
  };

  const sendEvent = async (type, payload) => {
    const { error } = await supabase.from('cc_events').insert({ room_id: room.id, player_id: me.id, type, payload });
    if (error) Alert.alert('مشكلة في المزامنة', error.message);
  };

  const answer = async (type) => {
    if (me?.role !== 'agent' || answered) return;
    const nextScore = Math.max(0, score + (type === 'good' ? 2 : -12));
    const nextCsat = Math.max(0, csat + (type === 'good' ? 0 : -15));
    const nextAht = Math.max(1, aht + 8);
    await sendEvent('answer', { callIndex, type, score: nextScore, csat: nextCsat, aht: nextAht });
  };
  const voteQuality = async (vote) => {
    if (me?.role !== 'quality' || qualityVote) return;
    await sendEvent('quality', { vote, qualityScore: Math.max(0, qualityScore + (vote === 'pass' ? 2 : -8)) });
  };
  const voteLeader = async (action) => {
    if (me?.role !== 'leader' || leaderAction) return;
    await sendEvent('leader', { action });
  };
  const nextCall = async () => sendEvent('next', { callIndex: callIndex + 1 });

  useEffect(() => {
    if (mode === 'waiting' && room?.status === 'playing') setMode('game');
  }, [room?.status, mode]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>CALL CENTER</Text><Text style={styles.title}>MULTIPLAYER</Text>
        <Text style={styles.subtitle}>نسخة الموبايل — لعب جماعي أونلاين</Text>

        {mode === 'home' && <View style={styles.card}>
          <Text style={styles.label}>اسم اللاعب</Text>
          <TextInput value={name} onChangeText={setName} placeholder="مثال: Ahmed" placeholderTextColor="#789" style={styles.input} />
          <Pressable style={styles.primary} onPress={createRoom}><Text style={styles.buttonText}>إنشاء غرفة</Text></Pressable>
          <Text style={styles.or}>أو</Text><Text style={styles.label}>كود الغرفة</Text>
          <TextInput value={roomCode} onChangeText={(v) => setRoomCode(v.toUpperCase())} placeholder="ABCDE" placeholderTextColor="#789" style={styles.input} />
          <Pressable style={styles.secondary} onPress={joinRoom}><Text style={styles.buttonText}>انضمام للغرفة</Text></Pressable>
        </View>}

        {(mode === 'role-create' || mode === 'role-join') && <View style={styles.card}>
          <Text style={styles.sectionTitle}>اختار دورك</Text><Text style={styles.room}>ROOM: {roomCode}</Text>
          {ROLES.map((item) => <Pressable key={item.id} onPress={() => setRole(item.id)} style={[styles.role, role === item.id && styles.roleSelected]}><Text style={styles.emoji}>{item.emoji}</Text><View style={styles.roleCopy}><Text style={styles.roleTitle}>{item.title}</Text><Text style={styles.roleDesc}>{item.description}</Text></View></Pressable>)}
          <Pressable style={styles.primary} onPress={chooseRoleAndEnter} disabled={loading}><Text style={styles.buttonText}>{loading ? 'جاري الاتصال...' : 'دخول الغرفة'}</Text></Pressable>
        </View>}

        {mode === 'waiting' && <View style={styles.card}>
          <Text style={styles.sectionTitle}>غرفة اللعب</Text><Text style={styles.room}>{room?.code}</Text><Text style={styles.wait}>متصلين الآن: {players.length}/3</Text>
          {ROLES.map((r) => { const p = players.find((x) => x.role === r.id); return <View key={r.id} style={styles.player}><Text style={styles.playerName}>{r.emoji} {p?.name || r.title}</Text><Text style={p ? styles.badge : styles.empty}>{p ? 'متصل' : 'Waiting'}</Text></View>; })}
          {me?.role === 'leader' && <Pressable style={[styles.primary, players.length < 3 && styles.disabled]} disabled={players.length < 3} onPress={startRoom}><Text style={styles.buttonText}>ابدأ الشيفت</Text></Pressable>}
          {me?.role !== 'leader' && <Text style={styles.note}>مستني Team Leader يبدأ الشيفت بعد اكتمال 3 لاعبين.</Text>}
        </View>}

        {mode === 'game' && <View style={styles.card}>
          <View style={styles.gameHeader}><Text style={styles.roleTitle}>{selectedRole.emoji} {name} — {selectedRole.title}</Text><Text style={styles.room}>{room?.code}</Text></View>
          <View style={styles.stats}><Text style={styles.stat}>Score {score}</Text><Text style={styles.stat}>CSAT {csat}%</Text><Text style={styles.stat}>Quality {qualityScore}%</Text><Text style={styles.stat}>Calls {callIndex}</Text></View>
          <View style={styles.callBox}><Text style={styles.callTitle}>📞 {currentCall.name}</Text><Text style={styles.issue}>{currentCall.issue}</Text></View>
          {!answered && me?.role === 'agent' && currentCall.answers.map(([text, type], i) => <Pressable key={i} style={styles.choice} onPress={() => answer(type)}><Text style={styles.choiceText}>{text}</Text></Pressable>)}
          {answered && <View style={styles.result}><Text style={styles.resultTitle}>{answerType === 'good' ? '✅ رد احترافي' : '⚠️ الرد يحتاج Coaching'}</Text><Text style={styles.note}>دلوقتي دور Quality ثم Team Leader.</Text></View>}
          {me?.role === 'quality' && answered && !qualityVote && <View style={styles.panel}><Text style={styles.panelTitle}>🔍 Quality</Text><Text style={styles.note}>قيّم المكالمة</Text><View style={styles.row}><Pressable style={styles.good} onPress={() => voteQuality('pass')}><Text style={styles.buttonText}>Pass</Text></Pressable><Pressable style={styles.bad} onPress={() => voteQuality('fail')}><Text style={styles.buttonText}>Fail</Text></Pressable></View></View>}
          {qualityVote && <Text style={styles.note}>Quality: {qualityVote === 'pass' ? '✅ Pass' : '❌ Fail'}</Text>}
          {me?.role === 'leader' && answered && qualityVote && !leaderAction && <View style={styles.panel}><Text style={styles.panelTitle}>👑 Team Leader</Text><Text style={styles.note}>اختار القرار</Text><View style={styles.row}><Pressable style={styles.good} onPress={() => voteLeader('coach')}><Text style={styles.buttonText}>Coaching</Text></Pressable><Pressable style={styles.bad} onPress={() => voteLeader('escalate')}><Text style={styles.buttonText}>Escalate</Text></Pressable></View></View>}
          {leaderAction && <View style={styles.result}><Text style={styles.resultTitle}>{leaderAction === 'coach' ? '💬 Coaching' : '🚨 Escalation'}</Text>{me?.role === 'leader' && <Pressable style={styles.primary} onPress={nextCall}><Text style={styles.buttonText}>المكالمة التالية</Text></Pressable>}</View>}
          <Text style={styles.live}>● Live multiplayer</Text>
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:'#07111f'}, container:{flexGrow:1,padding:20,justifyContent:'center'}, brand:{color:'#38bdf8',fontSize:13,fontWeight:'800',letterSpacing:3,textAlign:'center'}, title:{color:'#fff',fontSize:34,fontWeight:'900',textAlign:'center'}, subtitle:{color:'#8da2bb',textAlign:'center',marginTop:6,marginBottom:22}, card:{backgroundColor:'#101d30',borderRadius:22,padding:20,borderWidth:1,borderColor:'#20344e'}, label:{color:'#a9bdd3',marginBottom:7,fontWeight:'700'}, input:{backgroundColor:'#091526',borderWidth:1,borderColor:'#29425f',color:'#fff',borderRadius:13,padding:14,marginBottom:13}, primary:{backgroundColor:'#0ea5e9',padding:15,borderRadius:13,alignItems:'center',marginTop:9}, secondary:{backgroundColor:'#172b43',padding:15,borderRadius:13,alignItems:'center'}, disabled:{opacity:.45}, buttonText:{color:'#fff',fontWeight:'900',fontSize:15}, or:{color:'#61768f',textAlign:'center',marginVertical:9}, sectionTitle:{color:'#fff',fontSize:23,fontWeight:'900'}, room:{color:'#38bdf8',fontWeight:'900',letterSpacing:2,marginTop:4,marginBottom:14}, role:{flexDirection:'row',alignItems:'center',padding:14,backgroundColor:'#0a1728',borderRadius:15,borderWidth:1,borderColor:'#1d334d',marginBottom:9}, roleSelected:{borderColor:'#38bdf8',backgroundColor:'#0d2539'}, emoji:{fontSize:27,marginRight:12}, roleCopy:{flex:1}, roleTitle:{color:'#fff',fontSize:17,fontWeight:'900'}, roleDesc:{color:'#8298b1',marginTop:3}, wait:{color:'#a9bdd3',marginBottom:14}, player:{backgroundColor:'#0a1728',borderRadius:13,padding:14,marginBottom:8,flexDirection:'row',justifyContent:'space-between'}, playerName:{color:'#fff',fontWeight:'700'}, badge:{color:'#38bdf8',fontWeight:'800'}, empty:{color:'#61768f'}, note:{color:'#8197ae',fontSize:12,lineHeight:18}, gameHeader:{marginBottom:8}, stats:{flexDirection:'row',flexWrap:'wrap',gap:7,marginVertical:12}, stat:{color:'#d9e7f5',backgroundColor:'#0a1728',padding:8,borderRadius:9,fontSize:12}, callBox:{backgroundColor:'#0a1728',borderRadius:15,padding:16,marginBottom:12}, callTitle:{color:'#fff',fontSize:18,fontWeight:'900'}, issue:{color:'#a9bdd3',marginTop:8,lineHeight:22}, choice:{backgroundColor:'#172b43',padding:14,borderRadius:12,marginBottom:8,borderWidth:1,borderColor:'#27435f'}, choiceText:{color:'#fff',lineHeight:20}, result:{backgroundColor:'#0b2030',borderRadius:14,padding:15,marginBottom:10}, resultTitle:{color:'#fff',fontWeight:'900',fontSize:16}, panel:{backgroundColor:'#0a1728',borderRadius:14,padding:14,marginTop:10}, panelTitle:{color:'#fff',fontSize:17,fontWeight:'900'}, row:{flexDirection:'row',gap:9,marginTop:10}, good:{flex:1,backgroundColor:'#16845a',padding:13,borderRadius:11,alignItems:'center'}, bad:{flex:1,backgroundColor:'#a43a46',padding:13,borderRadius:11,alignItems:'center'}, live:{color:'#39d98a',textAlign:'center',marginTop:18,fontWeight:'800',fontSize:12}
});
