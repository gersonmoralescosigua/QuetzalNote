// auth.service.ts — autenticación con Google y email/password via Firebase Identity Toolkit REST. Sin SDK.
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

/** Tipado mínimo de la respuesta del Identity Toolkit */
interface FirebaseSignInResponse {
  localId:     string;
  email:       string;
  displayName: string;
  photoUrl:    string;
  idToken:     string;
  refreshToken: string;
  expiresIn:   string;
}

/** Tipado de la respuesta de signInWithPassword */
interface FirebasePasswordSignInResponse {
  localId:      string;
  email:        string;
  displayName?: string;
  idToken:      string;
  refreshToken: string;
  expiresIn:    string;
  registered:   boolean;
}

/** Tipado mínimo de la API de Google Identity Services */
interface GoogleCredentialResponse {
  credential: string; // JWT firmado por Google
}

/** Referencia global a la librería GIS (cargada en index.html) */
declare const google: {
  accounts: {
    id: {
      initialize: (config: object) => void;
      prompt: (callback?: (notification: any) => void) => void;
      disableAutoSelect: () => void;
      cancel: () => void;
    };
  };
};

/**
 * AuthService
 * Maneja el ciclo completo de autenticación con Google en QuetzalNote.
 *
 * Flujo:
 * 1. Inicializa Google Identity Services (GIS) con el Client ID del proyecto.
 * 2. Al hacer sign-in, GIS devuelve un JWT de Google (ID Token).
 * 3. Se intercambia ese JWT con el endpoint REST de Firebase Identity Toolkit.
 * 4. Firebase devuelve uid, email, displayName, photoUrl y su propio idToken.
 * 5. El usuario se persiste en localStorage y en un Signal para reactividad.
 *
 * SIN Firebase SDK. SIN AngularFire. Solo HttpClient + Google Identity Services.
 * Cumple restricciones del
 *
 * Responsable: Isidro (core/services/)
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  /** Endpoint de Firebase Identity Toolkit para sign-in con proveedor externo (Google) */
  private readonly SIGN_IN_URL =
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${environment.firebaseApiKey}`;

  /** Endpoint de Firebase Identity Toolkit para sign-in con email y contraseña */
  private readonly PASSWORD_SIGN_IN_URL =
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${environment.firebaseApiKey}`;

  /** Clave para persistir la sesión en localStorage */
  private readonly STORAGE_KEY = 'qn_auth_user';

  /** Flag para evitar inicializar GIS más de una vez */
  private gisInitialized = false;

  // estado reactivo

  /** Usuario actualmente autenticado. Null si no hay sesión. */
  readonly currentUser = signal<User | null>(this.loadUserFromStorage());

  /** True si hay una sesión activa válida. */
  readonly isAuthenticated = signal<boolean>(!!this.loadUserFromStorage());

  /** True mientras se procesa el login (mostrando spinner). */
  readonly isSigningIn = signal<boolean>(false);

  /** Mensaje de error del último intento de login. Null si no hay error. */
  readonly authError = signal<string | null>(null);

  // api pública

  /**
   * Inicializa Google Identity Services con el Client ID del proyecto.
   * Debe llamarse UNA vez cuando el componente de login está listo.
   * El callback se invocará automáticamente cuando Google devuelva la credencial.
   */
  initGoogleSignIn(): void {
    if (this.gisInitialized) return;
    if (typeof google === 'undefined') {
      console.error('[AuthService] Google Identity Services no está disponible. Verifica el script en index.html.');
      return;
    }

    google.accounts.id.initialize({
      client_id:   environment.googleClientId,
      callback:    (response: GoogleCredentialResponse) => this.handleGoogleCredential(response.credential),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    this.gisInitialized = true;
  }

  /**
   * Dispara el flujo de selección de cuenta de Google.
   * Muestra el widget de Google One Tap para que el usuario seleccione su cuenta.
   * Después del flujo, se llama automáticamente al callback de initGoogleSignIn.
   */
  triggerGooglePrompt(): void {
    if (!this.gisInitialized) {
      this.initGoogleSignIn();
    }

    if (typeof google === 'undefined') {
      console.error('[AuthService] GIS no disponible.');
      return;
    }

    this.isSigningIn.set(true);

    google.accounts.id.prompt((notification: any) => {
      // Si el usuario cierra el prompt sin seleccionar cuenta
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        this.isSigningIn.set(false);
      }
    });
  }

  /**
   * Inicia sesión con email y contraseña usando Firebase Identity Toolkit REST API.
   * Endpoint: POST /accounts:signInWithPassword
   * Documentación: https://firebase.google.com/docs/reference/rest/auth#section-sign-in-email-password
   */
  signInWithEmail(email: string, password: string): void {
    if (!email || !password) return;

    this.isSigningIn.set(true);

    const body = {
      email,
      password,
      returnSecureToken: true,
    };

    this.authError.set(null);

    this.http.post<FirebasePasswordSignInResponse>(this.PASSWORD_SIGN_IN_URL, body).pipe(
      map((res): User => ({
        uid:         res.localId,
        email:       res.email       || '',
        displayName: res.displayName || res.email.split('@')[0] || 'Usuario',
        photoUrl:    '',
        idToken:     res.idToken,
      })),
      catchError(this.handleError),
    ).subscribe({
      next: (user) => {
        this.setUser(user);
        this.isSigningIn.set(false);
        console.log(`[AuthService] Login email exitoso: ${user.email}`);
      },
      error: (err: Error) => {
        this.isSigningIn.set(false);
        this.authError.set(err.message);
        console.error('[AuthService] Error en login email:', err.message);
      },
    });
  }

  /**
   * Cierra la sesión del usuario actual.
   * Limpia el estado reactivo, localStorage y cancela la sesión de GIS.
   */
  signOut(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.disableAutoSelect();
      google.accounts.id.cancel();
    }
    this.clearUser();
    console.log('[AuthService] Sesión cerrada.');
  }

  // lógica interna

  /**
   * Recibe el JWT de Google y lo intercambia con Firebase Identity Toolkit REST API.
   * Firebase valida el JWT y devuelve la información del usuario de Firebase.
   */
  private handleGoogleCredential(googleJwt: string): void {
    this.exchangeWithFirebase(googleJwt).subscribe({
      next: (user) => {
        this.setUser(user);
        this.isSigningIn.set(false);
        console.log(`[AuthService] Login exitoso: ${user.email} (uid: ${user.uid})`);
      },
      error: (err: Error) => {
        this.isSigningIn.set(false);
        console.error('[AuthService] Error en login:', err.message);
        // El componente escucha isSigningIn para mostrar el error
      },
    });
  }

  /**
   * Llama al endpoint REST de Firebase para validar la credencial de Google
   * y obtener el usuario de Firebase.
   *
   * Endpoint: POST /accounts:signInWithIdp
   * Documentación: https://firebase.google.com/docs/reference/rest/auth#section-sign-in-with-oauth-credential
   */
  private exchangeWithFirebase(googleJwt: string): Observable<User> {
    const body = {
      postBody:              `id_token=${googleJwt}&providerId=google.com`,
      requestUri:            window.location.origin,
      returnIdpCredential:   true,
      returnSecureToken:     true,
    };

    return this.http.post<FirebaseSignInResponse>(this.SIGN_IN_URL, body).pipe(
      map((res): User => ({
        uid:         res.localId,
        email:       res.email       || '',
        displayName: res.displayName || 'Usuario',
        photoUrl:    res.photoUrl    || '',
        idToken:     res.idToken,
      })),
      catchError(this.handleError),
    );
  }

  // persistencia de sesión

  private setUser(user: User): void {
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  private clearUser(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private loadUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  // manejo de errores

  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'No se pudo iniciar sesión.';

    if (error.status === 0) {
      mensaje = 'Sin conexión a internet.';
    } else if (error.error?.error?.message) {
      // Mensajes de Firebase Identity Toolkit
      const firebaseMsg: string = error.error.error.message;
      if (firebaseMsg.includes('INVALID_IDP_RESPONSE')) {
        mensaje = 'Credencial de Google inválida. Intenta de nuevo.';
      } else if (firebaseMsg.includes('EMAIL_NOT_FOUND') || firebaseMsg.includes('INVALID_LOGIN_CREDENTIALS') || firebaseMsg.includes('INVALID_EMAIL')) {
        mensaje = 'Email o contraseña incorrectos.';
      } else if (firebaseMsg.includes('WRONG_PASSWORD')) {
        mensaje = 'Contraseña incorrecta.';
      } else if (firebaseMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER') || firebaseMsg.includes('USER_DISABLED')) {
        mensaje = 'Cuenta bloqueada o demasiados intentos. Intenta más tarde.';
      }
    }

    return throwError(() => new Error(mensaje));
  }
}
