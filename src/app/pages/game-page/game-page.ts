import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SocketService, Lobby } from '../../services/socket.service';
import { TranslateService } from '../../services/translate.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { IssuesTab, Issue } from './issues-tab';

@Component({
  selector: 'app-game-page',
  imports: [FormsModule, QRCodeComponent, IssuesTab],
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
  showIssuesTab = false;
  currentIssue: Issue | null = null;
  isRevealing = false;
  countdownValue: number | null = null;
  noIssuesMessage = false;

  @ViewChild(IssuesTab) issuesTabComponent!: IssuesTab;

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
      this.socketService.onCountdownStarted().subscribe(() => {
        this.startCountdownAnimation();
      }),
      this.socketService.onIssueSelected().subscribe(data => {
        this.currentIssue = data.issue;
        this.noIssuesMessage = false;
        
        if (this.issuesTabComponent && data.issue) {
          const issueIndex = this.issuesTabComponent.issues.findIndex(i => i.id === data.issue.id);
          if (issueIndex !== -1) {
            this.issuesTabComponent.issues[issueIndex] = data.issue;
          }
        }
      }),
      this.socketService.onIssuesUpdated().subscribe(data => {
        if (this.issuesTabComponent) {
          this.issuesTabComponent.issues = data.issues;
        }
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
          { value: 'XS', image: 'assets/card_xs.png' }, { value: 'S', image: 'assets/card_s.png' }, { value: 'M', image: 'assets/card_m.png' },
          { value: 'L', image: 'assets/card_l.png' }, { value: 'XL', image: 'assets/card_xl.png' }, { value: 'XXL', image: 'assets/card_xxl.png' },
          { value: '?', image: 'assets/card_question.png' }, { value: '☕', image: 'assets/card_coffee.png' }
        ];
        break;
      case 'powers':
        this.votingCards = [
          { value: '1', image: 'assets/card_1.png' }, { value: '2', image: 'assets/card_2.png' },
          { value: '4', image: 'assets/card_4.png' }, { value: '8', image: 'assets/card_8.png' }, { value: '16', image: 'assets/card_16.png' },
          { value: '32', image: 'assets/card_32.png' }, { value: '64', image: 'assets/card_64.png' },
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
    if (!this.lobbyId || !this.allPlayersVoted() || !this.currentIssue) return;
    
    // Emit countdown start event - this will trigger startCountdownAnimation for ALL players
    this.socketService.startCountdown(this.lobbyId);
  }

  startCountdownAnimation(): void {
    this.isRevealing = true;
    this.countdownValue = 3;

    const countdownInterval = setInterval(() => {
      if (this.countdownValue && this.countdownValue > 1) {
        this.countdownValue--;
      } else {
        clearInterval(countdownInterval);
        this.countdownValue = null;
        this.isRevealing = false;
        
        // Only host reveals the votes after countdown
        if (this.isHost()) {
          this.socketService.revealVotes(this.lobbyId);
          
          // Calculate and store the result after a short delay
          setTimeout(() => {
            this.calculateAndStoreResult();
          }, 500);
        }
      }
    }, 1000);
  }

  allPlayersVoted(): boolean {
    if (!this.lobby || !this.lobby.users.length) return false;
    return this.lobby.users.every(user => user.vote !== null && user.vote !== undefined);
  }

  getVotedPlayersCount(): number {
    if (!this.lobby) return 0;
    return this.lobby.users.filter(user => user.vote !== null && user.vote !== undefined).length;
  }

  calculateAndStoreResult(): void {
    if (!this.lobby || !this.currentIssue) return;

    // Get all numeric votes (exclude '?' and '☕')
    const numericVotes = this.lobby.users
      .map(u => u.vote)
      .filter(vote => vote && !isNaN(Number(vote)))
      .map(vote => Number(vote));

    if (numericVotes.length === 0) {
      // If no numeric votes, mark as completed without points
      this.currentIssue.status = 'completed';
      this.currentIssue.points = '?';
      
      // Update the issue in the issues list as well
      if (this.issuesTabComponent) {
        const issueIndex = this.issuesTabComponent.issues.findIndex(i => i.id === this.currentIssue!.id);
        if (issueIndex !== -1) {
          this.issuesTabComponent.issues[issueIndex] = { ...this.currentIssue };
        }
      }
      
      // Broadcast the updated issue to all players
      this.socketService.selectIssue(this.lobbyId, this.currentIssue);
      if (this.issuesTabComponent) {
        this.socketService.updateIssuesList(this.lobbyId, this.issuesTabComponent.issues);
      }
      return;
    }

    // Calculate mean and round to nearest integer
    const mean = numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length;
    const roundedMean = Math.round(mean);

    // Update the current issue
    this.currentIssue.status = 'completed';
    this.currentIssue.points = roundedMean.toString();
    
    // Update the issue in the issues list as well
    if (this.issuesTabComponent) {
      const issueIndex = this.issuesTabComponent.issues.findIndex(i => i.id === this.currentIssue!.id);
      if (issueIndex !== -1) {
        this.issuesTabComponent.issues[issueIndex] = { ...this.currentIssue };
      }
    }
    
    // Broadcast the updated issue to all players
    this.socketService.selectIssue(this.lobbyId, this.currentIssue);
    if (this.issuesTabComponent) {
      this.socketService.updateIssuesList(this.lobbyId, this.issuesTabComponent.issues);
    }
  }

  startNewRound(): void {
    if (!this.lobbyId) return;
    
    // Clear votes and reset state
    this.socketService.newRound(this.lobbyId);
    this.noIssuesMessage = false;

    // Check if there are pending issues
    if (this.issuesTabComponent) {
      const pendingIssues = this.issuesTabComponent.getIssuesByStatus('pending');
      
      if (pendingIssues.length > 0) {
        // Automatically select the next pending issue
        const nextIssue = pendingIssues[0];
        nextIssue.status = 'voting';
        this.currentIssue = nextIssue;
        // Broadcast to all players
        this.socketService.selectIssue(this.lobbyId, nextIssue);
        this.socketService.updateIssuesList(this.lobbyId, this.issuesTabComponent.issues);
      } else {
        // No pending issues left
        this.currentIssue = null;
        this.noIssuesMessage = true;
        // Broadcast to all players
        this.socketService.selectIssue(this.lobbyId, null);
      }
    }
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

  toggleIssuesTab(): void {
    this.showIssuesTab = !this.showIssuesTab;
  }

  onIssueSelected(issue: Issue): void {
    this.currentIssue = issue;
    this.noIssuesMessage = false;
    // Update issue status to voting and start a new round
    if (issue.status === 'pending') {
      issue.status = 'voting';
      this.socketService.newRound(this.lobbyId);
    }
    // Broadcast the selected issue to all players
    this.socketService.selectIssue(this.lobbyId, issue);
    // Broadcast updated issues list
    if (this.issuesTabComponent) {
      this.socketService.updateIssuesList(this.lobbyId, this.issuesTabComponent.issues);
    }
  }

  onIssueAdded(title: string): void {
    console.log('Issue added:', title);
    // Broadcast updated issues list
    if (this.issuesTabComponent) {
      this.socketService.updateIssuesList(this.lobbyId, this.issuesTabComponent.issues);
    }
  }

  onIssueDeleted(issueId: string): void {
    if (this.currentIssue?.id === issueId) {
      this.currentIssue = null;
      this.socketService.selectIssue(this.lobbyId, null);
    }
    // Broadcast updated issues list
    if (this.issuesTabComponent) {
      this.socketService.updateIssuesList(this.lobbyId, this.issuesTabComponent.issues);
    }
  }
}
