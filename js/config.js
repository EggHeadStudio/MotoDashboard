export const APP_VERSION = '1.2';

export const THEME_NAMES = ['Normaali', 'Mustavalko', 'Metsä', 'Asutus', 'Yö'];
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
  0: 'Selkeää',
  1: 'Melko selkeää', 2: 'Puolipilvistä', 3: 'Pilvistä',
  45: 'Sumua', 48: 'Huurteista sumua',
  51: 'Kevyttä tihkusadetta', 53: 'Tihkusadetta', 55: 'Tiheää tihkusadetta',
  56: 'Jäätävää tihkusadetta', 57: 'Tiheää jäätävää tihkusadetta',
  61: 'Kevyttä sadetta', 63: 'Sadetta', 65: 'Rankkasadetta',
  66: 'Jäätävää sadetta', 67: 'Tiheää jäätävää sadetta',
  71: 'Kevyttä lumisadetta', 73: 'Lumisadetta', 75: 'Tiheää lumisadetta',
  77: 'Lumirakeita',
  80: 'Sadekuuroja', 81: 'Sadekuuroja', 82: 'Voimakkaita sadekuuroja',
  85: 'Lumikuuroja', 86: 'Voimakkaita lumikuuroja',
  95: 'Ukkosta', 96: 'Ukkosta ja raesadetta', 99: 'Ukkosta ja raesadetta'
};

export const SESSION_STORAGE_KEY = 'moto-dashboard-sessions-v1';
export const SETTINGS_STORAGE_KEY = 'moto-dashboard-settings-v1';

export const DB_NAME = 'moto-dashboard-db';
export const DB_VERSION = 1;
export const SESSIONS_STORE_NAME = 'sessions';
export const SETTINGS_STORE_NAME = 'settings';

export const RESUME_ANCHOR_GAP_MS = 10 * 60 * 1000;
export const RESUME_ANCHOR_DISTANCE_M = 1200;

export const MOVING_SPEED_THRESHOLD_KMH = 2.5;
export const STOP_SPEED_THRESHOLD_KMH = 1.7;
export const MOVING_ACCURACY_MAX_M = 55;

export const MIN_ACCEPTED_POINT_DISTANCE_M = 4;
export const MAX_POINT_JUMP_DISTANCE_M = 500;
export const MAX_POINT_JUMP_SPEED_KMH = 220;

export const MIN_MOVING_CONFIRMATION_SAMPLES = 2;
export const MIN_STOP_CONFIRMATION_SAMPLES = 2;
export const STOP_GAP_BREAK_MS = 2 * 60 * 1000;
export const STOP_GAP_BREAK_DISTANCE_M = 300;

export const MAX_VALID_SPEED_KMH = 220;
export const MAX_FALLBACK_SPEED_KMH = 220;

export const HEADING_MIN_SPEED_KMH = 4;
export const HEADING_MIN_DISTANCE_M = 6;
export const ROTATION_SMOOTHING = 0.26;
export const NORTH_UP_DELAY_MS = 12000;
