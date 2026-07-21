"use client"

import { createContext, useContext } from "react"

const AdminSessionContext = createContext(null)

export function AdminSessionProvider({ account, children }) {
  return <AdminSessionContext.Provider value={account}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession() {
  const account = useContext(AdminSessionContext)
  if (!account) throw new Error("useAdminSession must be used inside AdminSessionProvider")
  return account
}
