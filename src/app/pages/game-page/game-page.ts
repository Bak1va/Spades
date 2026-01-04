import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SocketService, Lobby } from '../../services/socket.service';
import { TranslateService } from '../../services/translate.service';
import { UserService } from '../../services/user.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { IssuesTab, Issue } from '../issues-tab/issues-tab';

interface VotingCard {
  value: string;
  image: string;
}

interface VoteStatistic {
  vote: string;
  count: number;
  percentage: number;
}

// Voting card configurations
const VOTING_SYSTEMS: Record<string, VotingCard[]> = {
  fibonacci: [
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
  ],
  tshirt: [
    { value: 'XS', image: 'assets/card_xs.png' },
    { value: 'S', image: 'assets/card_s.png' },
    { value: 'M', image: 'assets/card_m.png' },
    { value: 'L', image: 'assets/card_l.png' },
    { value: 'XL', image: 'assets/card_xl.png' },
    { value: 'XXL', image: 'assets/card_xxl.png' },
    { value: '?', image: 'assets/card_question.png' },
    { value: '☕', image: 'assets/card_coffee.png' }
  ],
  powers: [
    { value: '1', image: 'assets/card_1.png' },
    { value: '2', image: 'assets/card_2.png' },
    { value: '4', image: 'assets/card_4.png' },
    { value: '8', image: 'assets/card_8.png' },
    { value: '16', image: 'assets/card_16.png' },
    { value: '32', image: 'assets/card_32.png' },
    { value: '64', image: 'assets/card_64.png' },
    { value: '?', image: 'assets/card_question.png' },
    { value: '☕', image: 'assets/card_coffee.png' }
  ]
};

const STORAGE_KEYS = {
  USERNAME: 'planningPokerUsername',
  VOTING_SYSTEM: 'planningPokerVotingSystem'
} as const;

