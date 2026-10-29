/** API base URL and APIM subscription key (see README → Authentication). */
import { API_BASE_URLS } from '../services/apiConfig.js';

/** `VITE_BACKEND_URL`, or `VITE_APIM_BASE_URL` + `/api`, else the WeekendLive APIM gateway. */
export const API_BASE_URL: string = API_BASE_URLS.BACKEND;

/** `VITE_WL_API_KEY`, sent as `Ocp-Apim-Subscription-Key` on every call. */
const APIM_KEY = String(import.meta.env.VITE_WL_API_KEY || '').trim();
export const apimHeaders: Record<string, string> = APIM_KEY ? { 'Ocp-Apim-Subscription-Key': APIM_KEY } : {};
