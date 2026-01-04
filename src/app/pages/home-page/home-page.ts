import { Component, OnInit, OnDestroy } from '@angular/core';
import { UpperCasePipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslateService } from '../../services/translate.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-home-page',
  imports: [FormsModule, CommonModule, TranslatePipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit, OnDestroy {
  joinCode = '';
  lang: 'en' | 'ro' | 'fr';
  private langSubscription?: Subscription;

  constructor(
    private router: Router,
    public translateService: TranslateService
    , private userService: UserService
  ) {
    this.lang = this.translateService.currentLang;
  }

  ngOnInit(): void {
    this.langSubscription = this.translateService.currentLang$.subscribe(lang => {
      this.lang = lang;
    });
  }

  ngOnDestroy(): void {
    this.langSubscription?.unsubscribe();
  }

  goToNewGame(): void {
    this.router.navigate(['/new-game']);
  }

  // Require SSO-authenticated users to start a new game
  startProtected(): void {
    if (this.userService.isLoggedIn()) {
      this.goToNewGame();
      return;
    }
    const redirect = `${window.location.origin}/new-game`;
    this.userService.login(redirect).catch(err => console.error('Login redirect failed', err));
  }

  joinGame(): void {
    if (this.joinCode.trim()) {
      this.router.navigate(['/game', this.joinCode.toUpperCase()]);
    }
  }

  setLanguage(lang: 'en' | 'ro' | 'fr'): void {
    this.lang = lang;
    this.translateService.setLanguage(lang);
  }
}
