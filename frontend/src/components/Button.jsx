import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
export default function Button({title,onPress,loading=false,disabled=false,variant='primary'}){
 const blocked=disabled||loading, secondary=variant==='secondary';
 return <Pressable accessibilityRole="button" accessibilityState={{disabled:blocked,busy:loading}} disabled={blocked} onPress={onPress} style={({pressed})=>[styles.base,secondary&&styles.secondary, (blocked||pressed)&&styles.dim]}>{loading?<ActivityIndicator color={secondary?colors.primary:'#fff'}/>:<Text style={[styles.label,secondary&&{color:colors.primary}]}>{title}</Text>}</Pressable>;
}
const styles=StyleSheet.create({base:{minHeight:48,paddingVertical:11,paddingHorizontal:spacing.md,borderRadius:12,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},secondary:{backgroundColor:colors.soft,borderWidth:1,borderColor:colors.border},dim:{opacity:0.55},label:{textAlign:'center',color:'#fff',fontSize:16,fontWeight:'600'}});
