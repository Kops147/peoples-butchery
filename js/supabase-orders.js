import { supabase } from './supabase-config.js'

export async function saveOrderToSupabase({ userId, userEmail, items, subtotal, deliveryFee, total, deliveryMethod, deliveryAddress }) {
  const { data, error } = await supabase.from('orders').insert({
    user_id: userId,
    user_email: userEmail,
    items,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    delivery_method: deliveryMethod,
    delivery_address: deliveryAddress,
    status: 'pending'
  }).select().single()
  if (error) throw error
  return data.id
}

export async function getUserOrdersFromSupabase(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapOrder)
}

function mapOrder(o) {
  return {
    ...o,
    userId: o.user_id,
    userEmail: o.user_email,
    deliveryMethod: o.delivery_method,
    deliveryAddress: o.delivery_address,
    deliveryFee: o.delivery_fee,
    createdAt: o.created_at
  }
}
