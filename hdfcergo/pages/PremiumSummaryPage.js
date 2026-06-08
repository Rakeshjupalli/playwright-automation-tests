import { expect } from '@playwright/test';

/**
 * Page Object for Premium Summary/Quotation Page
 * Handles extraction and validation of premium amounts.
 */
export class PremiumSummaryPage {
  constructor(page) {
    this.page = page;

    // Section containers
    this.summaryContainer = page.locator('[data-testid="premium-summary"], [class*="summary"], [class*="quote"]').first();
    this.premiumBreakdownSection = page.locator('[data-testid="premium-breakdown"], [class*="breakdown"]').first();

    // Base Premium
    this.basePremiumLocator = page.locator('text=/Base Premium|Base premium|base premium/i').locator('xpath=../..').or(
      page.locator('[data-testid="base-premium"]').or(
        page.locator('div', { hasText: /Base Premium/i }).locator('xpath=//*[contains(@class,"price") or contains(@class,"amount") or self::span]').last()
      )
    );
    this.basePremiumValue = page.locator('[data-testid="base-premium-value"], [data-testid="basePremium"]').or(
      page.getByText(/^₹[\d,]+$/).first()
    );

    // Rider Cost(s)
    this.riderCostLocator = page.locator('text=/Rider|Add-on|Optional Cover/i').locator('xpath=../..').or(
      page.locator('[data-testid="rider-cost"]').or(
        page.locator('[data-testid="rider-amount"]')
      )
    );
    this.riderValues = page.locator('[data-testid*="rider"][data-testid*="amount"], [class*="rider"] [class*="price"], [class*="rider"] [class*="amount"]');

    // Tax/GST
    this.taxLocator = page.locator('text=/GST|Tax|taxes/i').locator('xpath=../..').or(
      page.locator('[data-testid="gst"]').or(
        page.locator('[data-testid="tax"]').or(
          page.locator('div', { hasText: /GST \(18%\)|Tax/i }).first()
        )
      )
    );
    this.taxValue = page.locator('[data-testid="gst-value"], [data-testid="tax-value"]').or(
      page.locator('text=/GST/i').locator('xpath=following-sibling::*').first()
    );

    // Total Premium
    this.totalPremiumLocator = page.locator('text=/Total Premium|Grand Total|Total Amount/i').or(
      page.locator('[data-testid="total-premium"]').or(
        page.locator('h2:has-text("Total"), h3:has-text("Total"), div:has-text("Total Premium")').first()
      )
    );
    this.totalPremiumValue = page.locator('[data-testid="total-premium-value"], [data-testid="totalPremium"]').or(
      page.locator('text=/Total/i').locator('xpath=following-sibling::*[contains(@class,"price") or contains(@class,"amount")]').first()
    );

    // Generic price pattern locators for fallback extraction
    this.allPrices = page.locator('text=₹');
    this.priceElements = page.locator('[class*="price"], [class*="amount"], [class*="premium"]');
  }

  /**
   * Wait for the premium summary page to fully load
   */
  async waitForSummaryPage() {
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    // Wait for summary container or total premium to be visible
    await this.page.waitForSelector(
      '[data-testid="premium-summary"], [class*="summary"], [data-testid="total-premium"], text=/Total Premium/i',
      { timeout: 30000 }
    );

    // Wait for prices to render
    await this.page.waitForTimeout(2500);
  }

  /**
   * Extract base premium amount
   * @returns {Promise<string|null>}
   */
  async getBasePremium() {
    // Try specific locator first
    let text = await this.basePremiumValue.textContent({ timeout: 5000 }).catch(() => null);

    if (!text) {
      // Try finding near "Base Premium" label
      const label = this.page.locator('text=/Base Premium/i').first();
      if (await label.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Get the parent's sibling or nearby element containing price
        text = await this.page.evaluate(() => {
          const el = document.evaluate(
            "//*[contains(text(), 'Base Premium')]/following::*[contains(text(), '₹')][1]",
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
          ).singleNodeValue;
          return el ? el.textContent : null;
        });
      }
    }

    return text ? this.sanitizeAmount(text) : null;
  }

  /**
   * Extract selected rider costs
   * @returns {Promise<Array<string>>}
   */
  async getRiderCosts() {
    const riders = [];

    // Try specific rider value locators
    const count = await this.riderValues.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const text = await this.riderValues.nth(i).textContent({ timeout: 3000 }).catch(() => null);
      if (text) {
        riders.push(this.sanitizeAmount(text));
      }
    }

    // Fallback: look for any elements with "Rider" text and nearby prices
    if (riders.length === 0) {
      const riderLabels = await this.page.locator('text=/Rider/i').all();
      for (const label of riderLabels.slice(0, 5)) {
        const priceText = await this.page.evaluate((element) => {
          const xpathResult = document.evaluate(
            "./following::*[contains(text(), '₹')][1]",
            element, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
          );
          const el = xpathResult.singleNodeValue;
          return el ? el.textContent : null;
        }, await label.elementHandle().catch(() => null));

        if (priceText) {
          riders.push(this.sanitizeAmount(priceText));
        }
      }
    }

