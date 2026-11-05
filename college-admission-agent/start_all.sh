#!/bin/bash
# One-command runner for College Admission Agent (FastAPI Backend + Next.js Frontend)

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=================================================="
echo "  🚀 Starting College Admission Agent"
echo "=================================================="

# Function to kill child processes on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend
echo "▶ Starting FastAPI Backend on http://localhost:8000..."
cd "$DIR/backend"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait briefly for backend to bind
sleep 2

# 2. Start Frontend
echo "▶ Starting Next.js Frontend on http://localhost:3000..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo "  ✅ Both servers are running!"
echo "  🌐 Web App:  http://localhost:3000"
echo "  💬 Chat:     http://localhost:3000/chat"
echo "  🛠️  Admin:    http://localhost:3000/admin"
echo "  📚 API Docs: http://localhost:8000/api/docs"
echo "=================================================="
echo "Press Ctrl+C to stop both servers."

wait
