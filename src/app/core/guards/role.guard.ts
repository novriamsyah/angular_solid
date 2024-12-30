import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/role';

export const roleGuard = (allowedRoles: Role[]) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && allowedRoles.some(role => authService.hasRole(role))) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};