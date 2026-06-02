export const environment = {
  production: false,

  /** URL base de Firebase Realtime Database */
  firebaseUrl: 'https://quetzalnote-44a5f-default-rtdb.firebaseio.com/',

  /**
   * Firebase Web API Key.
   * Obtenerlo en: Firebase Console → tu proyecto → Project Settings → General → Web API Key
   * Formato: AIzaSy...
   */
  firebaseApiKey: 'REEMPLAZAR_CON_TU_FIREBASE_WEB_API_KEY',

  /**
   * Google OAuth 2.0 Client ID.
   * Obtenerlo en: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
   * Formato: xxxxxx.apps.googleusercontent.com
   *
   * Pasos para crearlo:
   * 1. Ir a https://console.cloud.google.com
   * 2. Seleccionar el mismo proyecto de Firebase
   * 3. APIs & Services → Credentials → Create Credentials → OAuth Client ID
   * 4. Application type: Web application
   * 5. Authorized JavaScript origins: http://localhost:4200
   * 6. Authorized redirect URIs: http://localhost:4200
   */
  googleClientId: 'REEMPLAZAR_CON_TU_GOOGLE_CLIENT_ID',
};
