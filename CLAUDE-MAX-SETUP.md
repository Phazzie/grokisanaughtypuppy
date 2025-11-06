# 🎯 Setup Guide: Claude Max + Free Gemini (Best Value)

This guide shows you how to use **YOUR Claude Max subscription** with the unconventional CI/CD workflows, plus free Gemini for high-volume tasks.

**Total Cost**: $0 (you already have Claude Max, Gemini is free!)

---

## 📋 What You Need

✅ Claude Max subscription (you have this!)
✅ Free Google Gemini API key (takes 2 minutes to get)
✅ GitHub repository access

---

## 🔧 Step-by-Step Setup

### Step 1: Setup Claude Max OAuth Token

Claude Max now supports GitHub Actions via OAuth tokens!

#### 1a. Generate OAuth Token

```bash
# In your terminal where Claude Code is installed:
claude setup-token
```

This will output something like:
```
Generated OAuth token: ct_abc123...xyz789
Copy this token and add it as CLAUDE_CODE_OAUTH_TOKEN in your repository secrets.
```

**Copy that token!** You'll need it in the next step.

#### 1b. Add to GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `CLAUDE_CODE_OAUTH_TOKEN`
5. Value: Paste the token from Step 1a
6. Click **Add secret**

✅ Claude Max is now ready for CI/CD!

---

### Step 2: Setup Free Gemini API

#### 2a. Get Free API Key

1. Go to https://aistudio.google.com/apikey
2. Click **Create API key**
3. Copy the key (starts with `AI...`)

**Gemini is completely FREE** with generous quotas:
- 15 requests per minute
- 1,500 requests per day
- More than enough for all workflows!

#### 2b. Add to GitHub Secrets

1. Go to your repository → **Settings** → **Secrets** → **Actions**
2. Click **New repository secret**
3. Name: `GEMINI_API_KEY`
4. Value: Paste your Gemini API key
5. Click **Add secret**

✅ Gemini is now ready!

---

## 🎭 Which AI Does What?

The workflows are configured for optimal value:

| Workflow | AI Used | Why | Cost |
|----------|---------|-----|------|
| **AI Council** | Claude Max | High-quality code review | $0 |
| **Autonomous Improvement** | Claude Max | Writes code, quality critical | $0 |
| **Adversarial Testing** | Claude Max | Security critical | $0 |
| **Predictive CI** | Gemini | High volume, analysis only | $0 |
| **AI Archaeology** | Gemini | Historical analysis | $0 |

**Total: $0/month** 🎉

---

## 🧪 Test Your Setup

### Test 1: Check Secrets Are Set

```bash
# Go to your repo → Settings → Secrets → Actions
# You should see:
✅ CLAUDE_CODE_OAUTH_TOKEN
✅ GEMINI_API_KEY
```

### Test 2: Run a Workflow Manually

1. Go to **Actions** tab in your repo
2. Select **AI Council** workflow
3. Click **Run workflow**
4. Select your branch
5. Click **Run workflow**

Wait a few seconds and watch it run!

### Test 3: Create a Test PR

```bash
# Create a test branch
git checkout -b test-ai-council

# Make a small change
echo "// Test comment" >> backend/server.js

# Commit and push
git add .
git commit -m "Test: AI Council review"
git push -u origin test-ai-council

# Create PR on GitHub
# AI Council should automatically review it!
```

---

## 🔍 Verify Authentication Is Working

### For Claude Max (OAuth)

Check workflow logs for:
```
✅ Using Claude Code OAuth token authentication
🎭 Claude Deep Analysis
✅ Successfully authenticated with Claude Max
```

If you see errors like:
```
❌ Invalid OAuth token
❌ Expired token
```

Solution: Regenerate token with `claude setup-token` and update secret.

### For Gemini

Check workflow logs for:
```
✅ Using Gemini API key
💎 Gemini Deep Analysis
✅ Successfully authenticated with Gemini
```

If you see errors like:
```
❌ Invalid API key
❌ Rate limit exceeded
```

Solution:
- Check API key is correct in secrets
- Wait a minute if rate-limited (free tier: 15 RPM)

---

## 🎛️ Advanced: Customize Which AI for Which Task

You can change which AI handles each workflow by editing the workflow files.

### Switch Predictive CI from Gemini to Claude Max

