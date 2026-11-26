import React from 'react';
import { View, ScrollView, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
export default function Screen({title,subtitle,children,scroll=true,refreshing=false,onRefresh,action}){
 const content=<><View style={styles.header}><View style={styles.heading}>{title?<Text accessibilityRole="header" style={styles.title}>{title}</Text>:null}{subtitle?<Text style={styles.subtitle}>{subtitle}</Text>:null}</View>{action}</View>{children}</>;
 return <SafeAreaView style={styles.safe}>{scroll?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={onRefresh?<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>:undefined}>{content}</ScrollView>:<View style={[styles.content,{flex:1}]}>{content}</View>}</SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,gap:spacing.md,flexGrow:1},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm},heading:{flex:1},title:{fontSize:26,fontWeight:'700',color:colors.text},subtitle:{fontSize:14,color:colors.muted,marginTop:4}});
