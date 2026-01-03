import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface Translations {
    [key: string]: {
        en: string;
        ro: string;
        fr: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class TranslateService {
    private supportedLangs: Array<'en' | 'ro' | 'fr'> = ['en', 'ro', 'fr'];
    public readonly languageOptions = [
        { code: 'en' as const, label: 'English' },
        { code: 'ro' as const, label: 'Română' },
        { code: 'fr' as const, label: 'Français' },
    ];
    private currentLangSubject = new BehaviorSubject<'en' | 'ro' | 'fr'>('en');
    public currentLang$ = this.currentLangSubject.asObservable();

    private translations: Translations = {
        'header.invitePlayers': {
            en: '👥 Invite players',
            ro: '👥 Invită jucători',
            fr: '👥 Inviter des joueurs'
        },
        'header.language': {
            en: 'RO',
            ro: 'FR',
            fr: 'EN'
        },

        'home.title': {
            en: 'Planning Poker',
            ro: 'Planning Poker',
            fr: 'Planning Poker'
        },
        'home.startNewGame': {
            en: 'Start New Game',
            ro: 'Începe joc nou',
            fr: 'Commencer une nouvelle partie'
        },
        'home.orJoinWithCode': {
            en: 'Or join with code:',
            ro: 'Sau intră cu codul:',
            fr: 'Ou rejoins avec un code :'
        },
        'home.gameCode': {
            en: 'Game code',
            ro: 'Cod joc',
            fr: 'Code de partie'
        },
        'home.join': {
            en: 'Join',
            ro: 'Intră',
            fr: 'Rejoindre'
        },

        'newGame.createGame': {
            en: 'Create Game',
            ro: 'Crează joc',
            fr: 'Créer une partie'
        },
        'newGame.gameName': {
            en: "Game's name",
            ro: 'Numele jocului',
            fr: 'Nom de la partie'
        },
        'newGame.enterGameName': {
            en: 'Enter game name',
            ro: 'Introdu numele jocului',
            fr: 'Saisis le nom de la partie'
        },
        'newGame.yourName': {
            en: 'Your name',
            ro: 'Numele tău',
            fr: 'Ton nom'
        },
        'newGame.enterYourName': {
            en: 'Enter your name',
            ro: 'Introdu numele tău',
            fr: 'Saisis ton nom'
        },
        'newGame.votingSystem': {
            en: 'Voting system',
            ro: 'Sistem de votare',
            fr: 'Système de vote'
        },
        'newGame.fibonacci': {
            en: 'Fibonacci ( 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕ )',
            ro: 'Fibonacci ( 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕ )',
            fr: 'Fibonacci ( 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕ )'
        },
        'newGame.tshirt': {
            en: 'T-Shirt ( XS, S, M, L, XL, XXL, ?, ☕ )',
            ro: 'T-Shirt ( XS, S, M, L, XL, XXL, ?, ☕ )',
            fr: 'T-Shirt ( XS, S, M, L, XL, XXL, ?, ☕ )'
        },
        'newGame.powers': {
            en: 'Powers of 2 ( 1, 2, 4, 8, 16, 32, 64, ?, ☕ )',
            ro: 'Puteri ale lui 2 ( 1, 2, 4, 8, 16, 32, 64, ?, ☕ )',
            fr: 'Puissances de 2 ( 1, 2, 4, 8, 16, 32, 64, ?, ☕ )'
        },
        'newGame.createButton': {
            en: 'Create game',
            ro: 'Crează joc',
            fr: 'Créer la partie'
        },

        'join.title': {
            en: 'Join the game',
            ro: 'Intră în joc',
            fr: 'Rejoindre la partie'
        },
        'join.yourName': {
            en: 'Your name',
            ro: 'Numele tău',
            fr: 'Ton nom'
        },
        'join.enterName': {
            en: 'Enter your name',
            ro: 'Introdu numele tău',
            fr: 'Saisis ton nom'
        },
        'join.button': {
            en: 'Join Game',
            ro: 'Intră în joc',
            fr: 'Rejoindre la partie'
        },

        'game.lonelyMessage': {
            en: 'Feeling lonely? 😴',
            ro: 'Te simți singur? 😴',
            fr: 'Tu te sens seul ? 😴'
        },
        'game.invitePlayers': {
            en: 'Invite players',
            ro: 'Invită jucători',
            fr: 'Inviter des joueurs'
        },
        'game.revealCards': {
            en: 'Reveal cards',
            ro: 'Dezvăluie cărțile',
            fr: 'Révéler les cartes'
        },
        'game.startNewRound': {
            en: 'Start new round',
            ro: 'Începe rundă nouă',
            fr: 'Commencer une nouvelle manche'
        },
        'game.chooseCard': {
            en: 'Choose your card 👇',
            ro: 'Alege cardul tău 👇',
            fr: 'Choisis ta carte 👇'
        },
        'game.kickPlayer': {
            en: 'Kick player',
            ro: 'Elimină jucătorul',
            fr: 'Exclure le joueur'
        },

        'invite.title': {
            en: 'Invite players',
            ro: 'Invită jucători',
            fr: 'Inviter des joueurs'
        },
        'invite.shareLink': {
            en: 'Share this link with your team:',
            ro: 'Distribuie acest link echipei tale:',
            fr: 'Partage ce lien avec ton équipe :'
        },
        'invite.copy': {
            en: '📋 Copy',
            ro: '📋 Copiază',
            fr: '📋 Copier'
        },
        'invite.copied': {
            en: '✓ Copied!',
            ro: '✓ Copiat!',
            fr: '✓ Copié !'
        },
        'invite.close': {
            en: 'Close',
            ro: 'Închide',
            fr: 'Fermer'
        },

        'alert.lobbyClosed': {
            en: 'The game has been closed by the host',
            ro: 'Jocul a fost închis de către gazdă',
            fr: 'La partie a été fermée par l’hôte'
        },
        'alert.kicked': {
            en: 'You have been kicked from the game by the host',
            ro: 'Ai fost eliminat din joc de către gazdă',
            fr: 'Tu as été exclu de la partie par l’hôte'
        },
        'alert.confirmKick': {
            en: 'Are you sure you want to kick this player?',
            ro: 'Ești sigur că vrei să elimini acest jucător?',
            fr: 'Es-tu sûr de vouloir exclure ce joueur ?'
        },
        'alert.joinFailed': {
            en: 'Failed to join lobby',
            ro: 'Intrarea în lobby a eșuat',
            fr: 'Échec de connexion au lobby'
        }
    };

    constructor() {
        const savedLang = localStorage.getItem('planningPokerLanguage');
        if (savedLang && this.supportedLangs.includes(savedLang as any)) {
            this.currentLangSubject.next(savedLang as 'en' | 'ro' | 'fr');
        }
    }

    get currentLang(): 'en' | 'ro' | 'fr' {
        return this.currentLangSubject.value;
    }

    translate(key: string): string {
        const translation = this.translations[key];
        if (!translation) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
        return translation[this.currentLang] ?? translation.en;
    }

    get languages(): Array<'en' | 'ro' | 'fr'> {
        return this.supportedLangs;
    }

    toggleLanguage(): void {
        const currentIndex = this.supportedLangs.indexOf(this.currentLang);
        const nextLang = this.supportedLangs[(currentIndex + 1) % this.supportedLangs.length];
        this.currentLangSubject.next(nextLang);
        localStorage.setItem('planningPokerLanguage', nextLang);
    }

    setLanguage(lang: 'en' | 'ro' | 'fr'): void {
        if (!this.supportedLangs.includes(lang)) return;
        this.currentLangSubject.next(lang);
        localStorage.setItem('planningPokerLanguage', lang);
    }
}
