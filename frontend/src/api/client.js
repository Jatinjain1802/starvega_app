import axios from 'axios';
import { API_BASE_URL } from '../config/api';
export const api = axios.create({baseURL:API_BASE_URL,timeout:15000});
let accessToken=null;
export function setAccessToken(token){accessToken=token;}
api.interceptors.request.use(config=>{
 if(accessToken)config.headers.Authorization='Bearer '+accessToken;
 return config;
});
