import { useCallback,useState } from "react";
import { View,Text,ScrollView,Pressable,RefreshControl,StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getIssues,Issue,friendlyStatus,issueCode } from "../../src/api";
import { colors,shadow } from "../../src/theme";

export default function ReportsScreen(){
 const [items,setItems]=useState<Issue[]>([]);const [filter,setFilter]=useState("All");const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{setItems(await getIssues())}catch(e){setError(e instanceof Error?e.message:"Could not load reports")}finally{setLoading(false)}},[]);
 useFocusEffect(useCallback(()=>{load()},[load]));
 const filtered=items.filter(x=>filter==="All"||(filter==="Submitted"&&!["IN_PROGRESS","RESOLVED"].includes((x.status||"").toUpperCase()))||(filter==="In Progress"&&(x.status||"").toUpperCase()==="IN_PROGRESS")||(filter==="Resolved"&&(x.status||"").toUpperCase()==="RESOLVED"));
 return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.green}/>}>
  <Text style={s.title}>My Reports</Text><Text style={s.sub}>Track the progress of civic issues.</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{["All","Submitted","In Progress","Resolved"].map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={[s.filter,filter===f&&s.active]}><Text style={[s.filterText,filter===f&&s.activeText]}>{f}</Text></Pressable>)}</ScrollView>
  {error?<Text style={s.error}>{error}</Text>:null}
  {filtered.map(item=><View key={item.id} style={s.card}><View style={s.icon}><Ionicons name="document-text-outline" size={24} color={colors.green}/></View><View style={{flex:1}}><Text style={s.name}>{item.title}</Text><Text style={s.meta}>{issueCode(item.id)} · {item.category}</Text><Text style={s.location} numberOfLines={1}>{item.location}</Text><Text style={s.status}>{friendlyStatus(item.status)}</Text></View><Ionicons name="chevron-forward" color={colors.muted} size={19}/></View>)}
  {!filtered.length&&!error?<View style={s.empty}><Ionicons name="file-tray-outline" size={35} color={colors.muted}/><Text style={s.emptyTitle}>No reports found</Text><Text style={s.sub}>Submit a civic issue to start tracking it here.</Text></View>:null}
 </ScrollView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:colors.canvas},content:{padding:20,paddingBottom:30},title:{fontSize:25,fontWeight:"900",color:colors.ink},sub:{fontSize:13,color:colors.muted,marginTop:5},filters:{gap:8,marginVertical:22},filter:{paddingHorizontal:15,paddingVertical:10,borderRadius:22,backgroundColor:colors.white},active:{backgroundColor:colors.green},filterText:{fontSize:12,fontWeight:"800",color:colors.ink},activeText:{color:"#fff"},card:{backgroundColor:colors.white,borderRadius:17,padding:13,marginBottom:11,flexDirection:"row",alignItems:"center",gap:12,...shadow},icon:{width:48,height:48,borderRadius:14,backgroundColor:colors.greenSoft,alignItems:"center",justifyContent:"center"},name:{fontSize:14,fontWeight:"900",color:colors.ink},meta:{fontSize:11,color:colors.muted,marginTop:5},location:{fontSize:11,color:colors.muted,marginTop:4},status:{fontSize:11,fontWeight:"800",color:colors.green,marginTop:8},empty:{alignItems:"center",padding:35,backgroundColor:colors.white,borderRadius:18,gap:8},emptyTitle:{fontSize:16,fontWeight:"900",color:colors.ink},error:{color:colors.red,marginBottom:12}});
