# 📋 PHASE 1: Production-Readiness Plan

## Overview
Make 5 unconventional CI/CD workflows production-ready and fully functional.

---

## 🎯 Success Criteria

A workflow is "production-ready" when:
- ✅ All CLIs are properly installed
- ✅ Dependencies are explicitly declared and installed
- ✅ API keys are validated before use
- ✅ Graceful degradation when tools unavailable
- ✅ Comprehensive error handling
- ✅ Detailed logging for debugging
- ✅ Works in actual GitHub Actions environment
- ✅ Documented prerequisites
- ✅ Tested with real data

---

## 📊 Workflow-by-Workflow Plan

### 1. AI Council Debate (`ai-council-debate.yml`)

#### Current Issues
- ❌ Claude CLI never installed
- ❌ Gemini CLI never installed
- ❌ Copilot CLI installed but not verified
- ❌ No API key validation
- ❌ Assumes `jq` is available
- ❌ No error handling for CLI failures
- ❌ Parallel jobs may fail independently

#### Fixes Required
```yaml
1. Add setup step for each AI:
   - Install Claude CLI (if API key present)
   - Install Gemini CLI (if API key present)
   - Install Copilot extension (always available)
   - Verify installations worked

2. Add API key validation:
   - Check keys exist and are not empty
   - Set flags for which AIs are available
   - Skip jobs if no APIs configured

3. Add dependency management:
   - Install jq explicitly
   - Verify git is available
   - Check disk space before large operations

4. Add error handling:
   - Wrap all CLI calls in error handlers
   - Provide fallback JSON on failure
   - Continue workflow even if one AI fails

5. Add debugging:
   - Log which AIs are active
   - Log CLI versions
   - Save error outputs for troubleshooting
```

#### Testing Strategy
- Test with only Claude key
- Test with only Gemini key
- Test with no keys (should gracefully fail)
- Test with invalid keys
- Test on actual PR

---

### 2. Predictive CI (`predictive-ci.yml`)

#### Current Issues
- ❌ Claude/Gemini CLI never installed
- ❌ No validation of historical data
- ❌ `.ai-memory/` directory may not exist
- ❌ Git operations without authentication
- ❌ Assumes GitHub CLI works
- ❌ No handling of first run (no history)

#### Fixes Required
```yaml
1. Add CLI installation:
   - Same pattern as AI Council
   - Verify before use

2. Add file system setup:
   - Create .ai-memory/ if not exists
   - Check write permissions
   - Handle empty history gracefully

3. Add git safety:
   - Configure git user before commits
   - Check if branch allows commits
   - Handle push failures gracefully

4. Add first-run handling:
   - Detect if this is first run
   - Bootstrap with sensible defaults
   - Build history over time

5. Add GitHub CLI validation:
   - Check gh is installed
   - Verify gh auth works
   - Fallback if gh unavailable
```

#### Testing Strategy
- Test first run (no .ai-memory/)
- Test with existing memory
- Test without gh CLI
- Test in fork (different permissions)

---

### 3. Autonomous Improvement (`autonomous-improvement.yml`)

#### Current Issues
- ❌ CLI never installed
- ❌ File operations assume files exist
- ❌ No validation of generated code
- ❌ Git operations may fail
- ❌ PR creation assumes gh works
- ❌ No rollback if changes break things

#### Fixes Required
```yaml
1. Add CLI installation:
   - Same as others

2. Add file validation:
   - Check files exist before reading
   - Validate generated code syntax
   - Backup before overwriting

3. Add safety checks:
   - Don't commit if tests fail
   - Don't push to protected branches
   - Limit changes per run (max 1 file)

4. Add PR creation safety:
   - Verify gh CLI works
   - Check PR doesn't already exist
   - Add warning labels to PR

5. Add validation step:
   - Syntax check generated code
   - Run linter on changes
   - Verify no secrets added
```

#### Testing Strategy
- Test TODO implementation
- Test with no TODOs found
- Test with syntax errors in generation
- Test PR creation

---

### 4. AI Archaeology (`ai-archaeology.yml`)

#### Current Issues
- ❌ CLI never installed
- ❌ Git history operations expensive
- ❌ May process hundreds of files
- ❌ No rate limiting
- ❌ Documentation commit may fail

#### Fixes Required
```yaml
1. Add CLI installation:
   - Same as others

2. Add performance limits:
   - Limit to top 10 oldest files
   - Process in batches
   - Add timeout protection

3. Add git optimization:
   - Use shallow history when possible
   - Cache git operations
   - Limit commit history depth

4. Add documentation safety:
   - Check if file changed before commit
   - Skip commit if no changes
   - Don't fail workflow if commit fails

5. Add progress tracking:
   - Log files being processed
   - Show progress percentage
   - Estimate time remaining
```

