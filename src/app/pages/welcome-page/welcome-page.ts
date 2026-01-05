import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserService } from '../../services/user.service';
import { TranslateService } from '../../services/translate.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-welcome-page',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './welcome-page.html',
  styleUrl: './welcome-page.css',
})
export class WelcomePage implements OnInit, OnDestroy {
  isAuthenticated = false;
  username = '';
  fullName = '';
  scrollY = 0;
  isLoading = true;
  lang = 'en';
  private langSubscription?: Subscription;

  constructor(
    private router: Router,
    private userService: UserService,
    public translateService: TranslateService
  ) {}

  async ngOnInit(): Promise<void> {
    this.lang = this.translateService.currentLang;
    
    this.langSubscription = this.translateService.currentLang$.subscribe(lang => {
      this.lang = lang;
    });

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

  ngOnDestroy(): void {
    this.langSubscription?.unsubscribe();
  }

  setLanguage(lang: string): void {
    if (lang === 'en' || lang === 'ro' || lang === 'fr') {
      this.translateService.setLanguage(lang);
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
