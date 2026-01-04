import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-welcome-page',
  imports: [CommonModule],
  templateUrl: './welcome-page.html',
  styleUrl: './welcome-page.css',
})
export class WelcomePage implements OnInit {
  isAuthenticated = false;
  username = '';
  fullName = '';
  scrollY = 0;
  isLoading = true;

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.userService.init();
      this.isAuthenticated = this.userService.isLoggedIn();
      if (this.isAuthenticated) {
        this.username = this.userService.getUsername() || '';
        this.fullName = this.userService.getFullName() || '';
      }
    } catch {
      this.isAuthenticated = false;
    } finally {
      this.isLoading = false;
    }
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.scrollY = window.scrollY;
  }

  getStarted(): void {
    this.router.navigate(['/home']);
  }

  async login(): Promise<void> {
    try {
      await this.userService.login(window.location.origin);
    } catch {
      // Login redirect failed
    }
  }

  goToAccount(): void {
    this.router.navigate(['/account']);
  }
}
