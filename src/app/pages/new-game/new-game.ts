import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-new-game',
  imports: [FormsModule],
  templateUrl: './new-game.html',
  styleUrl: './new-game.css',
})
export class NewGame implements OnInit {
  gameName = '';
  userName = '';
  selectedVotingSystem = 'fibonacci';
  showLinkPopup = false;
  gameLink = '';
  copied = false;
  lobbyId = '';

  constructor(
    private router: Router,
    private socketService: SocketService
  ) {}

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
        this.lobbyId = data.lobbyId;
        this.gameLink = `${window.location.origin}/game/${this.lobbyId}`;
        this.showLinkPopup = true;
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

  closeLinkPopup(): void {
    this.showLinkPopup = false;
  }

  goToGame(): void {
    this.router.navigate(['/game', this.lobbyId]);
  }
}
