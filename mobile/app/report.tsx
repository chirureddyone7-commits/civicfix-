import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { createIssue } from "../src/api";
import { colors, shadow } from "../src/theme";

const types = [
  ["ROADS","Pothole","warning-outline"],["GARBAGE","Garbage","trash-outline"],["STREETLIGHT","Streetlight","bulb-outline"],
  ["WATER","Water leakage","water-outline"],["DRAINAGE","Drainage","grid-outline"],["OTHER","Others","ellipsis-horizontal-circle-outline"]
] as const;

export default function ReportScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [step,setStep]=useState(0);
  const [category,setCategory]=useState<string>(params.category || "ROADS");
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [photos,setPhotos]=useState<string[]>([]);
  const [location,setLocation]=useState("");
  const [coords,setCoords]=useState<{latitude:number;longitude:number}|null>(null);
  const [busy,setBusy]=useState(false);
  const [ai,setAi]=useState("");
  const pickPhoto=async()=>{
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){Alert.alert("Permission needed","Allow photo access to attach evidence.");return;}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:0.75});
    if(!result.canceled && result.assets[0]) setPhotos(p=>[...p,result.assets[0].uri].slice(0,5));
  };
  const locate=async()=>{
    const permission=await Location.requestForegroundPermissionsAsync();
    if(!permission.granted){Alert.alert("Location permission","You can type the area/address manually.");return;}
    const pos=await Location.getCurrentPositionAsync({});
    setCoords({latitude:pos.coords.latitude,longitude:pos.coords.longitude});
    const places=await Location.reverseGeocodeAsync(pos.coords);
    const p=places[0];
    setLocation([p?.name,p?.street,p?.district,p?.city,p?.region].filter(Boolean).join(", ") || "Current location");
  };
  const submit=async()=>{
    if(!title.trim()||description.trim().length<5||!location.trim()){Alert.alert("Missing details","Add a title, description and location.");return;}
    setBusy(true);
    try{
      const result=await createIssue({title:title.trim(),description:description.trim(),category,location:location.trim(),latitude:coords?.latitude??null,longitude:coords?.longitude??null});
      setAi(result.ai_analysis?.used ? `AI classified this as ${result.ai_analysis.category} · ${result.ai_analysis.priority} priority` : "Report submitted. Automatic AI classification was unavailable.");
      Alert.alert("Report submitted",`Your complaint ID is CF-${String(result.issue.id).padStart(4,"0")}.`,[{text:"View reports",onPress:()=>router.replace("/(tabs)/reports")}]);
    }catch(e){Alert.alert("Could not submit",e instanceof Error?e.message:"Check your API connection.");}
    finally{setBusy(false);}
  };
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.header}><Pressable onPress={()=>step?setStep(step-1):router.back()}><Ionicons name="arrow-back" size={24} color={colors.ink}/></Pressable><Text style={s.headerTitle}>Report an Issue</Text><View style={{width:24}}/></View>
    <View style={s.steps}>{["Details","Media","Location"].map((label,i)=><Pressable key={label} style={s.step} onPress={()=>i<step&&setStep(i)}><View style={[s.dot,i<=step&&s.dotActive]}><Text style={[s.dotText,i<=step&&{color:"#fff"}]}>{i<step?"✓":i+1}</Text></View><Text style={s.stepLabel}>{label}</Text></Pressable>)}</View>
    {step===0?<><Text style={s.section}>Select Issue Type</Text><View style={s.typeGrid}>{types.map(([value,label,icon])=><Pressable key={value} onPress={()=>setCategory(value)} style={[s.typeCard,category===value&&s.typeSelected]}><Ionicons name={icon as any} size={25} color={category===value?colors.green:colors.ink}/><Text style={s.typeLabel}>{label}</Text></Pressable>)}</View>
      <Text style={s.section}>Issue Title</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Large pothole near MG Road" style={s.input} maxLength={150}/>
      <Text style={s.section}>Describe the Issue</Text><TextInput value={description} onChangeText={setDescription} placeholder="Describe what happened, where and who is affected..." multiline maxLength={1000} style={[s.input,s.textarea]}/><Text style={s.counter}>{description.length}/1000</Text>
    </>:step===1?<><Text style={s.section}>Add Photos</Text><Text style={s.helper}>Photos help the city team understand the issue. Add up to 5 images.</Text><View style={s.photos}>{photos.map((uri,i)=><View key={uri} style={s.photoWrap}><Image source={{uri}} style={s.photo}/><Pressable style={s.remove} onPress={()=>setPhotos(p=>p.filter((_,j)=>i!==j))}><Ionicons name="close" size={15} color="#fff"/></Pressable></View>)}{photos.length<5?<Pressable style={s.addPhoto} onPress={pickPhoto}><Ionicons name="camera-outline" size={28} color={colors.green}/><Text style={s.addLabel}>Add Photo</Text></Pressable>:null}</View><View style={s.note}><Ionicons name="information-circle-outline" size={18} color={colors.green}/><Text style={s.noteText}>Photos are previewed in this app. The current backend accepts text and location fields only, so images are not uploaded with the report yet.</Text></View></>:<><Text style={s.section}>Confirm Location</Text><Text style={s.helper}>Use GPS or enter a landmark/address manually.</Text><Pressable style={s.locate} onPress={locate}><Ionicons name="locate" size={19} color={colors.green}/><Text style={s.locateText}>Use my current location</Text></Pressable><TextInput value={location} onChangeText={setLocation} placeholder="Area, street or landmark" style={s.input}/>{coords?<Text style={s.coordinates}>{coords.latitude.toFixed(5)}° N, {coords.longitude.toFixed(5)}° E</Text>:null}<View style={s.mapPlaceholder}><Ionicons name="location" size={36} color={colors.green}/><Text style={s.mapText}>{location||"Your selected location will appear here"}</Text></View></>}
    <View style={s.footer}>{step<2?<Pressable style={s.primary} onPress={()=>{if(step===0&&(!title.trim()||description.trim().length<5)){Alert.alert("Add issue details","Enter a title and a description of at least 5 characters.");return;}setStep(step+1);}}><Text style={s.primaryText}>Next</Text><Ionicons name="arrow-forward" size={18} color="#fff"/></Pressable>:<Pressable disabled={busy} style={[s.primary,busy&&{opacity:.65}]} onPress={submit}>{busy?<ActivityIndicator color="#fff"/>:<><Text style={s.primaryText}>Submit Report</Text><Ionicons name="checkmark-circle-outline" size={19} color="#fff"/></>}</Pressable>}</View>
    {ai?<Text style={s.ai}>{ai}</Text>:null}
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:colors.canvas},content:{padding:20,paddingBottom:40},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:26},headerTitle:{fontSize:18,fontWeight:"900",color:colors.ink},steps:{flexDirection:"row",justifyContent:"space-around",marginBottom:30},step:{alignItems:"center",gap:7},dot:{width:34,height:34,borderRadius:17,backgroundColor:"#E4E8E5",alignItems:"center",justifyContent:"center"},dotActive:{backgroundColor:colors.green},dotText:{fontWeight:"900",color:colors.muted},stepLabel:{fontSize:12,fontWeight:"700",color:colors.muted},section:{fontSize:16,fontWeight:"900",color:colors.ink,marginTop:17,marginBottom:12},typeGrid:{flexDirection:"row",flexWrap:"wrap",gap:9},typeCard:{width:"31.5%",minHeight:92,backgroundColor:colors.white,borderRadius:16,borderWidth:1,borderColor:colors.line,alignItems:"center",justifyContent:"center",gap:8},typeSelected:{borderColor:colors.green,backgroundColor:colors.greenSoft,borderWidth:1.5},typeLabel:{fontSize:11,fontWeight:"800",color:colors.ink},input:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.line,borderRadius:14,padding:15,fontSize:14,color:colors.ink},textarea:{height:125,textAlignVertical:"top"},counter:{textAlign:"right",fontSize:11,color:colors.muted,marginTop:6},helper:{fontSize:13,color:colors.muted,lineHeight:19,marginBottom:18},photos:{flexDirection:"row",flexWrap:"wrap",gap:10},photoWrap:{position:"relative"},photo:{width:105,height:130,borderRadius:14},remove:{position:"absolute",right:6,top:6,width:25,height:25,borderRadius:13,backgroundColor:"#17231D",alignItems:"center",justifyContent:"center"},addPhoto:{width:105,height:130,borderRadius:14,borderWidth:1,borderStyle:"dashed",borderColor:"#AEBBB2",backgroundColor:colors.white,alignItems:"center",justifyContent:"center",gap:8},addLabel:{fontSize:12,fontWeight:"800",color:colors.ink},note:{marginTop:18,padding:13,backgroundColor:colors.greenSoft,borderRadius:13,flexDirection:"row",gap:9},noteText:{flex:1,fontSize:12,lineHeight:18,color:colors.greenDark},locate:{flexDirection:"row",alignItems:"center",gap:8,padding:14,backgroundColor:colors.greenSoft,borderRadius:13,marginBottom:13},locateText:{color:colors.green,fontWeight:"800"},coordinates:{fontSize:12,color:colors.muted,marginTop:8},mapPlaceholder:{height:180,borderRadius:18,backgroundColor:"#EAF1EB",alignItems:"center",justifyContent:"center",padding:20,marginTop:18,gap:10},mapText:{fontSize:13,fontWeight:"700",color:colors.ink,textAlign:"center"},footer:{marginTop:30},primary:{height:56,borderRadius:16,backgroundColor:colors.green,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:10,...shadow},primaryText:{color:"#fff",fontSize:15,fontWeight:"900"},ai:{marginTop:15,color:colors.green,fontSize:12,fontWeight:"700"}});
