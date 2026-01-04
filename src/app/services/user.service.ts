import { Injectable } from '@angular/core';
import Keycloak, { KeycloakInitOptions } from 'keycloak-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
    private keycloak?: Keycloak;
    private initialized = false;
    private initPromise?: Promise<boolean>;

    private readonly config = {
        url: environment.authUrl,
        realm: environment.authRealm,
        clientId: environment.authClient
    };

    constructor() {
        // Start init immediately but don't block
        this.initPromise = this.init().catch((err) => {
            console.error('Keycloak init failed', err);
            return false;
        });
    }

    /**
     * Initialize Keycloak. Safe to call multiple times - returns cached promise.
     */
    init(options?: KeycloakInitOptions): Promise<boolean> {
        // Return existing promise if already initializing/initialized
        if (this.initPromise && !options) {
            return this.initPromise;
        }

        if (this.initialized && this.keycloak) {
            return Promise.resolve(this.keycloak.authenticated ?? false);
        }

        this.keycloak = new Keycloak({
            url: this.config.url,
            realm: this.config.realm,
            clientId: this.config.clientId
        });

        const initOpts: KeycloakInitOptions = {
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
            pkceMethod: 'S256',
            checkLoginIframe: false,
            ...(options || {})
        };

        this.initPromise = this.keycloak
            .init(initOpts)
            .then((authenticated) => {
                this.initialized = true;
                console.log('Keycloak initialized, authenticated:', authenticated);
                return authenticated;
            })
            .catch((err) => {
                this.initialized = false;
                console.error('Keycloak init error:', err);
                return Promise.reject(err);
            });

        return this.initPromise;
    }

    /**
     * Redirect to Keycloak login page
     */
    login(redirectUri?: string): Promise<void> {
        if (!this.keycloak) return Promise.reject('Keycloak not initialized');
        return this.keycloak.login({ redirectUri });
    }

    /**
     * Logout and optionally redirect
     */
    logout(redirectUri?: string): Promise<void> {
        if (!this.keycloak) return Promise.reject('Keycloak not initialized');
        return this.keycloak.logout({ redirectUri });
    }

    /**
     * Check if user is currently authenticated
     */
    isLoggedIn(): boolean {
        return !!(this.keycloak && this.keycloak.authenticated);
    }

    /**
     * Returns raw access token; ensures token is refreshed if close to expiry.
     */
    getToken(minValiditySeconds = 30): Promise<string> {
        if (!this.keycloak) return Promise.reject('Keycloak not initialized');

        return this.keycloak
            .updateToken(minValiditySeconds)
            .then(() => {
                if (this.keycloak?.token) return this.keycloak.token;
                return Promise.reject('No token available');
            })
            .catch((err) => {
                // fallback: if token exists return it, otherwise fail
                if (this.keycloak?.token) return this.keycloak.token;
                return Promise.reject(err);
            });
    }

    /**
     * Helper used by interceptors: returns "Bearer <token>"
     */
    getBearerToken(minValiditySeconds = 30): Promise<string> {
        return this.getToken(minValiditySeconds).then((t) => `Bearer ${t}`);
    }

    /**
     * Get username from token (preferred_username claim)
     */
    getUsername(): string | undefined {
        return (this.keycloak?.tokenParsed as Record<string, unknown>)?.['preferred_username'] as string | undefined;
    }

    /**
     * Get email from token
     */
    getEmail(): string | undefined {
        return (this.keycloak?.tokenParsed as Record<string, unknown>)?.['email'] as string | undefined;
    }

    /**
     * Get full name from token
     */
    getFullName(): string | undefined {
        const parsed = this.keycloak?.tokenParsed as Record<string, unknown>;
        if (!parsed) return undefined;
        
        const name = parsed['name'] as string | undefined;
        if (name) return name;

        // Fallback to combining given_name and family_name
        const givenName = parsed['given_name'] as string | undefined;
        const familyName = parsed['family_name'] as string | undefined;
        if (givenName || familyName) {
            return [givenName, familyName].filter(Boolean).join(' ');
        }

        return undefined;
    }

    /**
     * Get the full parsed token (all claims)
     */
    getUserProfile(): Record<string, unknown> | undefined {
        return this.keycloak?.tokenParsed as Record<string, unknown> | undefined;
    }

    /**
     * @unused - for debug only
     * Get user's roles from the token
     */
    getRoles(): string[] {
        const parsed = this.keycloak?.tokenParsed as Record<string, unknown>;
        if (!parsed) return [];

        // Realm roles
        const realmAccess = parsed['realm_access'] as { roles?: string[] } | undefined;
        const realmRoles = realmAccess?.roles || [];

        // Resource/client roles
        const resourceAccess = parsed['resource_access'] as Record<string, { roles?: string[] }> | undefined;
        const clientRoles = resourceAccess?.[this.config.clientId]?.roles || [];

        return [...realmRoles, ...clientRoles];
    }

    /**
     * @unused - for debug only
     * Check if user has a specific role
     */
    hasRole(role: string): boolean {
        return this.getRoles().includes(role);
    }
}