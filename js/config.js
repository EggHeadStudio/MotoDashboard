export const APP_VERSION = '1.6.6-batch8.6';

export const THEME_NAMES = ['themes.normal', 'themes.monochrome', 'themes.forest', 'themes.urban', 'themes.night'];
export const THEME_CLASSES = ['theme-normal', 'theme-monochrome', 'theme-forest', 'theme-urban', 'theme-night'];
export const THEME_MAP_STYLES = {
  normal: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  },
  monochrome: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, SRTM | Map style © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a>'
  },
  forest: {
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" target="_blank" rel="noopener">CyclOSM</a>'
  },
  urban: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, SRTM | Map style © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a>'
  },
  night: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, SRTM | Map style © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a>'
  }
};

export const WMO_CODES = {
  0: 'weather.0',
  1: 'weather.1', 2: 'weather.2', 3: 'weather.3',
  45: 'weather.45', 48: 'weather.48',
  51: 'weather.51', 53: 'weather.53', 55: 'weather.55',
  56: 'weather.56', 57: 'weather.57',
  61: 'weather.61', 63: 'weather.63', 65: 'weather.65',
  66: 'weather.66', 67: 'weather.67',
  71: 'weather.71', 73: 'weather.73', 75: 'weather.75',
  77: 'weather.77',
  80: 'weather.80', 81: 'weather.81', 82: 'weather.82',
  85: 'weather.85', 86: 'weather.86',
  95: 'weather.95', 96: 'weather.96', 99: 'weather.99'
};

export const SESSION_STORAGE_KEY = 'moto-dashboard-sessions-v2';
export const SETTINGS_STORAGE_KEY = 'moto-dashboard-settings-v1';

export const DB_NAME = 'moto-dashboard-db';
export const DB_VERSION = 2;
export const SESSIONS_STORE_NAME = 'sessions-v2';
export const SETTINGS_STORE_NAME = 'settings';


export const MOVING_SPEED_THRESHOLD_KMH = 2.5;
export const STOP_SPEED_THRESHOLD_KMH = 1.7;
export const MOVING_ACCURACY_MAX_M = 55;

export const MIN_ACCEPTED_POINT_DISTANCE_M = 4;
export const MAX_POINT_JUMP_DISTANCE_M = 500;
export const MAX_POINT_JUMP_SPEED_KMH = 220;

export const MIN_MOVING_CONFIRMATION_SAMPLES = 2;
export const MIN_STOP_CONFIRMATION_SAMPLES = 2;

export const MAX_VALID_SPEED_KMH = 220;
export const MAX_FALLBACK_SPEED_KMH = 220;

export const HEADING_MIN_SPEED_KMH = 4;
export const HEADING_MIN_DISTANCE_M = 6;
export const NORTH_UP_DELAY_MS = 12000;
