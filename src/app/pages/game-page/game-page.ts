import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SocketService, Lobby } from '../../services/socket.service';
import { TranslateService } from '../../services/translate.service';
import { UserService } from '../../services/user.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { IssuesTab, Issue } from '../issues-tab/issues-tab';

@Component({
  selector: 'app-game-page',
  imports: [FormsModule, CommonModule, RouterLink, QRCodeComponent, IssuesTab],
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
  isClosingSidebar = false;
  currentIssue: Issue | null = null;
  issues: Issue[] = [];
  isRevealing = false;
  countdownValue: number | null = null;
  noIssuesMessage = false;

  lang: 'en' | 'ro' | 'fr';
  isAuthenticating = true;

  get isAuthenticated(): boolean {
    return this.userService.isLoggedIn();
  }

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
  voteStatistics: { vote: string; count: number; percentage: number }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
    public translateService: TranslateService,
    private userService: UserService
  ) {
    this.lang = this.translateService.currentLang;
  }

  ngOnInit(): void {
    this.lobbyId = (this.route.snapshot.paramMap.get('lobbyId') || '').toUpperCase();
    this.gameLink = this.lobbyId
      ? `${window.location.origin}/game/${this.lobbyId}`
      : window.location.href;

    // Subscribe to language changes
    this.subscriptions.push(
      this.translateService.currentLang$.subscribe(lang => {
        this.lang = lang;
      })
    );

    // Load saved username from localStorage
    const savedName = localStorage.getItem('planningPokerUsername');
    if (savedName) {
      this.userName = savedName;
    }

    // Load voting system preference
    const votingSystem = localStorage.getItem('planningPokerVotingSystem');
    if (votingSystem) {
      this.setVotingCards(votingSystem);
    }

    // Subscribe to lobby updates
    this.subscriptions.push(
      this.socketService.lobby$.subscribe(lobby => {
        if (lobby) {
          this.lobby = lobby;
          this.hasJoined = true;

          if ((lobby as any).currentIssue !== undefined) {
            this.currentIssue = (lobby as any).currentIssue;
          }
          if ((lobby as any).issues !== undefined) {
            this.issues = (lobby as any).issues || [];
          }
        }
      })
    );

    // Subscribe to socket events
    this.subscriptions.push(
      this.socketService.onUserJoined().subscribe(),
      this.socketService.onUserLeft().subscribe(),
      this.socketService.onVoteSubmitted().subscribe(),
      this.socketService.onVotesRevealed().subscribe(() => {
        this.selectedVote = null;
        this.calculateVoteStatistics();
      }),
      this.socketService.onRoundStarted().subscribe((data) => {
        this.selectedVote = null;
        this.voteStatistics = [];
        if (data.currentIssue !== undefined) {
          this.currentIssue = data.currentIssue;
        }
        if (data.issues !== undefined) {
          this.issues = data.issues || [];
        }
      }),
      this.socketService.onCountdownStarted().subscribe(() => {
        this.startCountdownAnimation();
      }),
      this.socketService.onIssueSelected().subscribe(data => {
        this.currentIssue = data.issue;
        this.noIssuesMessage = false;

        if (data.issue) {
          const issueIndex = this.issues.findIndex(i => i.id === data.issue.id);
          if (issueIndex !== -1) {
            this.issues[issueIndex] = data.issue;
          }
        }
      }),
      this.socketService.onIssuesUpdated().subscribe(data => {
        this.issues = data.issues;
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

    if (this.socketService.currentLobby?.id === this.lobbyId) {
      this.hasJoined = true;
      this.isAuthenticating = false;
      return;
    }

    this.initializeUser();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async initializeUser(): Promise<void> {
    try {
      // Wait for Keycloak to initialize and check SSO
      const authenticated = await this.userService.init();

      if (authenticated) {
        console.log('User is authenticated via Keycloak');

        // Get username from Keycloak token
        const keycloakUsername = this.userService.getUsername() || this.userService.getFullName();

        if (keycloakUsername) {
          this.userName = keycloakUsername;
          localStorage.setItem('planningPokerUsername', this.userName);
        }
      }

      this.isAuthenticating = false;

      // Auto-join lobby if we have username and lobbyId
      if (this.userName && this.lobbyId && !this.hasJoined) {
        this.joinLobby();
      }
    } catch (err) {
      console.log('Keycloak initialization failed or user not authenticated:', err);
      this.isAuthenticating = false;

      if (this.userName && this.lobbyId && !this.hasJoined) {
        this.joinLobby();
      }
    }
  }

  setVotingCards(system: string): void {
    switch (system) {
      case 'tshirt':
        this.votingCards = [
          { value: 'XS', image: 'assets/card_xs.png' },
          { value: 'S', image: 'assets/card_s.png' },
          { value: 'M', image: 'assets/card_m.png' },
          { value: 'L', image: 'assets/card_l.png' },
          { value: 'XL', image: 'assets/card_xl.png' },
          { value: 'XXL', image: 'assets/card_xxl.png' },
          { value: '?', image: 'assets/card_question.png' },
          { value: '☕', image: 'assets/card_coffee.png' }
        ];
        break;
      case 'powers':
        this.votingCards = [
          { value: '1', image: 'assets/card_1.png' },
          { value: '2', image: 'assets/card_2.png' },
          { value: '4', image: 'assets/card_4.png' },
          { value: '8', image: 'assets/card_8.png' },
          { value: '16', image: 'assets/card_16.png' },
          { value: '32', image: 'assets/card_32.png' },
          { value: '64', image: 'assets/card_64.png' },
          { value: '?', image: 'assets/card_question.png' },
          { value: '☕', image: 'assets/card_coffee.png' }
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

  /**
   * Trigger Keycloak login - redirects to Keycloak and back
   */
  login(): void {
    const redirect = this.gameLink || window.location.href;
    this.userService.login(redirect).catch(err => console.error('Login failed', err));
  }

  /**
   * Logout from Keycloak
   */
  logout(): void {
    const redirect = window.location.origin;
    this.userService.logout(redirect).catch(err => console.error('Logout failed', err));
  }

  /**
   * Check if user is logged in via Keycloak
   */
  isLoggedIn(): boolean {
    return this.userService.isLoggedIn();
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
      const issueIndex = this.issues.findIndex(i => i.id === this.currentIssue!.id);
      if (issueIndex !== -1) {
        this.issues[issueIndex] = { ...this.currentIssue };
      }

      // Broadcast the updated issue to all players
      this.socketService.selectIssue(this.lobbyId, this.currentIssue);
      this.socketService.updateIssuesList(this.lobbyId, this.issues);
      return;
    }

    // Calculate mean and round to nearest integer
    const mean = numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length;
    const roundedMean = Math.round(mean);

    // Update the current issue
    this.currentIssue.status = 'completed';
    this.currentIssue.points = roundedMean.toString();

    // Update the issue in the issues list as well
    const issueIndex = this.issues.findIndex(i => i.id === this.currentIssue!.id);
    if (issueIndex !== -1) {
      this.issues[issueIndex] = { ...this.currentIssue };
    }

    // Broadcast the updated issue to all players
    this.socketService.selectIssue(this.lobbyId, this.currentIssue);
    this.socketService.updateIssuesList(this.lobbyId, this.issues);
  }

  startNewRound(): void {
    if (!this.lobbyId) return;

    this.noIssuesMessage = false;

    // Check if there are pending issues
    const pendingIssues = this.issues.filter(i => i.status === 'pending');

    if (pendingIssues.length > 0) {
      // Automatically select the next pending issue BEFORE starting the round
      const nextIssue = pendingIssues[0];
      nextIssue.status = 'voting';
      this.currentIssue = nextIssue;
      // Broadcast to all players FIRST
      this.socketService.selectIssue(this.lobbyId, nextIssue);
      this.socketService.updateIssuesList(this.lobbyId, this.issues);
      this.socketService.newRound(this.lobbyId);
    } else {
      this.currentIssue = null;
      this.noIssuesMessage = true;
      // Broadcast to all players
      this.socketService.selectIssue(this.lobbyId, null);
      this.socketService.newRound(this.lobbyId);
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

  setLanguage(lang: 'en' | 'ro' | 'fr'): void {
    this.lang = lang;
    this.translateService.setLanguage(lang);
  }

  exitLobby(): void {
    this.socketService.disconnect();
    this.socketService.clearLobby();
    this.hasJoined = false;
    this.lobby = null;
    this.socketService.reconnect();
    this.router.navigate(['/']);
  }

  goToAccount(): void {
    this.router.navigate(['/account']);
  }

  calculateVoteStatistics(): void {
    if (!this.lobby || this.lobby.users.length === 0) {
      this.voteStatistics = [];
      return;
    }

    const voteCounts: { [key: string]: number } = {};
    const usersWithVotes = this.lobby.users.filter(u => u.vote !== null);

    usersWithVotes.forEach(user => {
      if (user.vote) {
        voteCounts[user.vote] = (voteCounts[user.vote] || 0) + 1;
      }
    });

    const totalVotes = usersWithVotes.length || 1;

    this.voteStatistics = Object.entries(voteCounts)
      .map(([vote, count]) => ({
        vote,
        count,
        percentage: Math.round((count / totalVotes) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }

  toggleIssuesTab(): void {
    if (this.showIssuesTab) {
      // Start closing animation
      this.isClosingSidebar = true;
      // Wait for animation to complete before hiding
      setTimeout(() => {
        this.showIssuesTab = false;
        this.isClosingSidebar = false;
      }, 300); // Match animation duration
    } else {
      this.showIssuesTab = true;
    }
  }

  onIssueSelected(issue: Issue): void {
    this.currentIssue = issue;
    this.noIssuesMessage = false;
    // Update issue status to voting
    if (issue.status === 'pending') {
      issue.status = 'voting';
    }
    // Broadcast the selected issue to all players FIRST
    this.socketService.selectIssue(this.lobbyId, issue);
    // Broadcast updated issues list
    this.socketService.updateIssuesList(this.lobbyId, this.issues);
    // Start a new round after issue is set
    this.socketService.newRound(this.lobbyId);
  }

  onIssueAdded(issue: Issue): void {
    this.issues.push(issue);
    console.log('Issue added:', issue.title);
    // Broadcast updated issues list
    this.socketService.updateIssuesList(this.lobbyId, this.issues);
  }

  onIssueDeleted(issueId: string): void {
    this.issues = this.issues.filter(i => i.id !== issueId);
    if (this.currentIssue?.id === issueId) {
      this.currentIssue = null;
      this.socketService.selectIssue(this.lobbyId, null);
    }
    // Broadcast updated issues list
    this.socketService.updateIssuesList(this.lobbyId, this.issues);
  }

  /**
   * Check if second ring is active (more than 10 players)
   */
  hasSecondRing(): boolean {
    return (this.lobby?.users?.length || 0) > 10;
  }

  /**
   * Calculate dynamic position for a player around the table
   * Uses an elliptical distribution with multiple rings when needed
   * Responsive to screen size
   */
  getPlayerPosition(index: number, totalPlayers: number): { left: string; top: string; transform: string } {
    // Detect screen size for responsive table dimensions
    const isMobile = window.innerWidth <= 480;
    const isTablet = window.innerWidth <= 768 && !isMobile;

    // Table dimensions (ellipse) - responsive
    let tableWidth = 480;
    let tableHeight = 240;

    if (isMobile) {
      tableWidth = Math.min(300, window.innerWidth - 40);
      tableHeight = 150;
    } else if (isTablet) {
      tableWidth = Math.min(360, window.innerWidth - 80);
      tableHeight = 180;
    }

    const centerX = tableWidth / 2;
    const centerY = tableHeight / 2;

    // First ring can hold up to 10 players comfortably around the ellipse
    const firstRingCapacity = 10;

    let ring = 0;
    let positionInRing = index;
    let playersInCurrentRing = totalPlayers;

    // Determine which ring this player belongs to
    if (totalPlayers > firstRingCapacity) {
      if (index < firstRingCapacity) {
        ring = 0;
        positionInRing = index;
        playersInCurrentRing = firstRingCapacity;
      } else {
        ring = 1;
        positionInRing = index - firstRingCapacity;
        playersInCurrentRing = totalPlayers - firstRingCapacity;
      }
    }

    // Calculate angle for even distribution
    const angleStep = (2 * Math.PI) / playersInCurrentRing;
    const angle = angleStep * positionInRing - Math.PI / 2;

    // Ellipse radii with offset for players to be around (not on) the table
    const baseRadiusX = tableWidth / 2;
    const baseRadiusY = tableHeight / 2;

    // Offset distance from table edge (player distance from table) - responsive
    let ringOffset = ring === 0 ? 80 : 140;

    if (isMobile) {
      ringOffset = ring === 0 ? 55 : 100;
    } else if (isTablet) {
      ringOffset = ring === 0 ? 60 : 110;
    }

    const radiusX = baseRadiusX + ringOffset;
    const radiusY = baseRadiusY + ringOffset;

    // Calculate position on ellipse
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);

    return {
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%)'
    };
  }
}

