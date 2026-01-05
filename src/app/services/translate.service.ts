import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

interface TranslationData {
    [key: string]: any;
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
    
    private translations: { [lang: string]: TranslationData } = {};
    private isLoaded = false;

    constructor(private http: HttpClient) {
        const savedLang = localStorage.getItem('planningPokerLanguage');
        if (savedLang && this.supportedLangs.includes(savedLang as any)) {
            this.currentLangSubject.next(savedLang as 'en' | 'ro' | 'fr');
        }
        this.loadTranslations();
    }

    private async loadTranslations(): Promise<void> {
        console.log('Starting to load translations...');
        try {
            const [en, ro, fr] = await Promise.all([
                this.http.get<TranslationData>('/assets/i18n/en.json').toPromise(),
                this.http.get<TranslationData>('/assets/i18n/ro.json').toPromise(),
                this.http.get<TranslationData>('/assets/i18n/fr.json').toPromise()
            ]);
            
            console.log('Translations loaded:', { en: !!en, ro: !!ro, fr: !!fr });
            console.log('Sample EN keys:', en ? Object.keys(en) : 'null');
            
            this.translations = {
                en: en || {},
                ro: ro || {},
                fr: fr || {}
            };
            this.isLoaded = true;
            console.log('Translations ready, triggering UI update');
            // Trigger a language change to force UI update
            this.currentLangSubject.next(this.currentLangSubject.value);
        } catch (error) {
            console.error('Failed to load translations:', error);
            this.isLoaded = true; // Set to true to prevent infinite loading
        }
    }

    get currentLang(): 'en' | 'ro' | 'fr' {
        return this.currentLangSubject.value;
    }

    translate(key: string): string {
        if (!this.isLoaded) {
            console.log('Translations not loaded yet for key:', key);
            return key;
        }

        if (!this.translations || Object.keys(this.translations).length === 0) {
            console.error('Translations object is empty');
            return key;
        }

        const keys = key.split('.');
        let value: any = this.translations[this.currentLang];
        
        if (!value) {
            console.error(`No translations found for language: ${this.currentLang}`);
            return key;
        }
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to English
                console.log(`Key "${k}" not found in ${this.currentLang}, trying English fallback`);
                value = this.translations['en'];
                for (const k2 of keys) {
                    if (value && typeof value === 'object' && k2 in value) {
                        value = value[k2];
                    } else {
                        console.warn(`Translation key not found: ${key}`);
                        return key;
                    }
                }
                break;
            }
        }
        
        return typeof value === 'string' ? value : key;
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
