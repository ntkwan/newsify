#!/bin/bash

# Run tests with pytest
echo "Running tests with coverage..."
python3 -m pytest --cov=app --cov-report=term-missing

# Check if tests passed
if [ $? -eq 0 ]; then
  echo "All tests passed successfully!"
else
  echo "Some tests failed. Please check the output above."
fi