#### Testing Strategy
- Test with old codebase
- Test with new codebase (no ancient files)
- Test git history parsing
- Test documentation generation

---

### 5. Adversarial Testing (`adversarial-testing.yml`)

#### Current Issues
- ❌ CLI never installed
- ❌ Assumes backend can start
- ❌ No port conflict handling
- ❌ Attack script uses axios (not installed)
- ❌ May create too many security issues

#### Fixes Required
```yaml
1. Add CLI installation:
   - Same as others

2. Add backend startup:
   - Check if backend exists
   - Find available port
   - Wait for ready (health check)
   - Kill process on completion

3. Add attack dependencies:
   - Install axios for test script
   - Add timeout protection
   - Handle network failures

4. Add issue management:
   - Group similar vulnerabilities
   - Update existing issues instead of creating duplicates
   - Rate limit issue creation

5. Add safety limits:
   - Limit number of attacks (max 50)
   - Timeout per attack (5 sec)
   - Don't overwhelm backend
```

#### Testing Strategy
- Test with backend running
- Test without backend
- Test attack execution
- Test issue creation

---

## 🔧 Cross-Cutting Improvements

### Common Setup Steps (Reusable)

```yaml
# Step 1: Validate Environment
- name: 🔍 Validate Environment
  run: |
    echo "Checking dependencies..."
    command -v git >/dev/null 2>&1 || { echo "git required"; exit 1; }
    command -v jq >/dev/null 2>&1 || { echo "Installing jq..."; sudo apt-get install -y jq; }
    command -v node >/dev/null 2>&1 || { echo "node required"; exit 1; }

# Step 2: Validate API Keys
- name: 🔑 Validate API Keys
  id: validate-keys
  run: |
    HAS_CLAUDE=false
    HAS_GEMINI=false
    HAS_COPILOT=true  # Always available via GITHUB_TOKEN

    if [ -n "${{ secrets.CLAUDE_CODE_API_KEY }}" ]; then
      HAS_CLAUDE=true
      echo "✅ Claude API key found"
    fi

    if [ -n "${{ secrets.GOOGLE_API_KEY }}" ]; then
      HAS_GEMINI=true
      echo "✅ Gemini API key found"
    fi

    echo "has_claude=$HAS_CLAUDE" >> $GITHUB_OUTPUT
    echo "has_gemini=$HAS_GEMINI" >> $GITHUB_OUTPUT
    echo "has_copilot=$HAS_COPILOT" >> $GITHUB_OUTPUT

# Step 3: Install Claude CLI (conditional)
- name: 🎭 Install Claude CLI
  if: steps.validate-keys.outputs.has_claude == 'true'
  run: |
    npm install -g @anthropic-ai/claude-cli || {
      echo "⚠️ Failed to install Claude CLI"
      exit 0  # Don't fail workflow
    }

    # Verify installation
    if command -v claude &> /dev/null; then
      echo "✅ Claude CLI installed: $(claude --version)"
    else
      echo "⚠️ Claude CLI not available"
    fi

# Step 4: Install Gemini CLI (conditional)
- name: 💎 Install Gemini CLI
  if: steps.validate-keys.outputs.has_gemini == 'true'
  run: |
    npm install -g @google/generative-ai-cli || {
      echo "⚠️ Failed to install Gemini CLI"
      exit 0  # Don't fail workflow
    }

    # Verify installation
    if command -v gemini &> /dev/null; then
      echo "✅ Gemini CLI installed: $(gemini --version)"
    else
      echo "⚠️ Gemini CLI not available"
    fi

# Step 5: Install Copilot CLI
- name: 🐙 Install Copilot CLI
  run: |
    gh extension install github/gh-copilot 2>/dev/null || echo "Already installed"

    # Verify
    if gh copilot --version &> /dev/null; then
      echo "✅ Copilot CLI ready"
    else
      echo "⚠️ Copilot CLI not available"
    fi
  continue-on-error: true

# Step 6: Smart CLI Selection
- name: 🤖 Select Best Available AI
  id: select-ai
  run: |
    if [ "${{ steps.validate-keys.outputs.has_claude }}" == "true" ]; then
      echo "selected=claude" >> $GITHUB_OUTPUT
      echo "✅ Using Claude (premium)"
    elif [ "${{ steps.validate-keys.outputs.has_gemini }}" == "true" ]; then
      echo "selected=gemini" >> $GITHUB_OUTPUT
      echo "✅ Using Gemini (free)"
    elif [ "${{ steps.validate-keys.outputs.has_copilot }}" == "true" ]; then
      echo "selected=copilot" >> $GITHUB_OUTPUT
      echo "✅ Using Copilot (native)"
    else
      echo "selected=none" >> $GITHUB_OUTPUT
      echo "⚠️ No AI available - manual mode"
    fi
```

