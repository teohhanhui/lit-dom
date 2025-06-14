#!/bin/bash

echo "🔨 Building @cycle/lit-dom..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

echo "📦 Installing example dependencies..."
cd example
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies!"
    exit 1
fi

echo "🚀 Starting development server..."
echo "📍 The example will open at http://localhost:3000"
echo "💡 Open browser console to see memoization in action!"
echo ""
pnpm run dev