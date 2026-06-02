export class PKCEClient {
  private codeVerifier: string;
  private state: string;

  constructor() {
    this.codeVerifier = this.generateRandomString(128);
    this.state = this.generateRandomString(16);
    this.persistTransientData();
  }

  persistTransientData() {
    sessionStorage.setItem('pkce_code_verifier', this.codeVerifier);
    sessionStorage.setItem('pkce_state', this.state);
    sessionStorage.setItem('pkce_created_at', new Date().toISOString());
    sessionStorage.setItem('pkce_redirect_uri', window.location.href);
  }

  async getAuthorizationResponse(authUrl: string): Promise<{ concent: string } | null> {
    const params = await fetch(authUrl, {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => response.url)
      .then((url) => new URL(url))
      .then((urlObj) => urlObj.searchParams);
    const code = params.get('code');
    const state = params.get('state');
    return { code, state };
  }

  getCodeChallenge() {
    const codeChallenge = this.base64UrlEncode(this.sha256(this.codeVerifier));
    return codeChallenge;
  }
  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    return result;
  }
  private sha256(plain: string): Uint8Array {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest('SHA-256', data) as unknown as Uint8Array;
  }
  private base64UrlEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
