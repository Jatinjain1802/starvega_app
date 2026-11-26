import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
export function Card({children,style}){return <View style={[styles.card,style]}>{children}</View>;}
export function StatCard({label,value,detail,tone='default',style}){return <Card style={style}><Text style={styles.label}>{label}</Text><Text style={[styles.value,tone==='danger'&&{color:colors.danger},tone==='positive'&&{color:colors.primary}]}>{value}</Text>{detail?<Text style={styles.label}>{detail}</Text>:null}</Card>;}
const styles=StyleSheet.create({card:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:16,padding:spacing.md,gap:spacing.sm},label:{color:colors.muted,fontSize:13},value:{color:colors.text,fontSize:24,fontWeight:'700'}});