### Error Handling Pattern

```yaml
# Wrap all AI calls like this:
- name: 🤖 AI Operation
  run: |
    set +e  # Don't exit on error

    # Try operation
    if [ "${{ steps.select-ai.outputs.selected }}" == "claude" ]; then
      claude -p "$(cat prompt.txt)" --output-format stream-json > output.json 2>error.log
      EXIT_CODE=$?
    elif [ "${{ steps.select-ai.outputs.selected }}" == "gemini" ]; then
      gemini -p "$(cat prompt.txt)" --yolo --format json > output.json 2>error.log
      EXIT_CODE=$?
    else
      echo '{"status":"no-ai-available"}' > output.json
      EXIT_CODE=0
    fi

    # Check result
    if [ $EXIT_CODE -ne 0 ]; then
      echo "⚠️ AI operation failed, using fallback"
      echo '{"status":"error","error":"'$(cat error.log)'"}' > output.json
    fi

    # Validate JSON
    if ! jq empty output.json 2>/dev/null; then
      echo "⚠️ Invalid JSON, using fallback"
      echo '{"status":"invalid-json"}' > output.json
    fi
```

---

## 📦 Dependency Management

### Add to Each Workflow

```yaml
jobs:
  setup:
    name: 🔧 Setup & Validation
    runs-on: ubuntu-latest
    outputs:
      has_claude: ${{ steps.validate.outputs.has_claude }}
      has_gemini: ${{ steps.validate.outputs.has_gemini }}
      has_copilot: ${{ steps.validate.outputs.has_copilot }}
      can_proceed: ${{ steps.validate.outputs.can_proceed }}
    steps:
      - name: Install System Dependencies
        run: |
          sudo apt-get update -qq
          sudo apt-get install -y jq curl git

      - name: Validate Environment
        id: validate
        run: |
          # ... validation logic from above ...

          # Set can_proceed flag
          if [ "$HAS_CLAUDE" == "true" ] || [ "$HAS_GEMINI" == "true" ]; then
            echo "can_proceed=true" >> $GITHUB_OUTPUT
          else
            echo "can_proceed=false" >> $GITHUB_OUTPUT
            echo "⚠️ No AI available - workflow will skip AI features"
          fi
```

---

## 🧪 Testing Plan

### Pre-Deployment Tests

1. **Syntax Validation**
   ```bash
   # Validate all YAML files
   for file in .github/workflows/*.yml; do
     yamllint "$file" || echo "YAML error in $file"
   done
   ```

2. **Dry Run Testing**
   ```bash
   # Use act to test locally
   act pull_request -W .github/workflows/ai-council-debate.yml --dry-run
   ```

3. **Incremental Rollout**
   - Fix and test 1 workflow at a time
   - Start with simplest (AI Council)
   - Build up to most complex (Adversarial Testing)

4. **Real Environment Testing**
   - Create test PR to trigger workflows
   - Monitor logs in real-time
   - Fix issues as they appear

---

## 📝 Implementation Order

1. **ai-council-debate.yml** (Simplest, most used)
   - Most visible (runs on every PR)
   - Simpler logic than others
   - Good test case for common patterns

2. **autonomous-improvement.yml** (Medium complexity)
   - File operations are testable
   - PR creation can be verified
   - Good for testing git operations

3. **predictive-ci.yml** (Medium-high complexity)
   - Tests memory system
   - Tests learning loop
   - Good for testing persistence

4. **ai-archaeology.yml** (High complexity)
   - Heavy git operations
   - Large file processing
   - Tests performance limits

5. **adversarial-testing.yml** (Highest complexity)
   - Requires backend running
   - Network operations
   - Most moving parts

---

## 🚨 Rollback Plan

If a workflow fails in production:

1. **Immediate**: Disable workflow via GitHub UI
2. **Fix**: Correct issue in branch
3. **Test**: Verify fix works
4. **Deploy**: Re-enable workflow

Workflows are independent - one failing doesn't affect others.

---

## ✅ Definition of Done

For each workflow:
- [ ] All CLIs installed properly
- [ ] API keys validated
- [ ] Dependencies declared
- [ ] Error handling comprehensive
- [ ] Logging detailed
- [ ] Tested with real data
- [ ] Documentation updated
- [ ] Fallback behavior works
- [ ] No secrets leaked
- [ ] Performance acceptable (<10 min runtime)

---

## 📊 Estimated Timeline

- Phase 1 (Planning): ✅ Done
- Phase 2 (Critique): 15 minutes
- Phase 3 (Improvements): 15 minutes
- Phase 4 (Implementation): 2-3 hours
- Phase 5 (Testing): 1-2 hours

**Total: 4-6 hours for production-ready system**

---

_Plan created: 2025-11-05_
_Status: Ready for critique_
