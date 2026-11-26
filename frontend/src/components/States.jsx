import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Button from './Button';
import { colors, spacing } from '../theme';
export function LoadingState({message='Loading…'}){return <View accessibilityLiveRegion="polite" style={styles.container}><ActivityIndicator size="large" color={colors.primary}/><Text style={styles.message}>{message}</Text></View>;}
export function EmptyState({title='Nothing here yet',message,actionLabel,onAction}){return <View style={styles.container}><Text style={styles.title}>{title}</Text>{message?<Text style={styles.message}>{message}</Text>:null}{onAction&&actionLabel?<Button title={actionLabel} onPress={onAction}/>:null}</View>;}
export function ErrorState({message='Something went wrong. Please try again.',onRetry}){return <EmptyState title="Unable to load" message={message} actionLabel="Try again" onAction={onRetry}/>;}
const styles=StyleSheet.create({container:{padding:spacing.xl,gap:spacing.md,alignItems:'center',justifyContent:'center'},title:{fontSize:18,fontWeight:'600',color:colors.text,textAlign:'center'},message:{fontSize:14,color:colors.muted,textAlign:'center'}});
