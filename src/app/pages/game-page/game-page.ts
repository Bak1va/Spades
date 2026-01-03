import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SocketService, Lobby } from '../../services/socket.service';

@Component({
  selector: 'app-game-page',
  imports: [FormsModule],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage implements OnInit, OnDestroy {
  lobbyId = '';
  userName = '';
  hasJoined = false;
  lobby: Lobby | null = null;
  selectedVote: string | null = null;
  showInvitePopup = false;
  copied = false;
  gameLink = '';

  votingCards = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    this.lobbyId = (this.route.snapshot.paramMap.get('lobbyId') || '').toUpperCase();
    this.gameLink = window.location.href;

    const savedName = localStorage.getItem('planningPokerUsername');
    if (savedName) {
      this.userName = savedName;
    }

    const votingSystem = localStorage.getItem('planningPokerVotingSystem');
    if (votingSystem) {
      this.setVotingCards(votingSystem);
    }

    this.subscriptions.push(
      this.socketService.lobby$.subscribe(lobby => {
        if (lobby) {
          this.lobby = lobby;
          this.hasJoined = true;
        }
      })
    );

    this.subscriptions.push(
      this.socketService.onUserJoined().subscribe(),
      this.socketService.onUserLeft().subscribe(),
      this.socketService.onVoteSubmitted().subscribe(),
      this.socketService.onVotesRevealed().subscribe(data => {
        this.selectedVote = null;
      }),
      this.socketService.onRoundStarted().subscribe(data => {
        this.selectedVote = null;
      }),
      this.socketService.onLobbyClosed().subscribe(() => {
        alert('The game has been closed by the host');
        this.router.navigate(['/']);
      })
    );

    if (this.userName && this.lobbyId) {
      if (this.socketService.currentLobby?.id === this.lobbyId) {
        this.hasJoined = true;
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setVotingCards(system: string): void {
    switch (system) {
      case 'tshirt':
        this.votingCards = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'];
        break;
      case 'powers':
        this.votingCards = ['1', '2', '4', '8', '16', '32', '64', '?', '☕'];
        break;
      default:
        this.votingCards = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
    }
  }

  joinLobby(): void {
    if (!this.userName.trim() || !this.lobbyId) return;

    localStorage.setItem('planningPokerUsername', this.userName);

    this.socketService.joinLobby(this.lobbyId, this.userName).subscribe({
      next: () => {
        this.hasJoined = true;
      },
      error: (err) => {
        alert(err.message || 'Failed to join lobby');
        this.router.navigate(['/']);
      }
    });
  }

  vote(card: string): void {
    if (!this.lobbyId || this.lobby?.votesRevealed) return;
    
    this.selectedVote = card;
    this.socketService.submitVote(this.lobbyId, card);
  }

  revealVotes(): void {
    if (!this.lobbyId) return;
    this.socketService.revealVotes(this.lobbyId);
  }

  startNewRound(): void {
    if (!this.lobbyId) return;
    this.socketService.newRound(this.lobbyId);
  }

  hasAnyVotes(): boolean {
    return this.lobby?.users.some(u => u.vote !== null) || false;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.gameLink).then(() => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    });
  }
}
