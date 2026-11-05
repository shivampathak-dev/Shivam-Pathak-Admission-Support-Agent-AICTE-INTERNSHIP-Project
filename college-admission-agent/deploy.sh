#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — One-shot deployment script for IBM Cloud Code Engine
#  College Admission Agent — RAG-Based using IBM Granite
# =============================================================================
set -euo pipefail

# ── Configuration (edit these before running) ─────────────────────────────────
REGION="us-south"
CE_PROJECT="college-admission-agent"
ICR_NAMESPACE="college-admission-agent"
ICR_REGION="us.icr.io"
BACKEND_IMAGE="${ICR_REGION}/${ICR_NAMESPACE}/caa-backend:latest"
FRONTEND_IMAGE="${ICR_REGION}/${ICR_NAMESPACE}/caa-frontend:latest"

# IBM watsonx.ai credentials — set as env vars before running this script
: "${IBM_WATSONX_API_KEY:?IBM_WATSONX_API_KEY must be set}"
: "${IBM_WATSONX_PROJECT_ID:?IBM_WATSONX_PROJECT_ID must be set}"
: "${SECRET_KEY:?SECRET_KEY must be set}"

# ── 1. Login & select region ──────────────────────────────────────────────────
echo "▶ Logging into IBM Cloud..."
ibmcloud login --apikey "${IBM_CLOUD_API_KEY}" -r "${REGION}" -g Default
ibmcloud cr login

# ── 2. Create / select Code Engine project ───────────────────────────────────
echo "▶ Setting up Code Engine project: ${CE_PROJECT}"
ibmcloud ce project create --name "${CE_PROJECT}" 2>/dev/null || true
ibmcloud ce project select  --name "${CE_PROJECT}"

# ── 3. Create ICR namespace ───────────────────────────────────────────────────
echo "▶ Creating container registry namespace..."
ibmcloud cr namespace-add "${ICR_NAMESPACE}" 2>/dev/null || true

# ── 4. Build & push backend ───────────────────────────────────────────────────
echo "▶ Building backend image..."
docker build -t "${BACKEND_IMAGE}" ./backend
docker push "${BACKEND_IMAGE}"

# ── 5. Build & push frontend ─────────────────────────────────────────────────
# Resolve backend URL from Code Engine (will exist after backend deploy)
echo "▶ Building frontend image..."
BACKEND_URL=$(ibmcloud ce application get --name caa-backend --output json 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',{}).get('url',''))" 2>/dev/null \
    || echo "")

if [[ -z "${BACKEND_URL}" ]]; then
    echo "  ⚠ Backend URL not yet available — using placeholder. Re-run after backend deploy."
    BACKEND_URL="https://caa-backend.placeholder.us-south.codeengine.appdomain.cloud"
fi

docker build \
    --build-arg NEXT_PUBLIC_API_URL="${BACKEND_URL}" \
    -t "${FRONTEND_IMAGE}" ./frontend
docker push "${FRONTEND_IMAGE}"

# ── 6. Create Code Engine secrets ────────────────────────────────────────────
echo "▶ Creating secrets..."
ibmcloud ce secret create --name caa-secrets 2>/dev/null || true
ibmcloud ce secret update --name caa-secrets \
    --from-literal SECRET_KEY="${SECRET_KEY}" \
    --from-literal IBM_WATSONX_API_KEY="${IBM_WATSONX_API_KEY}" \
    --from-literal IBM_WATSONX_PROJECT_ID="${IBM_WATSONX_PROJECT_ID}"

# ── 7. Deploy backend application ────────────────────────────────────────────
echo "▶ Deploying backend..."
ibmcloud ce application create \
    --name caa-backend \
    --image "${BACKEND_IMAGE}" \
    --registry-secret icr-secret \
    --port 8000 \
    --cpu 1 \
    --memory 4G \
    --min-scale 1 \
    --max-scale 3 \
    --env-from-secret caa-secrets \
    --env IBM_WATSONX_URL="https://us-south.ml.cloud.ibm.com" \
    --env IBM_GRANITE_MODEL_ID="ibm/granite-3-8b-instruct" \
    --env DATABASE_URL="sqlite+aiosqlite:///./data/admission_agent.db" \
    --env CHROMA_PERSIST_DIR="data/chroma" \
    --env EMBEDDING_MODEL_NAME="all-MiniLM-L6-v2" \
    2>/dev/null || \
ibmcloud ce application update \
    --name caa-backend \
    --image "${BACKEND_IMAGE}" \
    --env-from-secret caa-secrets

# ── 8. Fetch backend URL and deploy frontend ─────────────────────────────────
echo "▶ Fetching backend URL..."
BACKEND_URL=$(ibmcloud ce application get --name caa-backend --output json \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',{}).get('url',''))")
echo "   Backend URL: ${BACKEND_URL}"

echo "▶ Deploying frontend..."
ibmcloud ce application create \
    --name caa-frontend \
    --image "${FRONTEND_IMAGE}" \
    --registry-secret icr-secret \
    --port 3000 \
    --cpu 0.5 \
    --memory 1G \
    --min-scale 1 \
    --max-scale 3 \
    --env NODE_ENV=production \
    --env NEXT_PUBLIC_API_URL="${BACKEND_URL}" \
    2>/dev/null || \
ibmcloud ce application update \
    --name caa-frontend \
    --image "${FRONTEND_IMAGE}" \
    --env NEXT_PUBLIC_API_URL="${BACKEND_URL}"

# ── 9. Print final URLs ───────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo "────────────────────────────────────────────────────────────────"
FRONTEND_URL=$(ibmcloud ce application get --name caa-frontend --output json \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',{}).get('url',''))" 2>/dev/null || echo "")
echo "  Frontend : ${FRONTEND_URL}"
echo "  Backend  : ${BACKEND_URL}"
echo "  API docs : ${BACKEND_URL}/docs"
echo "════════════════════════════════════════════════════════════════"
