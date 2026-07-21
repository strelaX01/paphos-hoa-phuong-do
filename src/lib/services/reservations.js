// lib/services/reservations.js
// Service layer for table reservations — ready for Supabase
// import { supabase } from './supabase'

/**
 * Create a new reservation
 * @param {{ name, email, phone, date, time, guests, requests }} data
 */
export async function createReservation(data) {
  // TODO: Uncomment when Supabase is configured
  // const { data: reservation, error } = await supabase
  //   .from('reservations')
  //   .insert([{ ...data, status: 'pending', created_at: new Date().toISOString() }])
  //   .select()
  //   .single()
  // if (error) throw error
  // return reservation

  // Placeholder
  console.log('createReservation (mock):', data)
  return { id: Date.now(), ...data, status: 'pending' }
}

/**
 * Fetch all reservations (admin)
 */
export async function getReservations() {
  // const { data, error } = await supabase
  //   .from('reservations')
  //   .select('*')
  //   .order('date', { ascending: true })
  // if (error) throw error
  // return data
  return []
}

/**
 * Update reservation status
 * @param {string} id
 * @param {'pending'|'confirmed'|'cancelled'} status
 */
export async function updateReservationStatus(id, status) {
  // const { error } = await supabase
  //   .from('reservations')
  //   .update({ status })
  //   .eq('id', id)
  // if (error) throw error
  console.log('updateReservationStatus (mock):', id, status)
}
