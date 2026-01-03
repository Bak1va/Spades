import { Component, OnInit } from '@angular/core';
import { UpperCasePipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';
import { TranslateService } from '../../services/translate.service';

@Component({
  selector: 'app-new-game',
  imports: [FormsModule, CommonModule, UpperCasePipe],
  templateUrl: './new-game.html',
  styleUrl: './new-game.css',
})
export class NewGame implements OnInit {
  gameName = '';
  userName = '';
  selectedVotingSystem = 'fibonacci';
  gameLink = '';
  copied = false;
  lobbyId = '';
  lang: 'en' | 'ro' | 'fr';

  constructor(
    private router: Router,
    private socketService: SocketService,
    public translateService: TranslateService
  ) {
    this.lang = this.translateService.currentLang;
  }

  ngOnInit(): void {
    const savedName = localStorage.getItem('planningPokerUsername');
    if (savedName) {
      this.userName = savedName;
    }
  }

  createGame(): void {
    if (!this.userName.trim()) {
      return;
    }

    localStorage.setItem('planningPokerUsername', this.userName);
    localStorage.setItem('planningPokerVotingSystem', this.selectedVotingSystem);

    this.socketService.createLobby(this.userName).subscribe({
      next: (data) => {
        this.lobbyId = data.lobbyId || data.lobby?.id || '';
        if (this.lobbyId) {
          this.gameLink = `${window.location.origin}/game/${this.lobbyId}`;
        } else if (data.lobby && data.lobby.id) {
          this.gameLink = `${window.location.origin}/game/${data.lobby.id}`;
          this.lobbyId = data.lobby.id;
        } else {
          this.gameLink = window.location.href;
        }
        this.goToGame();
      },
      error: (err) => {
        console.error('Failed to create lobby:', err);
      }
    });
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.gameLink).then(() => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    });
  }

  goToGame(): void {
    this.router.navigate(['/game', this.lobbyId]);
  }

  setLanguage(lang: 'en' | 'ro' | 'fr'): void {
    this.lang = lang;
    this.translateService.setLanguage(lang);
  }
}
