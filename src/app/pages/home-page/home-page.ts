import { Component } from '@angular/core';
import { UpperCasePipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '../../services/translate.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-home-page',
  imports: [FormsModule, CommonModule, UpperCasePipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  joinCode = '';
  lang: 'en' | 'ro' | 'fr';

  constructor(
    private router: Router,
    public translateService: TranslateService
    , private userService: UserService
  ) {
    this.lang = this.translateService.currentLang;
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