@Component({
  selector: 'app-game-page',
  imports: [FormsModule, CommonModule, QRCodeComponent, IssuesTab, RouterLink],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage implements OnInit, OnDestroy {
  // State
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
  issues: Issue[] = [];
  isRevealing = false;
  countdownValue: number | null = null;
  noIssuesMessage = false;
  isAuthenticating = true;
  voteStatistics: VoteStatistic[] = [];
  votingCards: VotingCard[] = VOTING_SYSTEMS['fibonacci'];

  lang: 'en' | 'ro' | 'fr';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
    public translateService: TranslateService,
    private userService: UserService
  ) {
    this.lang = this.translateService.currentLang;
  }

  /**
   * Check if user is authenticated via Keycloak
   * This getter fixes the missing isAuthenticated property used in the template
   */
  get isAuthenticated(): boolean {
    return this.userService.isLoggedIn();
  }

  ngOnInit(): void {
    this.initializeLobbyInfo();
    this.loadUserPreferences();
    this.setupSocketSubscriptions();
    this.checkExistingSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== Initialization ====================

  private initializeLobbyInfo(): void {
    this.lobbyId = (this.route.snapshot.paramMap.get('lobbyId') ?? '').toUpperCase();
    this.gameLink = this.lobbyId
      ? `${window.location.origin}/game/${this.lobbyId}`
      : window.location.href;
  }

  private loadUserPreferences(): void {
    const savedName = localStorage.getItem(STORAGE_KEYS.USERNAME);
    if (savedName) {
      this.userName = savedName;
    }

    const votingSystem = localStorage.getItem(STORAGE_KEYS.VOTING_SYSTEM);
    if (votingSystem) {
      this.setVotingCards(votingSystem);
    }
  }

  private setupSocketSubscriptions(): void {
    // Lobby updates
    this.socketService.lobby$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lobby => {
        if (lobby) {
          this.lobby = lobby;
          this.hasJoined = true;
        }
      });

    // Socket events
    this.socketService.onUserJoined().pipe(takeUntil(this.destroy$)).subscribe();
    this.socketService.onUserLeft().pipe(takeUntil(this.destroy$)).subscribe();
    this.socketService.onVoteSubmitted().pipe(takeUntil(this.destroy$)).subscribe();
    
    this.socketService.onVotesRevealed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.selectedVote = null;
        this.calculateVoteStatistics();
      });

    this.socketService.onRoundStarted()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.selectedVote = null;
        this.voteStatistics = [];
      });

    this.socketService.onCountdownStarted()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.startCountdownAnimation());

    this.socketService.onIssueSelected()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ issue }) => {
        this.currentIssue = issue;
        this.noIssuesMessage = false;
        
        if (issue) {
          const index = this.issues.findIndex(i => i.id === issue.id);
          if (index !== -1) {
            this.issues[index] = issue;
          }
        }
      });

    this.socketService.onIssuesUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ issues }) => this.issues = issues);

    this.socketService.onLobbyClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        alert(this.translateService.translate('alert.lobbyClosed'));
        this.router.navigate(['/']);
      });

    this.socketService.onKicked()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        alert(this.translateService.translate('alert.kicked'));
        this.router.navigate(['/']);
      });
  }

  private checkExistingSession(): void {
    if (this.socketService.currentLobby?.id === this.lobbyId) {
      this.hasJoined = true;
      this.isAuthenticating = false;
      return;
    }
    this.initializeUser();
  }

  private async initializeUser(): Promise<void> {
    try {
      const authenticated = await this.userService.init();

      if (authenticated) {
        const keycloakUsername = this.userService.getUsername() || this.userService.getFullName();
        if (keycloakUsername) {
          this.userName = keycloakUsername;
          localStorage.setItem(STORAGE_KEYS.USERNAME, this.userName);
        }
      }
    } catch (err) {
      console.log('Keycloak initialization failed:', err);
    } finally {
      this.isAuthenticating = false;
      this.autoJoinIfPossible();
    }
  }

  private autoJoinIfPossible(): void {
    if (this.userName && this.lobbyId && !this.hasJoined) {
      this.joinLobby();
    }
  }

  // ==================== Voting System ====================

  setVotingCards(system: string): void {
    this.votingCards = VOTING_SYSTEMS[system] ?? VOTING_SYSTEMS['fibonacci'];
  }

  // ==================== Lobby Actions ====================

  joinLobby(): void {
    const trimmedName = this.userName.trim();
    if (!trimmedName || !this.lobbyId) return;

    localStorage.setItem(STORAGE_KEYS.USERNAME, trimmedName);

    this.socketService.joinLobby(this.lobbyId, trimmedName).subscribe({
      next: () => this.hasJoined = true,
      error: (err) => {
        alert(err.message || this.translateService.translate('alert.joinFailed'));
        this.router.navigate(['/']);
      }
    });
  }

  exitLobby(): void {
    this.socketService.disconnect();
    this.socketService.clearLobby();
    this.hasJoined = false;
    this.lobby = null;
    this.socketService.reconnect();
    this.router.navigate(['/']);
  }

  kickUser(userId: string): void {
    if (!this.lobbyId || !this.isHost()) return;

    if (confirm(this.translateService.translate('alert.confirmKick'))) {
      this.socketService.kickUser(this.lobbyId, userId);
    }
  }

  // ==================== Authentication ====================

  login(): void {
    const redirect = this.gameLink || window.location.href;
    this.userService.login(redirect).catch(err => console.error('Login failed', err));
  }

  logout(): void {
    const redirect = window.location.origin;
    this.userService.logout(redirect).catch(err => console.error('Logout failed', err));
  }

  // ==================== Voting ====================

  vote(card: VotingCard): void {
    if (!this.lobbyId || this.lobby?.votesRevealed) return;

    this.selectedVote = card.value;
    this.socketService.submitVote(this.lobbyId, card.value);
  }

  revealVotes(): void {
    if (!this.lobbyId || !this.allPlayersVoted() || !this.currentIssue) return;
    this.socketService.startCountdown(this.lobbyId);
  }

  startCountdownAnimation(): void {
    this.isRevealing = true;
    this.countdownValue = 3;

    const interval = setInterval(() => {
      if (this.countdownValue && this.countdownValue > 1) {
        this.countdownValue--;
      } else {
        clearInterval(interval);
        this.countdownValue = null;
        this.isRevealing = false;
        
        if (this.isHost()) {
          this.socketService.revealVotes(this.lobbyId);
          setTimeout(() => this.calculateAndStoreResult(), 500);
        }
      }
    }, 1000);
  }

  startNewRound(): void {
    if (!this.lobbyId) return;
    
    this.socketService.newRound(this.lobbyId);
    this.noIssuesMessage = false;

    const pendingIssues = this.issues.filter(i => i.status === 'pending');
    
    if (pendingIssues.length > 0) {
      const nextIssue = pendingIssues[0];
      nextIssue.status = 'voting';
      this.currentIssue = nextIssue;
      this.socketService.selectIssue(this.lobbyId, nextIssue);
      this.socketService.updateIssuesList(this.lobbyId, this.issues);
    } else {
      this.currentIssue = null;
      this.noIssuesMessage = true;
      this.socketService.selectIssue(this.lobbyId, null);
    }
  }

  // ==================== Statistics & Calculations ====================

  allPlayersVoted(): boolean {
    return this.lobby?.users?.length 
      ? this.lobby.users.every(user => user.vote != null)
      : false;
  }

  getVotedPlayersCount(): number {
    return this.lobby?.users?.filter(user => user.vote != null).length ?? 0;
  }

  hasAnyVotes(): boolean {
    return this.lobby?.users?.some(u => u.vote != null) ?? false;
  }

  calculateVoteStatistics(): void {
    if (!this.lobby?.users?.length) {
      this.voteStatistics = [];
      return;
    }

    const voteCounts = new Map<string, number>();
    const usersWithVotes = this.lobby.users.filter(u => u.vote != null);

    for (const user of usersWithVotes) {
      if (user.vote) {
        voteCounts.set(user.vote, (voteCounts.get(user.vote) ?? 0) + 1);
      }
    }

    const totalVotes = usersWithVotes.length || 1;

    this.voteStatistics = Array.from(voteCounts.entries())
      .map(([vote, count]) => ({
        vote,
        count,
        percentage: Math.round((count / totalVotes) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }

  calculateAndStoreResult(): void {
    if (!this.lobby || !this.currentIssue) return;

    const numericVotes = this.lobby.users
      .map(u => u.vote)
      .filter((vote): vote is string => vote != null && !isNaN(Number(vote)))
      .map(Number);

    const points = numericVotes.length > 0
      ? Math.round(numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length).toString()
      : '?';

    this.currentIssue.status = 'completed';
    this.currentIssue.points = points;

    const issueIndex = this.issues.findIndex(i => i.id === this.currentIssue!.id);
    if (issueIndex !== -1) {
      this.issues[issueIndex] = { ...this.currentIssue };
    }

    this.socketService.selectIssue(this.lobbyId, this.currentIssue);
    this.socketService.updateIssuesList(this.lobbyId, this.issues);
  }

  // ==================== UI Helpers ====================

  isHost(): boolean {
    return this.lobby?.host === this.socketService.socketId;
  }

  toggleIssuesTab(): void {
    this.showIssuesTab = !this.showIssuesTab;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.gameLink).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  setLanguage(lang: 'en' | 'ro' | 'fr'): void {
    this.lang = lang;
    this.translateService.setLanguage(lang);
  }

  // ==================== Issue Management ====================

  onIssueSelected(issue: Issue): void {
    this.currentIssue = issue;
    this.noIssuesMessage = false;

    if (issue.status === 'pending') {
      issue.status = 'voting';
      this.socketService.newRound(this.lobbyId);
    }

    this.socketService.selectIssue(this.lobbyId, issue);
    this.socketService.updateIssuesList(this.lobbyId, this.issues);
  }

  onIssueAdded(issue: Issue): void {
    this.issues.push(issue);
    this.socketService.updateIssuesList(this.lobbyId, this.issues);
  }

  onIssueDeleted(issueId: string): void {
    this.issues = this.issues.filter(i => i.id !== issueId);
    
    if (this.currentIssue?.id === issueId) {
      this.currentIssue = null;
      this.socketService.selectIssue(this.lobbyId, null);
    }
    
    this.socketService.updateIssuesList(this.lobbyId, this.issues);
  }
}