# Contributing to ClipSentinel

## Getting Started
1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

## What we need help with
- Security testing & penetration testing
- New site selector rules (upload button detection)
- Firefox / Edge 
- Policy engine (BLOCK / WARN / LOG / ALLOW)
- ML-based risk scoring

## Reporting Security Issues
Do NOT open a public issue for security vulnerabilities.  
Contact directly via LinkedIn or email.

## Code Style
- Vanilla JS, no frameworks
- Comments in English
- Test before PR
```

---

### 5. Branch Protection
`Settings → Branches → Add rule`
```
Branch name pattern: main

✅ Require a pull request before merging

✅ Require approvals: 1

✅ Dismiss stale pull request approvals

✅ Require conversation resolution before merging

```
