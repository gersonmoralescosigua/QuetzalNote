// auth.service.ts — autenticación Google y email/password vía Firebase Identity Toolkit REST. Sin SDK.
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

// Tipos de respuesta del Identity Toolkit REST API
interface FirebaseSignInResponse {
  localId: string; email: string; displayName: string;
  photoUrl: string; idToken: string; refreshToken: string; expiresIn: string;
}
interface FirebasePasswordSignInResponse {
  localId: string; email: string; displayName?: string;
  idToken: string; refreshToken: string; expiresIn: string; registered: boolean;
}
interface GoogleCredentialResponse { credential: string; }

// Referencia global a Google Identity Services (GIS), cargado en index.html
declare const google: {
  accounts: { id: {
    initialize: (config: object) => void;
    prompt: (callback?: (notification: any) => void) => void;
    disableAutoSelect: () => void;
    cancel: () => void;
  }};
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private readonly SIGN_IN_URL =
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${environment.firebaseApiKey}`;
  private readonly PASSWORD_SIGN_IN_URL =
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${environment.firebaseApiKey}`;
  private readonly STORAGE_KEY = 'qn_auth_user';
  private gisInitialized = false;

  readonly currentUser = signal<User | null>(this.loadUserFromStorage());
  readonly isAuthenticated = signal<boolean>(!!this.loadUserFromStorage());
  readonly isSigningIn = signal<boolean>(false);
  readonly authError = signal<string | null>(null);

  // Inicializa GIS una sola vez con el callback que recibe el JWT de Google
  initGoogleSignIn(): void {
    if (this.gisInitialized) return;
    if (typeof google === 'undefined') {
      console.error('[AuthService] GIS no disponible. Verifica el script en index.html.');
      return;
    }
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: GoogleCredentialResponse) => this.handleGoogleCredential(response.credential),
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    this.gisInitialized = true;
  }

  triggerGooglePrompt(): void {
    if (!this.gisInitialized) this.initGoogleSignIn();
    if (typeof google === 'undefined') return;
    this.isSigningIn.set(true);
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        this.isSigningIn.set(false);
      }
    });
  }

  signInWithEmail(email: string, password: string): void {
    if (!email || !password) return;
    this.isSigningIn.set(true);
    this.authError.set(null);

    this.http.post<FirebasePasswordSignInResponse>(this.PASSWORD_SIGN_IN_URL, {
      email, password, returnSecureToken: true,
    }).pipe(
      map((res): User => ({
        uid: res.localId,
        email: res.email || '',
        displayName: res.displayName || res.email.split('@')[0] || 'Usuario',
        photoUrl: '',
        idToken: res.idToken,
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

  signOut(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.disableAutoSelect();
      google.accounts.id.cancel();
    }
    this.clearUser();
    console.log('[AuthService] Sesión cerrada.');
  }

  // Recibe el JWT de Google y lo valida contra Firebase Identity Toolkit
  private handleGoogleCredential(googleJwt: string): void {
    this.exchangeWithFirebase(googleJwt).subscribe({
      next: (user) => {
        this.setUser(user);
        this.isSigningIn.set(false);
        console.log(`[AuthService] Login exitoso: ${user.email} (${user.uid})`);
      },
      error: (err: Error) => {
        this.isSigningIn.set(false);
        console.error('[AuthService] Error en login:', err.message);
      },
    });
  }

  private exchangeWithFirebase(googleJwt: string): Observable<User> {
    const body = {
      postBody: `id_token=${googleJwt}&providerId=google.com`,
      requestUri: window.location.origin,
      returnIdpCredential: true,
      returnSecureToken: true,
    };
    return this.http.post<FirebaseSignInResponse>(this.SIGN_IN_URL, body).pipe(
      map((res): User => ({
        uid: res.localId,
        email: res.email || '',
        displayName: res.displayName || 'Usuario',
        photoUrl: res.photoUrl || '',
        idToken: res.idToken,
      })),
      catchError(this.handleError),
    );
  }

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

  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'No se pudo iniciar sesión.';
    if (error.status === 0) {
      mensaje = 'Sin conexión a internet.';
    } else if (error.error?.error?.message) {
      const m: string = error.error.error.message;
      if (m.includes('INVALID_IDP_RESPONSE')) mensaje = 'Credencial de Google inválida. Intenta de nuevo.';
      else if (m.includes('EMAIL_NOT_FOUND') || m.includes('INVALID_LOGIN_CREDENTIALS') || m.includes('INVALID_EMAIL')) mensaje = 'Email o contraseña incorrectos.';
      else if (m.includes('WRONG_PASSWORD')) mensaje = 'Contraseña incorrecta.';
      else if (m.includes('TOO_MANY_ATTEMPTS_TRY_LATER') || m.includes('USER_DISABLED')) mensaje = 'Cuenta bloqueada. Intenta más tarde.';
    }
    return throwError(() => new Error(mensaje));
  }
}
