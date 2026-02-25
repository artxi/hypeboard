#!/bin/bash
set -e

# Install pnpm
npm install -g pnpm@10.30.0

# Install dependencies with ignore-scripts to avoid build failures
HUSKY=0 pnpm install --ignore-scripts

# Build frontend
pnpm --filter frontend build
