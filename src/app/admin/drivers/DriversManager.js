"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Copy, KeyRound, LoaderCircle, LockKeyhole, Plus, Search, ShieldCheck, Trash2, UserRound, X } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import AdminToast from "@/app/admin/_components/AdminToast"
import { CardGridSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const statusVariant = { ACTIVE: "success", INACTIVE: "secondary" }

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const firstError = payload.errors ? Object.values(payload.errors)[0] : null
    throw new Error(firstError || payload.error || "Request failed.")
  }
  return payload
}

export default function DriversManager() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [busyId, setBusyId] = useState(null)
  const [modal, setModal] = useState(null)
  const [credential, setCredential] = useState(null)
  const [toast, setToast] = useState(null)
  const toastIdRef = useRef(0)

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }

  useEffect(() => {
    let active = true
    fetch("/api/admin/drivers")
      .then(readApi)
      .then((payload) => { if (active) setDrivers(payload.data) })
      .catch((error) => { if (active) showToast(error.message || "Could not load drivers.", "error") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filteredDrivers = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return drivers
    return drivers.filter((driver) =>
      driver.name.toLowerCase().includes(search)
      || driver.username.toLowerCase().includes(search)
      || driver.phone?.toLowerCase().includes(search)
    )
  }, [drivers, query])

  const handleCreate = async (form) => {
    setBusyId("create")
    try {
      const payload = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then(readApi)
      setDrivers((previous) => [payload.data, ...previous])
      setModal(null)
      setCredential({ name: payload.data.name, ...payload.credential, title: "Driver account created" })
      showToast("Driver account created.")
    } finally {
      setBusyId(null)
    }
  }

  const handleStatus = async (driver) => {
    setBusyId(driver.id)
    try {
      const payload = await fetch("/api/admin/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driver.id, status: driver.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
      }).then(readApi)
      setDrivers((previous) => previous.map((entry) => entry.id === driver.id ? payload.data : entry))
      showToast(payload.data.status === "ACTIVE" ? "Driver activated." : "Driver deactivated.")
    } catch (error) {
      showToast(error.message || "Could not update driver.", "error")
    } finally {
      setBusyId(null)
    }
  }

  const handleReset = async (driver) => {
    setBusyId(driver.id)
    try {
      const payload = await fetch("/api/admin/drivers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driver.id }),
      }).then(readApi)
      setDrivers((previous) => previous.map((entry) => entry.id === driver.id ? payload.data : entry))
      setModal(null)
      setCredential({ name: payload.data.name, ...payload.credential, title: "Temporary password generated" })
      showToast("Temporary password generated.")
    } catch (error) {
      showToast(error.message || "Could not reset password.", "error")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (driver) => {
    setBusyId(driver.id)
    try {
      await fetch("/api/admin/drivers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driver.id }),
      }).then(readApi)
      setDrivers((previous) => previous.filter((entry) => entry.id !== driver.id))
      setModal(null)
      showToast("Driver account deleted.")
    } catch (error) {
      showToast(error.message || "Could not delete driver.", "error")
    } finally {
      setBusyId(null)
    }
  }

  const activeCount = drivers.filter((driver) => driver.status === "ACTIVE").length
  const inactiveCount = drivers.length - activeCount
  const temporaryCount = drivers.filter((driver) => driver.hasTemporaryPassword).length

  return (
    <AdminShell
      active="drivers"
      eyebrow="Access control"
      title="Drivers"
      description="Create driver accounts and control access."
      action={<Button onClick={() => setModal({ type: "create" })}><Plus className="size-4" />Add driver</Button>}
    >
      <AdminToast key={toast?.id} message={toast?.message} tone={toast?.tone} onDismiss={() => setToast(null)} />

      <div className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Driver account metrics">
          <MetricCard label="Driver accounts" value={drivers.length} detail="Total accounts" icon={UserRound} />
          <MetricCard label="Active" value={activeCount} detail="Allowed to sign in" icon={CheckCircle2} />
          <MetricCard label="Inactive" value={inactiveCount} detail="Access disabled" icon={LockKeyhole} />
          <MetricCard label="Temporary access" value={temporaryCount} detail="Password change required" icon={KeyRound} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="font-display text-xl font-semibold">Driver accounts</h2><p className="text-sm text-[#756D62]">{filteredDrivers.length} matching accounts</p></div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B1E1E] sm:w-64" placeholder="Search drivers" />
            </div>
          </div>

          {loading ? (
            <CardGridSkeleton count={4} />
          ) : filteredDrivers.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredDrivers.map((driver) => (
                <article key={driver.id} className="border border-[#E4DAC9] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#F6F1E8] text-[#8B1E1E]"><UserRound className="size-5" /></div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#2B2B2B]">{driver.name}</p>
                        <p className="truncate text-xs text-[#756D62]">{driver.username}{driver.phone ? ` | ${driver.phone}` : ""}</p>
                      </div>
                    </div>
                    <Badge variant={statusVariant[driver.status] || "secondary"}>{formatStatus(driver.status)}</Badge>
                  </div>

                  <div className="mt-4 border-y border-[#EFE7DA] py-3 text-sm">
                    <div><p className="text-xs text-[#756D62]">Last login</p><p className="mt-1 font-medium">{formatDate(driver.lastLoginAt)}</p></div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setModal({ type: "reset", driver })} disabled={busyId === driver.id}><KeyRound className="size-4" />Reset</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatus(driver)} disabled={busyId === driver.id}>
                      {busyId === driver.id ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                      {driver.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="destructive" size="icon-sm" onClick={() => setModal({ type: "delete", driver })} disabled={busyId === driver.id} aria-label={`Delete ${driver.name}`}><Trash2 className="size-4" /></Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-[#E4DAC9] bg-[#FDFAF4] p-6 text-center"><UserRound className="size-8 text-[#8B1E1E]" /><p className="mt-3 font-semibold">No driver accounts found.</p></div>
          )}
        </section>
      </div>

      {modal?.type === "create" ? <Modal title="Create driver account" onClose={() => setModal(null)} locked={busyId === "create"}><DriverForm saving={busyId === "create"} onCancel={() => setModal(null)} onSave={handleCreate} /></Modal> : null}
      {modal?.type === "reset" ? <ConfirmModal title="Reset driver password?" driver={modal.driver} actionLabel="Generate password" icon={KeyRound} busy={busyId === modal.driver.id} onCancel={() => setModal(null)} onConfirm={() => handleReset(modal.driver)} /> : null}
      {modal?.type === "delete" ? <ConfirmModal title="Delete driver account?" driver={modal.driver} actionLabel="Delete account" destructive icon={Trash2} busy={busyId === modal.driver.id} onCancel={() => setModal(null)} onConfirm={() => handleDelete(modal.driver)} /> : null}
      {credential ? <CredentialModal credential={credential} onClose={() => setCredential(null)} /> : null}
    </AdminShell>
  )
}

function DriverForm({ saving, onCancel, onSave }) {
  const [form, setForm] = useState({ name: "", username: "", phone: "", status: "ACTIVE" })
  const [error, setError] = useState("")

  const submit = async (event) => {
    event.preventDefault()
    setError("")
    try {
      await onSave({ ...form, name: form.name.trim(), username: form.username.trim(), phone: form.phone.trim() })
    } catch (saveError) {
      setError(saveError.message || "Could not create driver.")
    }
  }

  const update = (field, value) => { setForm((previous) => ({ ...previous, [field]: value })); setError("") }

  return (
    <form className="space-y-4 p-5" onSubmit={submit}>
      <FormField label="Driver name"><input required value={form.name} onChange={(event) => update("name", event.target.value)} className={fieldClassName} /></FormField>
      <FormField label="Username"><input required value={form.username} onChange={(event) => update("username", event.target.value.toLowerCase())} className={fieldClassName} placeholder="minh.driver" /></FormField>
      <FormField label="Phone"><input value={form.phone} onChange={(event) => update("phone", event.target.value)} className={fieldClassName} placeholder="+357 96 123 456" /></FormField>
      <FormField label="Status"><select value={form.status} onChange={(event) => update("status", event.target.value)} className={fieldClassName}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></FormField>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2 border-t border-[#E4DAC9] pt-4"><Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{saving ? "Creating..." : "Create driver"}</Button></div>
    </form>
  )
}

function ConfirmModal({ actionLabel, busy, destructive = false, driver, icon: Icon, onCancel, onConfirm, title }) {
  return (
    <Modal title={title} onClose={onCancel} locked={busy}>
      <div className="space-y-5 p-5">
        <p className="text-sm text-[#756D62]">{destructive ? "This permanently deletes the driver account." : "A new temporary password will replace the previous one."}</p>
        <p className="font-semibold text-[#2B2B2B]">{driver.name} <span className="font-normal text-[#756D62]">({driver.username})</span></p>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}{busy ? "Please wait..." : actionLabel}</Button></div>
      </div>
    </Modal>
  )
}

function CredentialModal({ credential, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Username: ${credential.username}\nTemporary password: ${credential.temporaryPassword}`)
      setCopied(true)
    } catch { setCopied(false) }
  }

  return (
    <Modal title={credential.title} onClose={onClose}>
      <div className="space-y-4 p-5">
        <p className="font-semibold">{credential.name}</p>
        <div className="grid gap-3 sm:grid-cols-2"><CredentialValue label="Username" value={credential.username} /><CredentialValue label="Temporary password" value={credential.temporaryPassword} accent /></div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={copy}><Copy className="size-4" />{copied ? "Copied" : "Copy credentials"}</Button><Button onClick={onClose}>Done</Button></div>
      </div>
    </Modal>
  )
}

function CredentialValue({ accent = false, label, value }) {
  return <div className="border border-[#E4DAC9] p-4"><p className="text-xs font-semibold uppercase text-[#756D62]">{label}</p><p className={`mt-2 break-all font-mono text-sm font-semibold ${accent ? "text-[#8B1E1E]" : "text-[#2B2B2B]"}`}>{value}</p></div>
}

function MetricCard({ detail, icon: Icon, label, value }) {
  return <Card className="border-[#E4DAC9] bg-white"><CardHeader className="flex-row items-start justify-between pb-2"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 font-display text-3xl">{value}</CardTitle></div><div className="flex size-10 items-center justify-center rounded-md bg-[#F6F1E8] text-[#8B1E1E]"><Icon className="size-5" /></div></CardHeader><CardContent><p className="text-sm text-[#756D62]">{detail}</p></CardContent></Card>
}

function Modal({ children, locked = false, onClose, title }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2B2B]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[#E4DAC9] bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#E4DAC9] px-5 py-4"><h2 className="font-display text-xl font-semibold">{title}</h2><Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={locked} aria-label={`Close ${title}`}><X className="size-4" /></Button></div>{children}</div></div>
}

function FormField({ children, label }) {
  return <label className="block"><span className="text-xs font-semibold uppercase text-[#756D62]">{label}</span><span className="mt-1 block">{children}</span></label>
}

function formatStatus(status) { return status === "ACTIVE" ? "Active" : "Inactive" }
function formatDate(value) { return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never" }
const fieldClassName = "w-full rounded-md border border-[#E4DAC9] bg-white px-3 py-2 text-sm text-[#2B2B2B] outline-none focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/10"
