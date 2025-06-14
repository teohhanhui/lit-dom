#!/bin/bash

echo "🚀 Starting TODO example..."
cd todo-isolate

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

echo "🌟 Starting development server at http://localhost:3003"
pnpm run dev
