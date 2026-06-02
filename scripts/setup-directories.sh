#!/bin/bash

echo "Setting up missing directories..."

# Contracts
mkdir -p contracts/src/{openapi/schemas,openapi/v1,events,federation,types,graphql}
echo "✓ contracts/"

# Infra
mkdir -p infra/{k8s/base,k8s/overlays/{dev,staging,prod},docker/{nginx,postgres,redis},terraform/{modules,environments},helm/{charts,values},scripts}
echo "✓ infra/"

# Observability
mkdir -p observability/{logging,tracing,monitoring,dashboards}
echo "✓ observability/"

# Security
mkdir -p security/src/{auth,middleware,rbac,encryption,validation}
echo "✓ security/"

# Tools
mkdir -p tools/{generators,linters,scripts,templates}
echo "✓ tools/"

# Runtime
mkdir -p runtime/src/{isolation,retry,fallback,circuitbreaker}
echo "✓ runtime/"

echo ""
echo "✓ All directories created successfully!"
echo ""
echo "Next steps:"
echo "1. Review API_CONTRACTS_LAYER.md"
echo "2. Review SECURITY_SETUP.md"
echo "3. Review MODULE_FEDERATION_IMPLEMENTATION.md"
echo "4. Review ENVIRONMENT_CONFIGURATION.md"
echo "5. Review STATE_MANAGEMENT.md"
echo "6. Review OBSERVABILITY_SETUP.md"
echo "7. Review CICD_PIPELINES.md"
