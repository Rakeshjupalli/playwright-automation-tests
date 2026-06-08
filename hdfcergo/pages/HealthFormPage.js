import { expect } from '@playwright/test';

/**
 * Page Object for Ditto Insurance Health Form Wizard
 * Handles navigating through the "Tell us about you" questionnaire,
 * selecting product, configuring individual plan, filling demographics.
 */
export class HealthFormPage {
  constructor(page) {
    this.page = page;

    // Product selection — use .first() to avoid strict-mode violations
    this.healthInsuranceModule = page.locator('text=Health Insurance').or(
      page.getByRole('button', { name: /health insurance/i })
    ).or(
      page.locator('[data-testid="health-insurance"]')
    ).or(
      page.getByText('Health', { exact: true })
    ).first();

    this.hdfcErgoOptimaSecure = page.locator('text=HDFC ERGO Optima Secure').or(
      page.getByText(/Optima Secure/i)
    ).or(
      page.locator('[data-testid="hdfc-ergo-optima-secure"]')
    ).or(
      page.locator('img[alt*="Optima Secure"]').locator('..')
    ).first();

    // Plan configuration - "You" option (individual)
    this.youOption = page.locator('text=You').or(
      page.getByRole('button', { name: /^You$/i })
    ).or(
      page.getByLabel('You')
    ).or(
      page.locator('[data-testid="plan-you"]')
    ).or(
      page.locator('div', { hasText: /^You$/ })
    ).first();

    this.individualOption = page.locator('text=Individual').or(
      page.getByRole('radio', { name: /individual/i })
    ).or(
      page.getByText('Individual', { exact: true })
    ).first();

    // Age input
    this.ageInput = page.locator('input[name="age"], input[placeholder*="age"], input[data-testid="age"]').or(
      page.getByLabel(/age/i).or(
        page.locator('#age')
      )
    );
    this.ageDropdownOption = page.locator('ul li', { hasText: /^25$/ }); // fallback age 25

    // City/Pincode input
    this.cityInput = page.locator('input[name="city"], input[placeholder*="city"], input[data-testid="city"]').or(
      page.getByLabel(/city/i).or(
        page.getByPlaceholder(/enter city/i).or(
          page.locator('#city')
        )
      )
    );
    this.cityDropdownOption = page.locator('ul li', { hasText: /Mumbai/i }).first();

    // Gender selection (if applicable)
    this.maleOption = page.locator('text=Male').or(
      page.getByRole('radio', { name: /^Male$/i })
    ).or(
      page.getByLabel('Male')
    ).first();

    this.femaleOption = page.locator('text=Female').or(
      page.getByRole('radio', { name: /^Female$/i })
    ).or(
      page.getByLabel('Female')
    ).first();

    // Continue/Next buttons
    this.continueButton = page.locator('button:has-text("Continue"), button:has-text("Next"), [data-testid="continue"]').or(
      page.getByRole('button', { name: /^Continue$|^Next$/i })
    ).first();

    this.submitButton = page.locator('button:has-text("Get Quote"), button:has-text("See Plans"), button:has-text("Submit"]').or(
      page.getByRole('button', { name: /^Get Quote$|^See Plans$|^Submit$/i })
    ).first();

    // Progress/step indicators
    this.stepIndicator = page.locator('[data-testid="step-indicator"], .stepper, [class*="progress"]').first();

    // Loading states
    this.loadingSpinner = page.locator('[class*="loading"], [class*="spinner"], [data-testid="loader"]').first();

    // Riders selection (on quote/summary page or form)
    this.riderOptions = page.locator('[data-testid*="rider"], [class*="rider"], label:has-text("Rider")');
    this.addRiderButtons = page.locator('button:has-text("Add"), button:has-text("+ Add")');

    // Summary page indicators
    this.premiumSummarySection = page.locator('[data-testid="premium-summary"], [class*="summary"], h2:has-text("Summary")').first();
  }

