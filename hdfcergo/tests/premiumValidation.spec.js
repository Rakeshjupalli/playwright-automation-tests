import { test, expect } from '@playwright/test';
import { HealthFormPage } from '../pages/HealthFormPage.js';
import { PremiumSummaryPage } from '../pages/PremiumSummaryPage.js';

/**
 * Test Suite: Ditto Insurance Premium Validation (HDFC ERGO Optima Secure)
 *
 * Scenario:
 * 1. Navigate to Ditto Insurance FQ page
 * 2. Select Health Insurance module
 * 3. Select HDFC ERGO Optima Secure product
 * 4. Configure for individual ("You" option)
 * 5. Fill demographics (age, city)
 * 6. Navigate through wizard to premium summary
 * 7. Extract base premium, rider costs, GST, and total premium
 * 8. Validate: Total Premium = Base Premium + Selected Riders + GST
 */
test.describe('Ditto Insurance - HDFC ERGO Premium Validation', () => {
  test('Validate premium calculation for individual health plan', async ({ page }) => {
    // Initialize Page Objects
    const formPage = new HealthFormPage(page);
    const summaryPage = new PremiumSummaryPage(page);

    // Step 1: Navigate to FQ page
    await test.step('Navigate to Ditto Insurance FQ page', async () => {
      await formPage.navigateToFqPage();
      await expect(page).toHaveURL(/joinditto\.in\/fq/);
    });

    // Steps 2-6: Complete the form wizard
    await test.step('Complete health insurance form wizard', async () => {
      await formPage.completeFormFlow({
        age: 25,
        city: 'Mumbai',
        gender: 'male'
      });
    });

    // Step 7: Wait for and extract premium values from summary page
    await test.step('Extract premium values from summary page', async () => {
      await summaryPage.waitForSummaryPage();

      // Verify we're on a quote/summary page
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);

      // Extract all premium-related values
      const values = await summaryPage.extractAllValues();

      // Ensure we have at minimum a total premium
      expect(values.totalPremium, 'Total Premium should be extracted').toBeTruthy();
    });

    // Step 8: Validate premium calculation
    await test.step('Validate premium mathematical correctness', async () => {
      const values = await summaryPage.extractAllValues();

      // Log and assert the premium calculation
      summaryPage.validatePremiumCalculation(values);
    });
  });
});