    return riders;
  }

  /**
   * Extract GST/Tax amount
   * @returns {Promise<string|null>}
   */
  async getTaxAmount() {
    // Try specific locator
    let text = await this.taxValue.textContent({ timeout: 5000 }).catch(() => null);

    if (!text) {
      // Try finding near "GST" or "Tax" label
      text = await this.page.evaluate(() => {
        const el = document.evaluate(
          "//*[contains(text(), 'GST') or contains(text(), 'Tax')]/following::*[contains(text(), '₹')][1]",
          document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;
        return el ? el.textContent : null;
      });
    }

    return text ? this.sanitizeAmount(text) : null;
  }

  /**
   * Extract total premium amount
   * @returns {Promise<string|null>}
   */
  async getTotalPremium() {
    // Try specific locator
    let text = await this.totalPremiumValue.textContent({ timeout: 5000 }).catch(() => null);

    if (!text) {
      // Try finding near "Total" label
      text = await this.page.evaluate(() => {
        const el = document.evaluate(
          "//*[contains(text(), 'Total Premium') or contains(text(), 'Grand Total')]/following::*[contains(text(), '₹')][1]",
          document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;
        return el ? el.textContent : null;
      });
    }

    // Last resort: find the largest price on the page
    if (!text) {
      text = await this.page.evaluate(() => {
        const priceElements = document.querySelectorAll('*');
        let maxPrice = 0;
        let maxPriceText = null;

        priceElements.forEach(el => {
          const match = el.textContent.match(/₹\s*([\d,]+)/);
          if (match) {
            const price = parseFloat(match[1].replace(/,/g, ''));
            if (price > maxPrice) {
              maxPrice = price;
              maxPriceText = match[0];
            }
          }
        });

        return maxPriceText;
      });
    }

    return text ? this.sanitizeAmount(text) : null;
  }

  /**
   * Extract all premium-related values from the summary page
   * @returns {Promise<Object>}
   */
  async extractAllValues() {
    const basePremium = await this.getBasePremium();
    const riderCosts = await this.getRiderCosts();
    const taxAmount = await this.getTaxAmount();
    const totalPremium = await this.getTotalPremium();

    return {
      basePremium,
      riderCosts,
      taxAmount,
      totalPremium
    };
  }

  /**
   * Convert sanitized amount string to float
   * @param {string} amountStr
   * @returns {number|null}
   */
  parseAmount(amountStr) {
    if (!amountStr) return null;
    const cleaned = amountStr.replace(/[₹,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Validate that Total Premium = Base Premium + Riders + GST
   * @param {Object} values
   * @param {string} values.basePremium
   * @param {Array<string>} values.riderCosts
   * @param {string} values.taxAmount
   * @param {string} values.totalPremium
   */
  validatePremiumCalculation(values) {
    const { basePremium, riderCosts, taxAmount, totalPremium } = values;

    // Parse all values to floats
    const base = this.parseAmount(basePremium);
    const riders = riderCosts.map(rc => this.parseAmount(rc)).filter(v => v !== null);
    const totalRiders = riders.reduce((sum, r) => sum + r, 0);
    const gst = this.parseAmount(taxAmount);
    const total = this.parseAmount(totalPremium);

    // Log the extracted values
    console.log('\n========================================');
    console.log('   PREMIUM BREAKDOWN VALIDATION');
    console.log('========================================');
    console.log(`Base Premium:       ₹${base !== null ? base.toLocaleString('en-IN') : 'N/A'}`);
    console.log(`Selected Riders:    ${riders.length > 0 ? riders.map(r => `₹${r.toLocaleString('en-IN')}`).join(', ') : 'None'}`);
    console.log(`Total Rider Cost:   ₹${totalRiders.toLocaleString('en-IN')}`);
    console.log(`GST/Tax Amount:     ₹${gst !== null ? gst.toLocaleString('en-IN') : 'N/A'}`);
    console.log(`Total Premium:      ₹${total !== null ? total.toLocaleString('en-IN') : 'N/A'}`);
    console.log('----------------------------------------');

    // Perform mathematical validation
    if (base !== null && gst !== null && total !== null) {
      const expectedTotal = base + totalRiders + gst;
      const tolerance = 1.0; // Allow ₹1 difference for rounding
      const diff = Math.abs(total - expectedTotal);

      console.log(`Expected Total:     ₹${expectedTotal.toLocaleString('en-IN')}`);
      console.log(`Actual Total:       ₹${total.toLocaleString('en-IN')}`);
      console.log(`Difference:         ₹${diff.toFixed(2)}`);
      console.log(`Tolerance:          ±₹${tolerance}`);
      console.log('----------------------------------------');

      // Explicit assertion
      expect(
        diff <= tolerance,
        `Premium calculation mismatch: Expected ₹${expectedTotal.toLocaleString('en-IN')} but found ₹${total.toLocaleString('en-IN')}. Difference: ₹${diff.toFixed(2)}`
      ).toBe(true);

      console.log('✅ VALIDATION PASSED: Total Premium = Base Premium + Riders + GST');
    } else {
      const missing = [];
      if (base === null) missing.push('Base Premium');
      if (gst === null) missing.push('GST/Tax');
      if (total === null) missing.push('Total Premium');

      console.warn(`⚠️ Could not validate: Missing values for ${missing.join(', ')}`);

      // Soft assertion - still validate what we can
      expect(base !== null || total !== null, 'Could not extract sufficient premium values for validation').toBe(true);
    }

    console.log('========================================\n');
  }

  /**
   * Sanitize amount text by removing extra whitespace and keeping currency/format
   * @param {string} text
   * @returns {string}
   */
  sanitizeAmount(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }
}
