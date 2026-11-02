import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getIssues, Issue, friendlyStatus, issueCode } from "../../src/api";
import { colors, shadow } from "../../src/theme";

const categories = [
  { label: "Pothole", type: "ROADS", icon: "warning-outline" as const, tint: "#FCE9E6" },
  { label: "Garbage", type: "GARBAGE", icon: "trash-outline" as const, tint: "#EAF2FF" },
  { label: "Streetlight", type: "STREETLIGHT", icon: "bulb-outline" as const, tint: "#FFF4D9" },
  { label: "Water leak", type: "WATER", icon: "water-outline" as const, tint: "#E4F6FC" },
  { label: "Drainage", type: "DRAINAGE", icon: "grid-outline" as const, tint: "#EDEBFF" },
  { label: "Others", type: "OTHER", icon: "ellipsis-horizontal-circle-outline" as const, tint: "#EEF1EF" }
];

export default function HomeScreen() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setIssues(await getIssues()); } catch (e) { setError(e instanceof Error ? e.message : "Could not load reports"); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const recent = issues.slice(0, 2);

  return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.green} />}>
    <View style={s.top}>
      <View style={s.brand}><View style={s.logo}><Ionicons name="business" color="#fff" size={22} /></View><View><Text style={s.brandName}>CivicFix</Text><Text style={s.city}>Bengaluru · Karnataka</Text></View></View>
      <Pressable style={s.bell} onPress={() => router.push("/(tabs)/profile")}><Ionicons name="notifications-outline" size={21} color={colors.ink} /></Pressable>
    </View>
    <Text style={s.hello}>Hello, Citizen 👋</Text>
    <Text style={s.sub}>Let's make our city cleaner and safer.</Text>
    <Pressable style={s.hero} onPress={() => router.push("/report")}>
      <View style={s.plus}><Ionicons name="add" size={30} color={colors.green} /></View>
      <View style={{ flex: 1 }}><Text style={s.heroTitle}>Report an Issue</Text><Text style={s.heroSub}>Potholes, garbage, streetlights, water leakage and more.</Text></View>
      <Ionicons name="arrow-forward" size={20} color="#fff" />
    </Pressable>
    <View style={s.sectionRow}><Text style={s.section}>Report by category</Text><Text style={s.small}>Choose an issue</Text></View>
    <View style={s.grid}>{categories.map(c => <Pressable key={c.type} style={s.category} onPress={() => router.push({ pathname: "/report", params: { category: c.type } })}><View style={[s.catIcon, { backgroundColor: c.tint }]}><Ionicons name={c.icon} size={23} color={colors.ink} /></View><Text style={s.catLabel}>{c.label}</Text></Pressable>)}</View>
    <View style={s.sectionRow}><Text style={s.section}>My Reports</Text><Pressable onPress={() => router.push("/(tabs)/reports")}><Text style={s.link}>View all →</Text></Pressable></View>
    {error ? <View style={s.error}><Ionicons name="cloud-offline-outline" size={18} color={colors.red} /><Text style={s.errorText}>{error}</Text></View> : null}
    {recent.length ? recent.map(item => <View key={item.id} style={s.issue}><View style={s.issueIcon}><Ionicons name="alert-circle-outline" color={colors.green} size={23} /></View><View style={{ flex: 1 }}><Text style={s.issueTitle} numberOfLines={1}>{item.title}</Text><Text style={s.issueMeta}>{issueCode(item.id)} · {item.category}</Text></View><Text style={s.status}>{friendlyStatus(item.status)}</Text></View>) : <View style={s.empty}><Ionicons name="documents-outline" size={28} color={colors.muted} /><Text style={s.emptyTitle}>No reports yet</Text><Text style={s.emptyText}>Your submitted civic issues will appear here.</Text></View>}
    <View style={{ height: 18 }} />
  </ScrollView>;
}
const s = StyleSheet.create({
 page:{flex:1,backgroundColor:colors.canvas},content:{padding:20,paddingTop:18,paddingBottom:28},
 top:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:26},
 brand:{flexDirection:"row",alignItems:"center",gap:10},logo:{width:42,height:42,borderRadius:15,backgroundColor:colors.green,alignItems:"center",justifyContent:"center"},
 brandName:{fontSize:20,fontWeight:"900",color:colors.ink},city:{fontSize:12,color:colors.muted,marginTop:1},bell:{width:42,height:42,borderRadius:21,backgroundColor:colors.white,alignItems:"center",justifyContent:"center",...shadow},
 hello:{fontSize:25,fontWeight:"900",color:colors.ink},sub:{fontSize:14,color:colors.muted,marginTop:5,marginBottom:20},
 hero:{backgroundColor:colors.green,borderRadius:22,padding:18,flexDirection:"row",alignItems:"center",gap:13,...shadow},
 plus:{width:50,height:50,borderRadius:25,backgroundColor:"#fff",alignItems:"center",justifyContent:"center"},heroTitle:{fontSize:17,fontWeight:"900",color:"#fff"},heroSub:{fontSize:12,color:"#E4F8EC",lineHeight:17,marginTop:4},
 sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:25,marginBottom:13},section:{fontSize:17,fontWeight:"900",color:colors.ink},small:{fontSize:12,color:colors.muted},link:{fontSize:13,color:colors.green,fontWeight:"800"},
 grid:{flexDirection:"row",flexWrap:"wrap",gap:10},category:{width:"31.5%",backgroundColor:colors.white,borderRadius:17,paddingVertical:15,alignItems:"center",gap:8,...shadow},catIcon:{width:46,height:46,borderRadius:15,alignItems:"center",justifyContent:"center"},catLabel:{fontSize:12,fontWeight:"800",color:colors.ink},
 issue:{backgroundColor:colors.white,borderRadius:17,padding:12,marginBottom:10,flexDirection:"row",alignItems:"center",gap:11,...shadow},issueIcon:{width:43,height:43,borderRadius:13,backgroundColor:colors.greenSoft,alignItems:"center",justifyContent:"center"},issueTitle:{fontSize:13,fontWeight:"800",color:colors.ink},issueMeta:{fontSize:11,color:colors.muted,marginTop:5},status:{fontSize:10,fontWeight:"800",color:colors.green,backgroundColor:colors.greenSoft,paddingHorizontal:9,paddingVertical:6,borderRadius:20},
 empty:{backgroundColor:colors.white,borderRadius:18,padding:24,alignItems:"center",gap:6},emptyTitle:{fontWeight:"900",color:colors.ink},emptyText:{fontSize:12,color:colors.muted},error:{padding:12,backgroundColor:"#FDECEC",borderRadius:12,flexDirection:"row",gap:8,marginBottom:10},errorText:{flex:1,color:colors.red,fontSize:12}
});