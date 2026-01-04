import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-account-page',
  imports: [CommonModule],
  templateUrl: './account-page.html',
  styleUrl: './account-page.css',
})
export class AccountPage implements OnInit {
  loading = true;
  authenticated = false;
  username?: string;
  email?: string;
  fullName?: string;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.userService.init();
      this.loadUserData();
    } catch {
      this.authenticated = false;
    } finally {
      this.loading = false;
    }
  }

  private loadUserData(): void {
    if (!this.userService.isLoggedIn()) {
      this.authenticated = false;
      return;
    }

    this.authenticated = true;
    this.username = this.userService.getUsername();
    this.email = this.userService.getEmail();
    this.fullName = this.userService.getFullName();
  }

  async logout(): Promise<void> {
    localStorage.removeItem('planningPokerUsername');
    
    try {
      await this.userService.logout(window.location.origin);
    } catch {
      this.router.navigate(['/']);
    }
  }

  async login(): Promise<void> {
    try {
      await this.userService.login(window.location.origin);
    } catch {
      // Login redirect failed - user stays on page
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}