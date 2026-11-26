import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
export default function TextField({label,error,style,...props}){
 return <View style={[styles.group,style]}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={props.accessibilityLabel||label} placeholderTextColor={colors.muted} style={[styles.input,error&&{borderColor:colors.danger}]}/>{error?<Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>:null}</View>;
}
const styles=StyleSheet.create({group:{gap:spacing.sm},label:{color:colors.text,fontWeight:'600',fontSize:14},input:{minHeight:48,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,backgroundColor:colors.surface,color:colors.text,fontSize:16},error:{color:colors.danger,fontSize:13}});
