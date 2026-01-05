import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { TranslateService } from '../../services/translate.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-new-game',
  imports: [FormsModule, CommonModule, TranslatePipe],
  templateUrl: './new-game.html',
  styleUrl: './new-game.css',
})
export class NewGame implements OnInit, OnDestroy {
  gameName = '';
  userName = '';
  selectedVotingSystem = 'fibonacci';
  lang: 'en' | 'ro' | 'fr';
  isLoading = true;
  private langSubscription?: Subscription;

  private lobbyId = '';

  constructor(
    private router: Router,
    private socketService: SocketService,
    public translateService: TranslateService,
    private userService: UserService
  ) {
    this.lang = this.translateService.currentLang;
  }

  async ngOnInit(): Promise<void> {
    this.langSubscription = this.translateService.currentLang$.subscribe(lang => {
      this.lang = lang;
    });

    try {
      const authenticated = await this.userService.init();

      if (!authenticated) {
        await this.userService.login(window.location.href);
        return;
      }

      this.userName = this.userService.getFullName() 
        || this.userService.getUsername() 
        || '';

      if (this.userName) {
        localStorage.setItem('planningPokerUsername', this.userName);
      }
    } catch {
      // Use cached username as fallback
      this.userName = localStorage.getItem('planningPokerUsername') || '';
    } finally {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.langSubscription?.unsubscribe();
  }

  createGame(): void {
    if (!this.userName.trim()) return;

    localStorage.setItem('planningPokerUsername', this.userName);
    localStorage.setItem('planningPokerVotingSystem', this.selectedVotingSystem);
    
    const gameNameToUse = this.gameName.trim() || undefined;
    if (gameNameToUse) {
      localStorage.setItem('planningPokerGameName', gameNameToUse);
    }

    this.socketService.createLobby(this.userName, gameNameToUse).subscribe({
      next: (data) => {
        this.lobbyId = data.lobbyId || data.lobby?.id || '';
        if (this.lobbyId) {
          this.router.navigate(['/game', this.lobbyId]);
        }
      },
      error: (err) => console.error('Failed to create lobby:', err),
    });
  }

  setLanguage(lang: 'en' | 'ro' | 'fr'): void {
    this.lang = lang;
    this.translateService.setLanguage(lang);
  }
}