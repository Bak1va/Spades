import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';
import { TranslateService } from '../../services/translate.service';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-new-game',
  imports: [FormsModule, CommonModule],
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
  isLoading = true; // Show loading while checking auth

  constructor(
    private router: Router,
    private socketService: SocketService,
    public translateService: TranslateService,
    private userService: UserService
  ) {
    this.lang = this.translateService.currentLang;
  }

  ngOnInit(): void {
    this.userService
      .init()
      .then((authenticated) => {
        if (!authenticated) {
          // Not logged in - redirect to Keycloak login
          // After login, Keycloak will redirect back to this page
          this.userService.login(window.location.href);
          return Promise.reject('not-authenticated');
        }
        return this.userService.getBearerToken();
      })
      .then((token) =>
        fetch(`${environment.backendUrl}/me`, {
          headers: { Authorization: token },
        })
      )
      .then((resp) => {
        if (!resp.ok) return Promise.reject('no-user');
        return resp.json();
      })
      .then((data: any) => {
        const user = data?.user || data;
        if (user?.name) {
          this.userName = user.name;
        } else {
          // Fallback to Keycloak token username
          const kc = this.userService.getUsername();
          if (kc) {
            this.userName = kc;
          }
        }
        localStorage.setItem('planningPokerUsername', this.userName);
        this.isLoading = false;
      })
      .catch((err) => {
        if (err !== 'not-authenticated') {
          // Authenticated but /me failed - use Keycloak username directly
          const kc = this.userService.getUsername();
          if (kc) {
            this.userName = kc;
            localStorage.setItem('planningPokerUsername', kc);
          }
          this.isLoading = false;
        }
        // If 'not-authenticated', we're redirecting to login, so don't update isLoading
      });
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
      },
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