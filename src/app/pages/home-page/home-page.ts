import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '../../services/translate.service';

@Component({
  selector: 'app-home-page',
  imports: [FormsModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  joinCode = '';

  constructor(
    private router: Router,
    public translateService: TranslateService
  ) { }

  goToNewGame(): void {
    this.router.navigate(['/new-game']);
  }

  joinGame(): void {
    if (this.joinCode.trim()) {
      this.router.navigate(['/game', this.joinCode.toUpperCase()]);
    }
  }

  toggleLanguage(): void {
    this.translateService.toggleLanguage();
  }
}
