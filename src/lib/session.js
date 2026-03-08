export const USER_KEY = 'urbanflow_user'
export const OPERATOR_KEY = 'urbanflow_operator_user'
export const ACTIVE_ORDER_KEY = 'urbanflow_active_order_id'

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredOperator() {
  try {
    return JSON.parse(localStorage.getItem(OPERATOR_KEY) || 'null')
  } catch {
    return null
  }
}

export function setStoredOperator(operator) {
  localStorage.setItem(OPERATOR_KEY, JSON.stringify(operator))
}
