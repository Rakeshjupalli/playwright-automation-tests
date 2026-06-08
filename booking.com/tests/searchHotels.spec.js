import { test, expect } from '@playwright/test';
import { BookingSearchPage } from '../pages/BookingSearchPage.js';

test('Search Mumbai hotels on Booking.com', async ({ page }) => {
  const hotelsPage = new BookingSearchPage(page);

  // 1. Go to the site
  await hotelsPage.goto();

  // 2. Close the discount banner if it appears
  await hotelsPage.dismissPopup();

  // 3. Where are we going?
  await hotelsPage.enterDestination('mumbai');

  // 4. When?  Check-in 15 June, check-out 16 June
  await hotelsPage.pickDates('2026-06-15', '2026-06-16');

  // 5. Who?  2 adults, 1 room
  await hotelsPage.setGuests({ adults: 2, rooms: 1 });

  // 6. Search!
  await hotelsPage.search();

  // 7. Print the hotel names
  const hotels = await hotelsPage.listHotels(30);
  expect(hotels.length).toBeGreaterThan(0);

  console.log(`\nFound ${hotels.length} hotels in Mumbai:\n`);
  hotels.forEach((name, i) => console.log(`${i + 1}. ${name}`));
});
