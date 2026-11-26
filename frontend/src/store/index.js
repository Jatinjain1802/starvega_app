import { configureStore, createSlice } from '@reduxjs/toolkit';
const auth=createSlice({name:'auth',initialState:{user:null},reducers:{signedIn:(state,action)=>{state.user=action.payload;},signedOut:state=>{state.user=null;}}});
export const {signedIn,signedOut}=auth.actions;
export const store=configureStore({reducer:{auth:auth.reducer}});
