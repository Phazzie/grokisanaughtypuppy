#!/bin/bash
# Google Gemini CI Helper Script
# Integrates Gemini API with GitHub Actions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Gemini CLI is available
check_gemini_cli() {
    if command -v gemini &> /dev/null; then
        log_info "Gemini CLI is installed"
        gemini --version
        return 0
    else
        log_warn "Gemini CLI not found"
        log_info "Using direct API calls instead"
        return 1
    fi
}

# Configure Gemini API
configure_gemini() {
    if [ -z "$GEMINI_API_KEY" ]; then
        log_error "GEMINI_API_KEY environment variable not set"
        exit 1
    fi

    export GEMINI_API_KEY="$GEMINI_API_KEY"
    log_info "Gemini API configured"
}

# Call Gemini API directly
call_gemini_api() {
    local prompt="$1"
    local output_file="${2:-gemini-output.txt}"

    if [ -z "$GEMINI_API_KEY" ]; then
        log_error "GEMINI_API_KEY not set"
        return 1
    fi

    log_info "Calling Gemini API..."

    # Using curl to call Gemini API
    # Adjust endpoint and format based on actual Gemini API
    curl -s -X POST \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{\"contents\":[{\"parts\":[{\"text\":\"$prompt\"}]}]}" \
        > "$output_file" 2>&1 || {
            log_error "API call failed"
            return 1
        }

    log_info "Response saved to: $output_file"
}

# Review code with Gemini
review_code() {
    local file_path="$1"
    local output_file="${2:-gemini-review.md}"

    if [ ! -f "$file_path" ]; then
        log_error "File not found: $file_path"
        return 1
    fi

    log_info "Reviewing code with Gemini: $file_path"

    local code_content=$(cat "$file_path")
    local prompt="Review this code for quality, security, and best practices:\n\n$code_content"

    # Call Gemini API or CLI
    if check_gemini_cli; then
        # gemini review "$file_path" --output "$output_file"
        log_warn "Gemini CLI review command needs to be implemented"
    else
        call_gemini_api "$prompt" "$output_file"
    fi

    log_info "Review complete: $output_file"
}

# Generate tests with Gemini
generate_tests() {
    local source_file="$1"
    local output_file="${2:-${source_file%.ts}.spec.ts}"

    if [ ! -f "$source_file" ]; then
        log_error "Source file not found: $source_file"
        return 1
    fi

    log_info "Generating tests with Gemini: $source_file"

    local code_content=$(cat "$source_file")
    local prompt="Generate comprehensive Jasmine/Karma unit tests for this Angular/TypeScript code:\n\n$code_content"

    call_gemini_api "$prompt" "gemini-tests-raw.json"

    # Extract generated code from JSON response
    # This is simplified - actual parsing would be more robust
    log_info "Tests would be written to: $output_file"
    log_warn "Response parsing needs to be implemented"
}

# Analyze git diff with Gemini
analyze_diff() {
    local diff_file="$1"
    local output_file="${2:-gemini-diff-analysis.md}"

    if [ ! -f "$diff_file" ]; then
        log_error "Diff file not found: $diff_file"
        return 1
    fi

    log_info "Analyzing diff with Gemini..."

    local diff_content=$(cat "$diff_file")
    local prompt="Analyze this git diff and provide insights on changes, potential issues, and recommendations:\n\n$diff_content"

    call_gemini_api "$prompt" "$output_file"

    log_info "Analysis complete: $output_file"
}

# Generate release notes with Gemini
generate_release_notes() {
    local changelog="$1"
    local output_file="${2:-gemini-release-notes.md}"

    log_info "Generating release notes with Gemini..."

    local prompt="Generate professional, user-friendly release notes from this changelog:\n\n$changelog"

    call_gemini_api "$prompt" "$output_file"

    log_info "Release notes generated: $output_file"
}

# Main command router
main() {
    local command="${1:-help}"

    case "$command" in
        check)
            check_gemini_cli
            ;;
        configure)
            configure_gemini
            ;;
        review)
            review_code "${2:-}" "${3:-gemini-review.md}"
            ;;
        generate-tests)
            generate_tests "${2:-}" "${3:-}"
            ;;
        analyze-diff)
            analyze_diff "${2:-}" "${3:-gemini-diff-analysis.md}"
            ;;
        release-notes)
            generate_release_notes "${2:-}" "${3:-gemini-release-notes.md}"
            ;;
        api-call)
            call_gemini_api "${2:-Test prompt}" "${3:-gemini-output.txt}"
            ;;
        help|*)
            cat << HELP
Google Gemini CI Helper Script

Usage: $0 <command> [options]

Commands:
  check                     Check if Gemini CLI is available
  configure                 Configure Gemini API key
  review <file> [output]    Review code file
  generate-tests <file>     Generate tests for source file
  analyze-diff <file>       Analyze git diff
  release-notes <log>       Generate release notes
  api-call <prompt> [out]   Make direct API call
  help                      Show this help message

Environment Variables:
  GEMINI_API_KEY           Your Google AI API key (required)

Examples:
  $0 configure
  $0 review src/app/app.ts
  $0 generate-tests src/services/chat.service.ts
  $0 analyze-diff pr_diff.txt
  $0 release-notes CHANGELOG.md

For more information:
https://ai.google.dev/docs
HELP
            ;;
    esac
}

# Run main function
main "$@"
