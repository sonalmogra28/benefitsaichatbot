# Technical Debt Priority Matrix

## Urgent & Important (DO FIRST)
These block everything else or pose immediate risk

| Debt ID | Issue | Impact | Effort | Action |
|---------|-------|---------|---------|---------|
| DEBT-018 | No staging environment | Breaking prod daily | 4-6h | Create staging TODAY |
| DEBT-017 | Unknown what's broken | Can't prioritize fixes | 8-12h | Audit everything on staging |
| DEBT-001/014 | Auth broken | Users can't sign in | 8-12h | Fix Stack Auth handler properly |
| DEBT-002 | No RLS | Data leak risk | 6-8h | Add basic policies this week |

## Important but Not Urgent (DO NEXT)
Critical for stability but not blocking immediate use

| Debt ID | Issue | Impact | Effort | Action |
|---------|-------|---------|---------|---------|
| DEBT-003 | No error boundaries | White screens | 4-6h | Add global error handling |
| DEBT-005 | No CI/CD | Bad code deployed | 3-4h | Add pre-commit hooks |
| DEBT-007 | No middleware protection | Security risk | 3-4h | Restore auth checks |
| DEBT-004 | Incomplete multi-tenant | Data isolation issues | 8-10h | Finish implementation |

## Nice to Have (DO LATER)
Improves quality but system works without

| Debt ID | Issue | Impact | Effort | Action |
|---------|-------|---------|---------|---------|
| DEBT-015 | PPR disabled | Slower performance | 8-12h | Re-enable strategically |
| DEBT-009 | TypeScript 'any' | Type safety | 4-6h | Fix incrementally |
| DEBT-010 | Console logs | Info leakage | 2-3h | Add proper logging |
| DEBT-008 | Untested documents | Unknown if works | 4-6h | Test thoroughly |

## Low Priority (WHEN TIME ALLOWS)
Minor improvements

| Debt ID | Issue | Impact | Effort | Action |
|---------|-------|---------|---------|---------|
| DEBT-011 | Missing loading states | UX polish | 3-4h | Add skeletons |
| DEBT-013 | Inconsistent errors | UX polish | 2-3h | Standardize messages |
| DEBT-012 | No tests | Future bugs | 20-30h | Build test suite |
| DEBT-006 | Env var chaos | Dev confusion | 2-3h | Document clearly |

---

## Week-by-Week Focus

### Week 1: STOP THE BLEEDING
- Create staging (DEBT-018) ✓
- Audit what's broken (DEBT-017) ✓
- Fix authentication (DEBT-001/014) ✓
- Add basic RLS (DEBT-002) ✓

**Success Metric**: Users can sign in and use basic features safely

### Week 2: SECURITY & STABILITY  
- Error boundaries (DEBT-003)
- CI/CD pipeline (DEBT-005)
- Middleware protection (DEBT-007)
- Environment cleanup (DEBT-006)

**Success Metric**: No crashes, no security holes

### Week 3: FEATURE COMPLETION
- Multi-tenant fixes (DEBT-004)
- Document processing (DEBT-008)
- TypeScript cleanup (DEBT-009)
- Logging system (DEBT-010)

**Success Metric**: All features working properly

### Week 4+: OPTIMIZATION
- Re-enable PPR (DEBT-015)
- Loading states (DEBT-011)
- Error messages (DEBT-013)
- Test suite (DEBT-012)

**Success Metric**: Fast, polished, tested

---

## Decision Framework

When deciding what to work on next, ask:

1. **Is production broken?** → Fix immediately
2. **Is there a security risk?** → Fix within 24h
3. **Are users blocked?** → Fix within 48h
4. **Does it prevent other work?** → Fix this week
5. **Is it just polish?** → Add to backlog

---

## Resource Allocation

If you have multiple developers:

**Developer 1 (Senior)**: Critical path
- Staging setup
- Auth fixes
- RLS implementation

**Developer 2**: Safety nets
- CI/CD setup
- Error handling
- Testing

**Developer 3**: Cleanup
- Remove dead code
- Fix TypeScript
- Documentation

---

## Risk Management

**Highest Risks**:
1. 🔴 Data leak (no RLS) - Fix within 48h
2. 🔴 Auth broken - Fix within 72h
3. 🟡 No staging - Fix TODAY
4. 🟡 No error handling - Fix this week

**Mitigation**: Focus on these four items before anything else

---

## Quick Wins (Under 2 hours each)

For morale and momentum:
1. Add staging branch (30 min)
2. Remove console.logs (1 hour)
3. Add .env.example (30 min)
4. Fix obvious TypeScript errors (1 hour)
5. Add basic error page (1 hour)

---

## The 80/20 Rule

**20% of fixes = 80% of stability**:
1. Staging environment (prevents future breaks)
2. Fix auth (unblocks everything)
3. Add RLS (secures data)
4. Error boundaries (prevents crashes)

Focus here first!