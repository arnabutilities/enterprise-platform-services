#!/bin/bash

echo "Setting up environment..."

# Create .env files
for app in apps/*; do
  if [ -d "$app" ]; then
    if [ ! -f "$app/.env.local" ]; then
      cp .env.example "$app/.env.local"
      echo "✓ Created $app/.env.local"
    fi
  fi
done

# Generate types
if [ -d "contracts" ]; then
  echo "Generating types from contracts..."
  cd contracts && pnpm run generate:types && cd ..
fi

echo "✓ Setup complete!"
