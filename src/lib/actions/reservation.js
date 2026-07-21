// lib/actions/reservation.js
// Server Actions for table reservations
'use server'

import { createReservation } from '@/lib/services/reservations'

/**
 * Server Action — handles the book-table form submission
 */
export async function bookTableAction(prevStateOrFormData, maybeFormData) {
  const formData = maybeFormData ?? prevStateOrFormData
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    date: formData.get('date'),
    time: formData.get('time'),
    guests: Number(formData.get('guests')),
    requests: formData.get('requests') || '',
  }

  // Basic validation
  if (!data.name || !data.email || !data.phone || !data.date || !data.time) {
    return { success: false, error: 'Please fill in all required fields.' }
  }

  try {
    const reservation = await createReservation(data)
    return { success: true, reservationId: reservation.id }
  } catch (error) {
    console.error('bookTableAction error:', error)
    return { success: false, error: 'Failed to create reservation. Please try again.' }
  }
}
