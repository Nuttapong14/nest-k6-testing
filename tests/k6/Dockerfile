# K6 Load Testing Docker Image
FROM grafana/k6:latest

# Install additional tools if needed
RUN apk add --no-cache \
    curl \
    jq

# Create a directory for test scripts
WORKDIR /tests

# Copy all test scripts
COPY *.js /tests/

# Copy any test data if it exists
COPY test-data/ /tests/test-data/ 2>/dev/null || true

# Set default command
CMD ["run", "--out", "json=results.json", "mixed-workload-test.js"]