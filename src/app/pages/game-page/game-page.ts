import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SocketService, Lobby } from '../../services/socket.service';
import { TranslateService } from '../../services/translate.service';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-game-page',
  imports: [FormsModule, QRCodeComponent],
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

  votingCards = [
    { value: '0', image: 'assets/card_0.png' },
    { value: '1', image: 'assets/card_1.png' },
    { value: '2', image: 'assets/card_2.png' },
    { value: '3', image: 'assets/card_3.png' },
    { value: '5', image: 'assets/card_5.png' },
    { value: '8', image: 'assets/card_8.png' },
    { value: '13', image: 'assets/card_13.png' },
    { value: '21', image: 'assets/card_21.png' },
    { value: '34', image: 'assets/card_34.png' },
    { value: '55', image: 'assets/card_55.png' },
    { value: '89', image: 'assets/card_89.png' },
    { value: '?', image: 'assets/card_question.png' },
    { value: '☕', image: 'assets/card_coffee.png' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
    public translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.lobbyId = (this.route.snapshot.paramMap.get('lobbyId') || '').toUpperCase();
    this.gameLink = this.lobbyId
      ? `${window.location.origin}/game/${this.lobbyId}`
      : window.location.href;

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
        alert(this.translateService.translate('alert.lobbyClosed'));
        this.router.navigate(['/']);
      }),
      this.socketService.onKicked().subscribe(() => {
        alert(this.translateService.translate('alert.kicked'));
        this.router.navigate(['/']);
      })
    );

    if (this.userName && this.lobbyId) {
      if (this.socketService.currentLobby?.id === this.lobbyId) {
        this.hasJoined = true;
        this.showInvitePopup = true;
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setVotingCards(system: string): void {
    switch (system) {
      case 'tshirt':
        this.votingCards = [
          { value: 'XS', image: '' }, { value: 'S', image: '' }, { value: 'M', image: '' },
          { value: 'L', image: '' }, { value: 'XL', image: '' }, { value: 'XXL', image: '' },
          { value: '?', image: 'assets/card_question.png' }, { value: '☕', image: 'assets/card_coffee.png' }
        ];
        break;
      case 'powers':
        this.votingCards = [
          { value: '1', image: 'assets/card_1.png' }, { value: '2', image: 'assets/card_2.png' },
          { value: '4', image: '' }, { value: '8', image: '' }, { value: '16', image: '' },
          { value: '32', image: '' }, { value: '64', image: '' },
          { value: '?', image: 'assets/card_question.png' }, { value: '☕', image: 'assets/card_coffee.png' }
        ];
        break;
      default:
        this.votingCards = [
          { value: '0', image: 'assets/card_0.png' },
          { value: '1', image: 'assets/card_1.png' },
          { value: '2', image: 'assets/card_2.png' },
          { value: '3', image: 'assets/card_3.png' },
          { value: '5', image: 'assets/card_5.png' },
          { value: '8', image: 'assets/card_8.png' },
          { value: '13', image: 'assets/card_13.png' },
          { value: '21', image: 'assets/card_21.png' },
          { value: '34', image: 'assets/card_34.png' },
          { value: '55', image: 'assets/card_55.png' },
          { value: '89', image: 'assets/card_89.png' },
          { value: '?', image: 'assets/card_question.png' },
          { value: '☕', image: 'assets/card_coffee.png' }
        ];
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
        alert(err.message || this.translateService.translate('alert.joinFailed'));
        this.router.navigate(['/']);
      }
    });
  }

  vote(card: { value: string; image: string }): void {
    if (!this.lobbyId || this.lobby?.votesRevealed) return;

    this.selectedVote = card.value;
    this.socketService.submitVote(this.lobbyId, card.value);
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

  isHost(): boolean {
    return this.lobby?.host === this.socketService.socketId;
  }

  kickUser(userId: string): void {
    if (!this.lobbyId || !this.isHost()) return;

    if (confirm(this.translateService.translate('alert.confirmKick'))) {
      this.socketService.kickUser(this.lobbyId, userId);
    }
  }

  toggleLanguage(): void {
    this.translateService.toggleLanguage();
  }
}
