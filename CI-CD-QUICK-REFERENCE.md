# 🚀 CI/CD Quick Reference

> One-page cheat sheet for the AI-powered CI/CD pipeline

## 🎯 Quick Commands

### Trigger Workflows

```bash
# Trigger CI manually
gh workflow run ci.yml

# Deploy to staging
gh workflow run deploy.yml -f environment=staging

# Deploy to production
gh workflow run deploy.yml -f environment=production

# Generate tests
gh workflow run ai-test-generation.yml -f ai_provider=gemini

# Self-heal after failure
gh workflow run self-healing.yml -f fix_type=auto-fix-all

# Create release
gh workflow run release.yml -f version=1.2.3 -f release_type=minor
```

### Helper Scripts

```bash
# Claude Code
./scripts/ci/claude-code-helper.sh review src/app/app.ts
./scripts/ci/claude-code-helper.sh generate-tests src/services/chat.service.ts

# Gemini
./scripts/ci/gemini-helper.sh review src/app/app.ts
./scripts/ci/gemini-helper.sh generate-tests src/services/chat.service.ts
./scripts/ci/gemini-helper.sh analyze-diff pr_diff.txt
```

## 🔧 Setup Checklist

### Basic (No AI Required)
- [x] CI/CD workflows in `.github/workflows/`
- [x] Push to any branch triggers CI
- [x] PRs trigger code review
- [x] Tests run automatically

### AI-Enhanced (Optional)
- [ ] Add `ANTHROPIC_API_KEY` secret (Claude)
- [ ] Add `GEMINI_API_KEY` secret (Gemini)
- [ ] Test helper scripts locally
- [ ] Review first AI-generated feedback

## 📋 Workflows Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push, PR | Run tests, build, scan |
| `ai-code-review.yml` | PR | AI code review |
| `ai-test-generation.yml` | Manual, Weekly | Generate tests |
| `self-healing.yml` | CI failure | Auto-fix issues |
| `release.yml` | Tag, Manual | Create releases |
| `deploy.yml` | Main push, Manual | Deploy apps |

## 🤖 AI Providers

| Provider | API Key Secret | Best For | Cost |
|----------|---------------|----------|------|
| **Claude** | `ANTHROPIC_API_KEY` | Code review, analysis | Pay per use |
| **Gemini** | `GEMINI_API_KEY` | Fast responses | Free tier |
| **Copilot** | `GITHUB_TOKEN` (auto) | Inline suggestions | Subscription |

## 🎨 Common Workflows

### 1. Feature Development
```bash
git checkout -b feature/my-feature
# ... make changes ...
git commit -m "✨ Add feature"
git push
gh pr create
# → CI runs, AI reviews your code
```

### 2. Fix Failing CI
```bash
gh workflow run self-healing.yml -f fix_type=auto-fix-all
# → AI attempts to fix issues
# → Review and merge fixes
```

### 3. Release
```bash
git tag v1.2.3
git push origin v1.2.3
# → Release workflow creates GitHub release
# → AI generates release notes
# → Optionally deploys
```

## 🔐 Required Secrets

Add in **Settings** → **Secrets and variables** → **Actions**:

```bash
# For Claude Code (Optional)
ANTHROPIC_API_KEY=sk-ant-api03-...

# For Gemini (Optional)
GEMINI_API_KEY=AIzaSy...

# Auto-provided by GitHub
GITHUB_TOKEN=auto-generated
```

## 🐛 Quick Troubleshooting

### Issue: CI not running
**Fix:** Check Actions enabled in Settings → Actions

### Issue: AI features don't work
**Fix:** Verify API keys in repository secrets

### Issue: Self-healing doesn't commit
**Fix:** Check branch protection rules

### Issue: Tests failing
**Fix:** Run locally first: `npm test`

## 📊 Status Badges

Add to your README:

```markdown
![CI](https://github.com/YOUR_ORG/YOUR_REPO/workflows/🤖%20AI-Powered%20CI%2FCD%20Pipeline/badge.svg)
![Tests](https://img.shields.io/badge/tests-passing-green)
![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)
```

## 🎯 Goals & Metrics

Track these:
- ⏱️ Build time: < 5 min
- ✅ Pass rate: > 90%
- 🧪 Coverage: > 80%
- 🚀 Deploy frequency: Daily
- 🔧 Auto-fix rate: > 50%

## 🔗 Links

- **Full Setup Guide**: [CI-CD-SETUP.md](./CI-CD-SETUP.md)
- **GitHub Actions**: https://github.com/YOUR_REPO/actions
- **Claude Docs**: https://docs.anthropic.com/
- **Gemini Docs**: https://ai.google.dev/docs

## 💡 Pro Tips

1. **Start Simple**: Enable basic CI first
2. **Add AI Gradually**: One feature at a time
3. **Monitor Costs**: Use free tiers initially
4. **Review AI Output**: Don't blindly accept
5. **Iterate**: Improve prompts over time

## 🎉 Quick Wins

```bash
# 1. Enable CI (already done!)
git push

# 2. Get AI code review
gh pr create

# 3. Auto-fix linting
gh workflow run self-healing.yml -f fix_type=fix-linting

# 4. Generate missing tests
gh workflow run ai-test-generation.yml

# 5. Create release with AI notes
gh workflow run release.yml -f version=1.0.0 -f ai_release_notes=true
```

---

**Need more help?** Check [CI-CD-SETUP.md](./CI-CD-SETUP.md) for detailed documentation! 📚
