export class BookingSearchPage {
  constructor(page) {
    this.page = page;
  }

  /** Open Booking.com and wait for the page to fully load */
  async goto() {
    await this.page.goto('https://www.booking.com/');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
  }

  /** Close the "sign in for 10% off" banner if it pops up */
  async dismissPopup() {
    await this.page
      .locator('[aria-label="Dismiss sign-in info."]')
      .click({ timeout: 3000 })
      .catch(() => {});
  }

  /** Type a city into the destination box and pick the first suggestion */
  async enterDestination(city) {
    await this.page.locator('[data-testid="destination-container"]').click();
    await this.page.keyboard.type(city);
    await this.page.waitForTimeout(1000);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
  }

  /**
   * Pick two dates on the calendar.
   *
   * @param {string} checkIn  – ISO date, e.g. '2026-06-15'
   * @param {string} checkOut – ISO date, e.g. '2026-06-16'
   */
  async pickDates(checkIn, checkOut) {
    // Turn "2026-06-15" into the exact aria-label Booking.com uses:
    //   "Mo 15 June 2026"
    const toLabel = (iso) => {
      const d = new Date(iso);
      const shortDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      const longMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return `${shortDays[d.getDay()]} ${d.getDate()} ${longMonths[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Open the calendar and give it time to render
    await this.page.locator('[data-testid="searchbox-dates-container"]').click();
    await this.page.waitForTimeout(1000);

    // Scope the search to the calendar popup
    const cal = this.page.locator('[data-testid="searchbox-datepicker-calendar"]');
    const scope = (await cal.count() > 0) ? cal : this.page;

    // Click the date span — the click bubbles up to its parent button/cell
    await scope.locator(`span[aria-label="${toLabel(checkIn)}"]`).click();
    await this.page.waitForTimeout(300);
    await scope.locator(`span[aria-label="${toLabel(checkOut)}"]`).click();
  }

  /**
   * Set how many guests and rooms.
   * Booking.com hides the real <input> elements behind styled buttons,
   * so we update the inputs directly with JavaScript.
   */
  async setGuests({ adults = 2, children = 0, rooms = 1 } = {}) {
    await this.page.locator('[data-testid="occupancy-config"]').click();
    await this.page.waitForTimeout(500);

    await this.page.evaluate(({ a, c, r }) => {
      const set = (idPart, value) => {
        const el = document.querySelector(`[id*="${idPart}"]`);
        if (el) {
          el.value = String(value);
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      set('group_adults', a);
      set('group_children', c);
      set('no_rooms', r);
    }, { a: adults, c: children, r: rooms });

    await this.page.keyboard.press('Escape');
  }

  /** Hit the Search button and wait for the results page */
  async search() {
    await this.page.locator('button[type="submit"]').first().click();
    await this.page.waitForURL(/searchresults/, { timeout: 30000 });
    await this.page.waitForTimeout(2000);
  }

  /**
   * Collect hotel names from the results page.
   * Scrolls to the bottom repeatedly to trigger lazy-loaded cards
   * until we hit the limit or no new cards appear.
   */
  async listHotels(limit = 30) {
    const cards = this.page.locator('[data-testid="property-card"]');

    // Keep scrolling until we have enough cards or nothing new loads
    let prev = 0;
    let curr = await cards.count();
    while (curr < limit && curr > prev) {
      prev = curr;
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(1500);
      curr = await cards.count();
    }

    const names = [];
    const total = await cards.count();
    for (let i = 0; i < Math.min(total, limit); i++) {
      const title = await cards.nth(i).locator('[data-testid="title"]').textContent();
      names.push(title.trim());
    }
    return names;
  }
}
