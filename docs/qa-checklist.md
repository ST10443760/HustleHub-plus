# HustleHub+ Part 3 QA Checklist

 
**Branch:** st10367494-qa

## 1. Fresh Clone and Setup
- [ ] Follow the README instructions exactly.
- [ ] Confirm the application starts successfully.
- [ ] Record setup problems as GitHub issues.

## 2. Docker and Containers
- [ ] Confirm the Docker Compose configuration exists.
- [ ] Start the stack using the README instructions.
- [ ] Confirm the required containers are running.
- [ ] Save a screenshot as `docs/screenshots/part3-containers.png`.

## 3. Tax Calculation
- [ ] Confirm the tax endpoint exists.
- [ ] Calculate expected tax results by hand using the project's documented rules and rates.
- [ ] Compare expected results with API responses.
- [ ] Record any differences.

## 4. Income Dashboard
- [ ] Confirm the dashboard is available.
- [ ] Check that income figures match the transaction data.
- [ ] Save a screenshot as `docs/screenshots/part3-dashboard.png`.

## 5. CI/CD Pipeline
- [ ] Confirm the GitHub Actions workflow exists.
- [ ] Check that the pipeline completes successfully.
- [ ] Save a screenshot as `docs/screenshots/part3-pipeline.png`.

## 6. Existing Tests
- [ ] Run the documented API tests.
- [ ] Run the documented frontend tests.
- [ ] Record any failures.

## 7. Logging and Security
- [ ] Check login, booking, transaction, and error events in the logs.
- [ ] Review the available security test evidence.

## 8. Final Checks
- [ ] A fresh clone works using the README instructions.
- [ ] Required tests have been run and results recorded.
- [ ] Required screenshots have been saved.
- [ ] QA evidence is ready for review.

**Important:** Do not tick an item until you have actually completed the test. Part 3 features have not yet been confirmed in this checkout.
