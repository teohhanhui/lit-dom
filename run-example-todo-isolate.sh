#!/bin/bash

echo "🚀 Starting TODO example..."
cd examples/todo-isolate

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

echo "🌟 Starting development server at http://localhost:3003"
yarn dev
