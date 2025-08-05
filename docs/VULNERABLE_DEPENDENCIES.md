# Vulnerable Dependencies Report

**Generated:** 2025-08-05  
**Total Vulnerabilities:** 6 (0 critical, 0 high, 2 moderate, 4 low)

## Moderate Severity Vulnerabilities

### 1. undici
- **Severity:** Moderate
- **Affected Package:** `undici` (via `@vercel/blob`)
- **Current Version:** < 5.29.0
- **Fixed Version:** 5.29.0
- **Path:** `.>@vercel/blob>undici`
- **Action Required:** Update @vercel/blob to latest version

### 2. esbuild
- **Severity:** Moderate
- **CVE:** GHSA-67mh-4wv8-2f99
- **Affected Versions:** 0.18.20, 0.19.12
- **Issue:** CORS misconfiguration allows any website to read development server responses
- **Impact:** Source code exposure during development, including source maps
- **Paths:**
  - `drizzle-kit@0.25.0 > esbuild@0.19.12`
  - `drizzle-kit@0.25.0 > @esbuild-kit/esm-loader@2.6.5 > @esbuild-kit/core-utils@3.3.2 > esbuild@0.18.20`
- **Action Required:** Review esbuild configuration or update drizzle-kit

## Low Severity Vulnerabilities

### 3. cookie
- **Severity:** Low
- **Affected Package:** `cookie` (via `@stackframe/stack`)
- **Path:** `.>@stackframe/stack>cookie`
- **Action Required:** Review security advisory and update @stackframe/stack

### 4. brace-expansion
- **Severity:** Low
- **CVE:** CVE-2025-5889
- **Issue:** Regular Expression Denial of Service (ReDoS) vulnerability
- **Current Version:** 1.1.11, 2.0.1
- **Fixed Version:** 1.1.12, 2.0.2
- **Multiple Paths:** Affects eslint and tailwindcss dependencies
- **Action Required:** Update to version 2.0.2

## Outdated Major Versions

These packages have major version updates available that may include security improvements:

### Production Dependencies
1. **React & React-DOM**
   - Current: 19.0.0-rc-45804af1-20241021 (Release Candidate)
   - Latest Stable: 19.1.1
   - **Risk:** Using RC version in production

2. **TailwindCSS**
   - Current: 3.4.17
   - Latest: 4.1.11
   - **Note:** Major version upgrade, review breaking changes

3. **Zod**
   - Current: 3.25.68
   - Latest: 4.0.14
   - **Note:** Major version upgrade, API changes expected

4. **AI SDK Packages**
   - @ai-sdk/openai: 2.0.0-beta.5 → 2.0.2
   - @ai-sdk/provider: 2.0.0-beta.1 → 2.0.0
   - @ai-sdk/react: 2.0.0-beta.6 → 2.0.2
   - **Risk:** Beta versions in production

### Development Dependencies
1. **@biomejs/biome**
   - Current: 1.9.4
   - Latest: 2.1.3
   - **Note:** Major version upgrade for linting/formatting

2. **ESLint**
   - Current: 8.57.0
   - Latest: 9.x available
   - **Note:** Major changes in v9, review migration guide

## Security Recommendations by Priority

### Immediate Actions (P0)
1. Update `@vercel/blob` to fix undici vulnerability
2. Update `brace-expansion` to 2.0.2 across all dependencies
3. Review and mitigate esbuild CORS issue for development

### Short Term (P1)
1. Migrate from React 19 RC to stable version
2. Update @stackframe/stack to resolve cookie vulnerability
3. Update all AI SDK packages from beta to stable versions

### Medium Term (P2)
1. Plan TailwindCSS v4 migration
2. Evaluate Zod v4 upgrade impact
3. Update development tooling (Biome, ESLint)

## Dependency Update Commands

```bash
# Update vulnerable packages
pnpm update @vercel/blob@latest
pnpm update @stackframe/stack@latest

# Update AI SDK packages to stable
pnpm update @ai-sdk/openai@latest @ai-sdk/provider@latest @ai-sdk/react@latest

# Update React to stable
pnpm update react@latest react-dom@latest

# For major version updates, use:
pnpm add tailwindcss@4 zod@4 @biomejs/biome@2
```

## Notes

- The esbuild vulnerability only affects development environments
- Consider using `pnpm audit fix` for automated fixes where possible
- Test thoroughly after updates, especially for major version changes
- Monitor Stack Auth SDK updates for compatibility with Next.js 15