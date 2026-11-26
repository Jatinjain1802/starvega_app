import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
const tones={success:['#E4F4EA','#17643A'],warning:['#FFF3D6','#855600'],danger:['#FDE8E7','#B42318'],neutral:['#E8EDF0','#465761']};
const statusTone={PAID:'success',RESOLVED:'success',COMPLETED:'success',PENDING:'warning',PARTIAL:'warning',IN_PROGRESS:'warning',OVERDUE:'danger',URGENT:'danger',REOPENED:'danger'};
export default function StatusPill({status,tone}){const [backgroundColor,color]=tones[tone]||tones[statusTone[status]]||tones.neutral;return <View style={[styles.pill,{backgroundColor}]}><Text style={[styles.text,{color}]}>{String(status??'').replaceAll('_',' ')}</Text></View>;}
const styles=StyleSheet.create({pill:{alignSelf:'flex-start',borderRadius:20,paddingHorizontal:10,paddingVertical:5},text:{fontSize:12,fontWeight:'600'}});
