#!/bin/bash
# Build script for DigitalOcean deployment
# This script replaces environment variables at build time

# Get the API URL from environment or use default
API_URL=${API_URL:-"https://grokisanaughtypuppy-yn23q.ondigitalocean.app/api"}

echo "Building with API_URL: $API_URL"

# Replace the API URL in the production environment file
cat > src/environments/environment.prod.ts << EOF
export const environment = {
  production: true,
  apiUrl: '$API_URL'
};
EOF

# Build the application
npm run build -- --configuration production