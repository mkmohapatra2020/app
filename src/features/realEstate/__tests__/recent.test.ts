/** Session memory for bookings / OCR batches (the API has no list or detail endpoints for them). */
import { describe, expect, it } from 'vitest';
import { toBooking, toOcrBatch } from '../api/normalize.ts';
import { recentBatches, recentBooking, recentBookings, rememberBatch, rememberBooking } from '../utils/recent.ts';

describe('recent bookings and batches', () => {
  it('remembers a created booking with the details the form knew', () => {
    rememberBooking(toBooking({ id: 42, status: 'Pending' }), { customerName: 'Ramesh Sahoo', plotNumber: 'A-1', agreedValue: 1400000, bookingAmount: 50000 });
    expect(recentBooking(42)).toMatchObject({ id: 42, customerName: 'Ramesh Sahoo', plotNumber: 'A-1', agreedValue: 1400000, status: 'Pending' });
    // Newest first, no duplicates, nothing sensitive stored.
    rememberBooking(toBooking({ id: 43 }), { customerName: 'Sita' });
    rememberBooking(toBooking({ id: 42, status: 'Confirmed' }), { customerName: 'Ramesh Sahoo' });
    expect(recentBookings().map((b) => b.id)).toEqual([42, 43]);
    expect(JSON.stringify(sessionStorage)).not.toMatch(/aadhaar|pan|phone/i);
  });

  it('keeps it in sessionStorage only (cleared with the tab)', () => {
    rememberBatch(toOcrBatch({ id: 7, status: 'Parsed', fileName: 'page.jpg' }));
    expect(recentBatches()[0]).toMatchObject({ id: 7, status: 'Parsed', fileName: 'page.jpg' });
    expect(localStorage.getItem('wl-re-recent')).toBeNull();
    // A later status keeps the original file name.
    rememberBatch(toOcrBatch({ id: 7, status: 'Approved' }));
    expect(recentBatches()[0]).toMatchObject({ id: 7, status: 'Approved', fileName: 'page.jpg' });
  });

  it('ignores responses without an id', () => {
    rememberBooking(toBooking({}));
    rememberBatch(toOcrBatch({}));
    expect(recentBookings()).toHaveLength(0);
    expect(recentBatches()).toHaveLength(0);
  });
});