  /**
   * Navigate to Ditto Insurance FQ page
   */
  async navigateToFqPage() {
    await this.page.goto('https://app.joinditto.in/fq', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
  }

  /**
   * Select Health Insurance module
   */
  async selectHealthInsurance() {
    const healthBtn = this.healthInsuranceModule;
    await expect(healthBtn).toBeVisible({ timeout: 15000 });
    await healthBtn.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Select HDFC ERGO Optima Secure product
   */
  async selectProduct() {
    const product = this.hdfcErgoOptimaSecure;
    await expect(product).toBeVisible({ timeout: 15000 });
    await product.click();
    await this.page.waitForTimeout(1500);
  }

  /**
   * Configure plan for individual ("You" option)
   */
  async configureIndividualPlan() {
    // Select "You" option if present
    const youOption = this.youOption;
    if (await youOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await youOption.click();
      await this.page.waitForTimeout(500);
    }

    // Select Individual plan type if there's a separate option
    const individualOpt = this.individualOption;
    if (await individualOpt.isVisible({ timeout: 5000 }).catch(() => false)) {
      await individualOpt.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Fill demographic information
   * @param {Object} demographics
   * @param {number} demographics.age - Age in years
   * @param {string} demographics.city - City name
   * @param {string} demographics.gender - 'male' or 'female'
   */
  async fillDemographics(demographics = {}) {
    const { age = 25, city = 'Mumbai', gender = 'male' } = demographics;

    // Fill Age
    const ageField = this.ageInput;
    if (await ageField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ageField.click();
      await ageField.fill(age.toString());
      await this.page.waitForTimeout(500);

      // Try to select from dropdown if it appears
      const ageOption = this.page.locator('ul li', { hasText: new RegExp(`^${age}$`) }).first();
      if (await ageOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ageOption.click();
      }
      await this.page.waitForTimeout(300);
    }

    // Select Gender if visible
    if (gender === 'male') {
      const maleOpt = this.maleOption;
      if (await maleOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await maleOpt.click();
        await this.page.waitForTimeout(300);
      }
    } else {
      const femaleOpt = this.femaleOption;
      if (await femaleOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await femaleOpt.click();
        await this.page.waitForTimeout(300);
      }
    }

    // Fill City
    const cityField = this.cityInput;
    if (await cityField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cityField.click();
      await cityField.fill('');
      await cityField.fill(city);
      await this.page.waitForTimeout(1000);

      // Select from dropdown
      const cityOption = this.cityDropdownOption;
      if (await cityOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cityOption.click();
      } else {
        // Press Enter as fallback
        await cityField.press('Enter');
      }
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Click through the wizard by finding and clicking Continue/Next buttons
   * @param {number} maxSteps - Maximum number of wizard steps to navigate
   */
  async navigateThroughWizard(maxSteps = 5) {
    for (let step = 0; step < maxSteps; step++) {
      // Check for loading state
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

      // Try to find and click Continue
      const continueBtn = this.continueButton;
      const submitBtn = this.submitButton;

      const continueVisible = await continueBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const submitVisible = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (continueVisible) {
        await continueBtn.click();
        await this.page.waitForTimeout(1500);

        // Wait for loading to finish
        await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      } else if (submitVisible) {
        await submitBtn.click();
        await this.page.waitForTimeout(2000);

        // Wait for loading to finish
        await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
        break;
      } else {
        // No more navigation buttons found
        break;
      }

      // Check if we've reached the summary/quote page
      const summaryVisible = await this.premiumSummarySection.isVisible({ timeout: 2000 }).catch(() => false);
      if (summaryVisible) {
        break;
      }
    }
  }

  /**
   * Select optional riders if presented
   */
  async selectRiders() {
    const riderOptions = this.riderOptions;
    const count = await riderOptions.count().catch(() => 0);

    if (count > 0) {
      // Select first available rider for testing purposes
      const firstRider = riderOptions.first();
      if (await firstRider.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstRider.click();
        await this.page.waitForTimeout(500);
      }
    }

    // Click any "Add" buttons for riders
    const addButtons = this.addRiderButtons;
    const addCount = await addButtons.count().catch(() => 0);

    for (let i = 0; i < Math.min(addCount, 1); i++) {
      const btn = addButtons.nth(i);
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Complete the entire form flow up to the premium summary page
   * @param {Object} demographics
   */
  async completeFormFlow(demographics = {}) {
    await this.selectHealthInsurance();
    await this.selectProduct();
    await this.configureIndividualPlan();
    await this.fillDemographics(demographics);
    await this.selectRiders();
    await this.navigateThroughWizard(8);
  }
}