```yaml
# .github/workflows/predictive-ci.yml
# Change line 68-70 from:
- uses: google-github-actions/run-gemini-cli@v1
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}

# To:
- uses: anthropics/claude-code-action@v1
  with:
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

### Switch AI Council from Claude to Gemini

```yaml
# .github/workflows/ai-council-debate.yml
# Find Claude steps (lines 41-45 and 198-202)
# Change to Gemini action:
- uses: google-github-actions/run-gemini-cli@v1
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
```

---

## 💰 Cost Comparison

### Current Setup (Claude Max + Gemini)

| Component | Monthly Calls | Cost |
|-----------|---------------|------|
| Claude Max (3 workflows) | ~150 | $0 |
| Gemini (2 workflows) | ~122 | $0 |
| **Total** | **272** | **$0** |

### If You Had Anthropic API Instead

| Component | Monthly Calls | Cost |
|-----------|---------------|------|
| Claude API | ~272 | ~$3.00 |

**You save $3/month by using Claude Max OAuth!**

---

## 🔒 Security Notes

### OAuth Token Safety

✅ **Safe practices**:
- OAuth tokens are scoped to your account only
- Tokens can be revoked anytime via Claude Code CLI
- Tokens are stored securely in GitHub Secrets (encrypted)

⚠️ **Important**:
- Don't share your OAuth token
- Don't commit tokens to code
- Regenerate if compromised: `claude setup-token --force`

### API Key Safety

✅ **Safe practices**:
- API keys stored in GitHub Secrets (encrypted)
- Keys only accessible during workflow runs
- Can be rotated anytime in Google AI Studio

⚠️ **Important**:
- Don't share your Gemini API key
- Don't commit keys to code
- Monitor usage in Google AI Studio

---

## 🆘 Troubleshooting

### Problem: "OAuth token not found"

**Symptoms**: Workflow skipped, logs show "if: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN != '' }}" evaluated to false

**Solution**:
1. Check secret name is exactly `CLAUDE_CODE_OAUTH_TOKEN` (case-sensitive)
2. Regenerate token: `claude setup-token`
3. Update secret in GitHub

### Problem: "Gemini API key invalid"

**Symptoms**: Gemini jobs fail with authentication error

**Solution**:
1. Verify key in Google AI Studio: https://aistudio.google.com/apikey
2. Check secret name is exactly `GEMINI_API_KEY`
3. Regenerate key if needed

### Problem: "Rate limit exceeded"

**Symptoms**: Workflows fail with rate limit errors

**Gemini rate limits**:
- Free tier: 15 RPM (requests per minute)
- Solution: Wait 1 minute between runs

**Claude Max rate limits**:
- Check Claude Code settings
- Solution: Space out workflow runs or upgrade plan

### Problem: "Workflow never runs"

**Check**:
1. Is workflow enabled? (Actions → Select workflow → Enable)
2. Are triggers configured? (Should trigger on PR/push)
3. Check branch protections aren't blocking it

### Problem: "AI output is garbled JSON"

**Symptoms**: Workflows fail parsing AI responses

**Solution**:
1. This usually means AI didn't follow prompt format
2. Try running workflow again (sometimes transient)
3. Check workflow logs for actual AI response
4. May need to adjust prompt in workflow file

---

## 📊 Monitoring Usage

### Monitor Claude Max Usage

```bash
# In Claude Code CLI:
/cost              # See usage stats
```

Or check your Claude Max dashboard at https://claude.ai/

### Monitor Gemini Usage

1. Go to https://aistudio.google.com/apikey
2. Click **View usage**
3. See:
   - Requests per day
   - Requests per minute
   - Remaining quota

---

## 🚀 Next Steps

Now that you're set up:

1. **Enable AI Council first** - safest and most valuable
   - Automatically reviews every PR
   - No autonomous actions
   - Immediate value

2. **Try Predictive CI** - runs on every push
   - Predicts what might break
   - Learns over time
   - Saves CI minutes

3. **Add Autonomous Improvement** - weekly automated improvements
   - ⚠️ Creates PRs automatically
   - Always review before merging!
   - Implements TODOs and adds tests

4. **Enable AI Archaeology** - weekly historical analysis
   - Suggests modernization
   - No code changes
   - Just reports

5. **Activate Adversarial Testing** - weekly security tests
   - Finds vulnerabilities
   - Ethical testing only
   - Creates security reports

---

## 📚 Additional Resources

- **Claude Max OAuth Setup**: Run `claude setup-token --help`
- **Gemini API Docs**: https://ai.google.dev/
- **Workflow Customization**: See UNCONVENTIONAL-CI-CD-V2.md
- **GitHub Actions Docs**: https://docs.github.com/en/actions

---

## ✅ Checklist

Before you're done, verify:

- [ ] `CLAUDE_CODE_OAUTH_TOKEN` secret added
- [ ] `GEMINI_API_KEY` secret added
- [ ] Test workflow run successful
- [ ] AI Council reviews PRs automatically
- [ ] Workflow logs show successful authentication
- [ ] No cost incurred (check Claude + Gemini dashboards)

---

**Ready to go!** 🎉

You now have 5 unconventional AI-powered workflows running on your Claude Max subscription + free Gemini, for a total cost of **$0/month**.

No other CI/CD system has these capabilities!
