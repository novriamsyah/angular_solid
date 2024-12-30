import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Role } from '../models/role';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = 'https://api.example.com'; // Replace with your API URL
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private refreshTokenInProgress = false;

  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor() { }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, { email, password }).pipe(
      tap(response => this.handleAuthResponse(response)),
      switchMap(() => of(this.currentUser()!))
    );
  }

  logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<string> {
    if (this.refreshTokenInProgress) {
      return new Observable(observer => {
        this.refreshTokenSubject.subscribe({
          next: (token: string) => {
            if (token) {
              observer.next(token);
              observer.complete();
            }
          }
        });
      });
    } else {
      this.refreshTokenInProgress = true;
      this.refreshTokenSubject.next(null);
      return this.http.post<AuthResponse>(`${this.API_URL}/refresh-token`, {
        refresh_token: this.getRefreshToken()
      }).pipe(
        tap(response => this.handleAuthResponse(response)),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        }),
        switchMap(() => of(this.getAccessToken()!))
      );
    }
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);
  }

  private checkAuth(): void {
    const token = this.getAccessToken();
    if (token) {
      // const decodedToken: any = jwtDecode(token);
      const decodedToken: any = {};
      if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
        this.currentUser.set(decodedToken.user);
        this.isAuthenticated.set(true);
      } else {
        this.logout();
      }
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  hasRole(role: Role): boolean {
    return this.currentUser()?.role === role;
  }
}
