/* =============================================
   Firebase Order Handler
   Saves orders to Firestore
   ============================================= */

'use strict';

import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ── Save Order to Firestore ────────────────────
export async function saveOrderToFirebase(orderData) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in to place an order');
    }

    const order = {
      userId: user.uid,
      userEmail: user.email,
      items: orderData.items,
      subtotal: orderData.subtotal,
      deliveryFee: orderData.deliveryFee,
      total: orderData.total,
      deliveryMethod: orderData.deliveryMethod,
      deliveryAddress: orderData.deliveryAddress,
      deliveryCoordinates: orderData.deliveryCoordinates,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'orders'), order);
    console.log('Order saved to Firebase with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving order to Firebase:', error);
    throw error;
  }
}

// ── Get User Orders ────────────────────────────
export async function getUserOrders() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in');
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

// ── Get All Orders (Admin) ─────────────────────
export async function getAllOrders() {
  try {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return orders;
  } catch (error) {
    console.error('Error fetching all orders:', error);
    throw error;
  }
}

// ── Save User Profile ──────────────────────────
export async function saveUserProfile(userData) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in');
    }

    const profile = {
      userId: user.uid,
      email: user.email,
      displayName: userData.displayName,
      phone: userData.phone,
      address: userData.address,
      creditBalance: userData.creditBalance || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'users'), profile);
    console.log('User profile saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}
