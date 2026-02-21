#!/bin/bash
# Test image retrieval endpoint

TOKEN="3UaQLfVktEWWNGGtNx6SvnCgyf1doEwf5kzNvDXFzKI="

echo "🔍 Testing image retrieval..."
echo "URL: http://localhost:3000/api/images/encrypted/$TOKEN"
echo ""

# Test with verbose output
curl -v "http://localhost:3000/api/images/encrypted/$TOKEN" 2>&1 | head -40

echo ""
echo "---"
echo "To get the actual image file, run:"
echo "curl http://localhost:3000/api/images/encrypted/$TOKEN > event-image.jpg"
