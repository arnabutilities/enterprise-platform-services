const {
  generateCodeVerifier,
  generateCodeChallenge,
  validateCodeChallenge,
} = require('@enterprise-platform/security');

describe('PKCE helpers (@enterprise-platform/security)', () => {
  it('generates a secure code verifier and challenge', () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);

    expect(typeof verifier).toBe('string');
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(typeof challenge).toBe('string');
    expect(challenge).not.toContain('+');
    expect(challenge).not.toContain('/');
    expect(validateCodeChallenge(verifier, challenge)).toBe(true);
  });

  it('rejects invalid verifier values', () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    expect(validateCodeChallenge(`${verifier}x`, challenge)).toBe(false);
  });
});
