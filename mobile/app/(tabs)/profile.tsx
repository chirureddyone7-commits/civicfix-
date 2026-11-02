import { View,Text,ScrollView,Pressable,StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme";

const items = [
  { title: "My Reports", subtitle: "View and track your submitted issues", icon: "document-text-outline" as const, action: () => router.push("/(tabs)/reports") },
  { title: "Notifications", subtitle: "Stay updated on your reports", icon: "notifications-outline" as const },
  { title: "Help & Support", subtitle: "Get help using CivicFix", icon: "help-circle-outline" as const },
  { title: "Privacy Policy", subtitle: "How your information is handled", icon: "shield-checkmark-outline" as const }
];

export default function ProfileScreen(){return <ScrollView style={s.page} contentContainerStyle={s.content}>
 <View style={s.avatar}><Ionicons name="person" size={38} color={colors.green}/></View>
 <Text style={s.name}>CivicFix Citizen</Text><Text style={s.sub}>Citizen account</Text>
 <Text style={s.section}>Account</Text>
 {items.map(item=><Pressable key={item.title} style={s.item} onPress={item.action}><View style={s.icon}><Ionicons name={item.icon} size={21} color={colors.green}/></View><View style={{flex:1}}><Text style={s.itemTitle}>{item.title}</Text><Text style={s.itemSub}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>)}
 <Text style={s.version}>CivicFix · Bengaluru · v1.0.0</Text>
 </ScrollView>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:colors.canvas},content:{padding:22,alignItems:"center"},avatar:{width:86,height:86,borderRadius:43,backgroundColor:colors.greenSoft,alignItems:"center",justifyContent:"center",marginTop:35},name:{fontSize:21,fontWeight:"900",color:colors.ink,marginTop:14},sub:{fontSize:13,color:colors.muted,marginTop:5},section:{alignSelf:"flex-start",fontSize:17,fontWeight:"900",color:colors.ink,marginTop:30,marginBottom:12},item:{width:"100%",backgroundColor:colors.white,borderRadius:16,padding:14,flexDirection:"row",alignItems:"center",gap:12,marginBottom:10},icon:{width:42,height:42,borderRadius:13,backgroundColor:colors.greenSoft,alignItems:"center",justifyContent:"center"},itemTitle:{fontSize:13,fontWeight:"900",color:colors.ink},itemSub:{fontSize:11,color:colors.muted,marginTop:4},version:{fontSize:11,color:colors.muted,marginTop:25}});
