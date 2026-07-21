"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Archive, Edit3, Film, Play, Plus, Search, Trash2, Upload, Video, X } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import AdminToast from "@/app/admin/_components/AdminToast"
import PaginationControls from "@/app/components/shared/PaginationControls"
import { CardGridSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const ITEMS_PER_PAGE = 6
const COMPRESSION_THRESHOLD = 8 * 1024 * 1024
const MAX_SOURCE_SIZE = 100 * 1024 * 1024
const MAX_UPLOAD_SIZE = 15 * 1024 * 1024
const statusOptions = ["PUBLISHED", "DRAFT", "ARCHIVED"]
const statusVariant = { PUBLISHED: "success", DRAFT: "warning", ARCHIVED: "secondary" }

async function compressVideo(file, onProgress) {
  if (file.size <= COMPRESSION_THRESHOLD) return file

  const captureStream = HTMLVideoElement.prototype.captureStream
  const mimeTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
  const mimeType = typeof MediaRecorder !== "undefined"
    ? mimeTypes.find((type) => MediaRecorder.isTypeSupported(type))
    : null

  if (!captureStream || !mimeType) {
    if (file.size <= MAX_UPLOAD_SIZE) return file
    throw new Error("This browser cannot compress the selected video. Please use Chrome or Edge.")
  }

  const video = document.createElement("video")
  const sourceUrl = URL.createObjectURL(file)
  let stream

  try {
    video.src = sourceUrl
    video.preload = "auto"
    video.muted = true
    video.playsInline = true

    await new Promise((resolve, reject) => {
      video.addEventListener("loadeddata", resolve, { once: true })
      video.addEventListener("error", () => reject(new Error("Could not read the selected video.")), { once: true })
      video.load()
    })

    stream = video.captureStream()
    const chunks = []
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1_200_000,
      audioBitsPerSecond: 96_000,
    })

    const result = new Promise((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      })
      recorder.addEventListener("error", () => reject(new Error("Video compression failed.")), { once: true })
      recorder.addEventListener("stop", () => resolve(new Blob(chunks, { type: "video/webm" })), { once: true })
    })

    video.addEventListener("timeupdate", () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return
      onProgress(Math.min(99, Math.round((video.currentTime / video.duration) * 100)))
    })
    video.addEventListener("ended", () => {
      if (recorder.state !== "inactive") recorder.stop()
    }, { once: true })

    recorder.start(1000)
    await video.play()
    const blob = await result
    onProgress(100)

    if (blob.size > 0 && blob.size < file.size && blob.size <= MAX_UPLOAD_SIZE) {
      const baseName = file.name.replace(/\.[^.]+$/, "") || "video"
      return new File([blob], `${baseName}-compressed.webm`, { type: "video/webm" })
    }

    if (file.size <= MAX_UPLOAD_SIZE) return file
    throw new Error("The compressed video is still larger than 15MB. Please shorten the video.")
  } catch (error) {
    if (file.size <= MAX_UPLOAD_SIZE) return file
    throw error
  } finally {
    video.pause()
    stream?.getTracks().forEach((track) => track.stop())
    video.removeAttribute("src")
    URL.revokeObjectURL(sourceUrl)
  }
}

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const firstError = payload.errors ? Object.values(payload.errors)[0] : null
    throw new Error(firstError || payload.error || "Request failed.")
  }
  return payload
}

export default function VideosManager() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingLabel, setSavingLabel] = useState("Saving...")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)
  const toastIdRef = useRef(0)

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }

  const loadVideos = async () => {
    setLoading(true)
    try {
      const payload = await fetch("/api/admin/videos?limit=100").then(readApi)
      setVideos(payload.data)
    } catch (error) {
      showToast(error.message || "Could not load videos.", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetch("/api/admin/videos?limit=100")
      .then(readApi)
      .then((payload) => {
        if (active) setVideos(payload.data)
      })
      .catch((error) => {
        if (!active) return
        toastIdRef.current += 1
        setToast({ id: toastIdRef.current, message: error.message || "Could not load videos.", tone: "error" })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredVideos = useMemo(() => {
    const search = query.trim().toLowerCase()
    return videos.filter((video) => {
      const matchesStatus = statusFilter === "ALL" || video.status === statusFilter
      const matchesSearch = !search
        || video.title.toLowerCase().includes(search)
        || video.description?.toLowerCase().includes(search)
      return matchesStatus && matchesSearch
    })
  }, [query, statusFilter, videos])

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageVideos = filteredVideos.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const handleSave = async (form, video) => {
    setSaving(true)
    let uploadedVideo = null

    try {
      if (form.file) {
        setSavingLabel("Preparing video...")
        const uploadFile = await compressVideo(form.file, (progress) => {
          setSavingLabel(`Compressing ${progress}%`)
        })
        const uploadBody = new FormData()
        uploadBody.append("file", uploadFile)
        setSavingLabel("Uploading...")
        uploadedVideo = await fetch("/api/admin/videos/uploads", {
          method: "POST",
          body: uploadBody,
        }).then(readApi).then((payload) => payload.data)
      }

      setSavingLabel("Saving...")
      const payload = await fetch(video ? `/api/admin/videos/${video.id}` : "/api/admin/videos", {
        method: video ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          status: form.status,
          videoUrl: uploadedVideo?.url || form.videoUrl,
          ...(uploadedVideo ? { asset: uploadedVideo } : {}),
        }),
      }).then(readApi)

      setVideos((previous) => {
        const next = video
          ? previous.map((entry) => (entry.id === payload.data.id ? payload.data : entry))
          : [payload.data, ...previous]
        return next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      })
      setPage(1)
      setModal(null)
      showToast(video ? "Video updated." : "Video published.")
    } catch (error) {
      if (uploadedVideo?.url) {
        await fetch("/api/admin/videos/uploads", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: uploadedVideo.url }),
        }).catch(() => null)
      }
      showToast(error.message || "Could not save video.", "error")
      throw error
    } finally {
      setSaving(false)
      setSavingLabel("Saving...")
    }
  }

  const handleDelete = async (video) => {
    setSaving(true)
    try {
      await fetch(`/api/admin/videos/${video.id}`, { method: "DELETE" }).then(readApi)
      setVideos((previous) => previous.filter((entry) => entry.id !== video.id))
      setModal(null)
      showToast("Video deleted.")
    } catch (error) {
      showToast(error.message || "Could not delete video.", "error")
    } finally {
      setSaving(false)
    }
  }

  const publishedCount = videos.filter((video) => video.status === "PUBLISHED").length
  const draftCount = videos.filter((video) => video.status === "DRAFT").length
  const archivedCount = videos.filter((video) => video.status === "ARCHIVED").length

  return (
    <AdminShell
      active="videos"
      eyebrow="Content studio"
      title="Video Specials"
      description="Manage dish videos and promotional clips shown on the homepage."
      action={<Button onClick={() => setModal({ type: "create" })} disabled={saving}><Plus className="size-4" />Add video</Button>}
    >
      <AdminToast key={toast?.id} message={toast?.message} tone={toast?.tone} onDismiss={() => setToast(null)} />

      <div className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Video metrics">
          <MetricCard label="All videos" value={videos.length} detail="Stored in the database" icon={Video} />
          <MetricCard label="Published" value={publishedCount} detail="Visible in active content" icon={Play} />
          <MetricCard label="Drafts" value={draftCount} detail="Waiting for publication" icon={Film} />
          <MetricCard label="Archived" value={archivedCount} detail="Removed from rotation" icon={Archive} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Videos</h2>
              <p className="text-sm text-[#756D62]">{filteredVideos.length} matching clips</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B1E1E] sm:w-64"
                  placeholder="Search videos"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
                className="h-9 rounded-md border border-[#E4DAC9] bg-white px-3 text-sm outline-none focus:border-[#8B1E1E]"
              >
                <option value="ALL">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
              <Button variant="outline" onClick={loadVideos} disabled={loading}>Refresh</Button>
            </div>
          </div>

          {loading ? (
            <CardGridSkeleton count={ITEMS_PER_PAGE} />
          ) : pageVideos.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {pageVideos.map((video) => (
                <article key={video.id} className="overflow-hidden rounded-lg border border-[#E4DAC9] bg-white shadow-xs">
                  <div className="relative aspect-video overflow-hidden bg-[#E8DFC8]">
                    <video src={video.videoUrl} muted playsInline preload="metadata" className="size-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex size-11 items-center justify-center rounded-full bg-white/90 text-[#8B1E1E] shadow-lg"
                        aria-label={`Play ${video.title}`}
                      >
                        <Play className="ml-0.5 size-5" fill="currentColor" />
                      </a>
                    </div>
                    <Badge variant={statusVariant[video.status] || "secondary"} className="absolute right-3 top-3">{formatStatus(video.status)}</Badge>
                  </div>
                  <div className="space-y-4 p-4">
                    <div>
                      <h3 className="truncate font-semibold text-[#2B2B2B]">{video.title}</h3>
                      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-[#756D62]">{video.description || "No description"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => setModal({ type: "edit", video })}><Edit3 className="size-4" />Edit</Button>
                      <Button variant="destructive" onClick={() => setModal({ type: "delete", video })}><Trash2 className="size-4" />Delete</Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState onCreate={() => setModal({ type: "create" })} hasVideos={videos.length > 0} />
          )}

          <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </section>
      </div>

      {modal?.type === "create" ? (
        <Modal title="Add video" onClose={() => setModal(null)}>
          <VideoForm saving={saving} savingLabel={savingLabel} onCancel={() => setModal(null)} onSave={(form) => handleSave(form)} />
        </Modal>
      ) : null}

      {modal?.type === "edit" ? (
        <Modal title="Edit video" onClose={() => setModal(null)}>
          <VideoForm video={modal.video} saving={saving} savingLabel={savingLabel} onCancel={() => setModal(null)} onSave={(form) => handleSave(form, modal.video)} />
        </Modal>
      ) : null}

      {modal?.type === "delete" ? (
        <Modal title="Delete video?" onClose={() => setModal(null)}>
          <CardContent className="space-y-5 pt-5">
            <p className="text-sm text-[#756D62]">
              This permanently removes <strong className="text-[#2B2B2B]">{modal.video.title}</strong> and its managed video file.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(modal.video)} disabled={saving}>
                <Trash2 className="size-4" />{saving ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </CardContent>
        </Modal>
      ) : null}
    </AdminShell>
  )
}

function VideoForm({ video, saving, savingLabel, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: video?.title || "",
    description: video?.description || "",
    videoUrl: video?.videoUrl || "",
    status: video?.status || "PUBLISHED",
  })
  const [file, setFile] = useState(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState("")
  const [error, setError] = useState("")

  useEffect(() => () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
  }, [localPreviewUrl])

  const update = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setError("")
  }

  const chooseFile = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(selected.type)) {
      setError("Please choose an MP4, MOV, or WebM video.")
      event.target.value = ""
      return
    }
    if (selected.size > MAX_SOURCE_SIZE) {
      setError("Source video must be 100MB or smaller.")
      event.target.value = ""
      return
    }
    setLocalPreviewUrl(URL.createObjectURL(selected))
    setFile(selected)
    setError("")
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!file && !form.videoUrl.trim()) {
      setError("Choose a video file or enter a video URL.")
      return
    }

    try {
      await onSave({
        ...form,
        file,
        title: form.title.trim(),
        description: form.description.trim(),
        videoUrl: form.videoUrl.trim(),
      })
    } catch (saveError) {
      setError(saveError.message || "Could not save video.")
    }
  }

  return (
    <CardContent className="pt-5">
      <form className="space-y-4" onSubmit={submit}>
        <FormField label="Video file">
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#D4A017]/70 bg-[#FAF7F0] px-4 py-4 text-center hover:bg-[#F6F1E8]">
            <Upload className="mb-2 size-6 text-[#8B1E1E]" />
            <span className="text-sm font-semibold">{file?.name || video?.asset?.fileName || "Choose MP4, MOV, or WebM"}</span>
            <span className="mt-1 text-xs text-[#756D62]">Source up to 100MB; large files are compressed before upload</span>
            <input className="sr-only" type="file" accept="video/mp4,video/quicktime,video/webm" onChange={chooseFile} />
          </label>
        </FormField>

        {localPreviewUrl || form.videoUrl.trim() ? (
          <div className="overflow-hidden rounded-lg border border-[#E4DAC9] bg-black">
            <video
              key={localPreviewUrl || form.videoUrl.trim()}
              src={localPreviewUrl || form.videoUrl.trim()}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full object-contain"
            />
          </div>
        ) : null}

        <FormField label="Video URL">
          <input value={form.videoUrl} onChange={(event) => update("videoUrl", event.target.value)} className={fieldClassName} placeholder="https://..." disabled={Boolean(file)} />
        </FormField>

        <FormField label="Title" required>
          <input value={form.title} onChange={(event) => update("title", event.target.value)} className={fieldClassName} required />
        </FormField>

        <FormField label="Description">
          <textarea rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} className={`${fieldClassName} min-h-24 resize-y`} />
        </FormField>

        <FormField label="Status">
          <select value={form.status} onChange={(event) => update("status", event.target.value)} className={fieldClassName}>
            {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </select>
        </FormField>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-[#E4DAC9] pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            <Upload className={`size-4 ${saving ? "animate-pulse" : ""}`} />
            {saving ? savingLabel : video ? "Save video" : "Publish video"}
          </Button>
        </div>
      </form>
    </CardContent>
  )
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <Card className="border-[#E4DAC9] bg-white">
      <CardHeader className="flex-row items-start justify-between pb-2">
        <div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 font-display text-3xl">{value}</CardTitle></div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#F6F1E8] text-[#8B1E1E]"><Icon className="size-5" /></div>
      </CardHeader>
      <CardContent><p className="text-sm text-[#756D62]">{detail}</p></CardContent>
    </Card>
  )
}

function EmptyState({ hasVideos, onCreate }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[#E4DAC9] bg-[#FDFAF4] p-6 text-center">
      <Film className="size-8 text-[#8B1E1E]" />
      <p className="mt-3 font-semibold">{hasVideos ? "No videos match your filters." : "No videos yet."}</p>
      {!hasVideos ? <Button className="mt-3" onClick={onCreate}><Plus className="size-4" />Add video</Button> : null}
    </div>
  )
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2B2B]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[calc(100svh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-[#E4DAC9] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4DAC9] bg-white px-5 py-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={`Close ${title}`}><X className="size-4" /></Button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({ children, label, required = false }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756D62]">{label}{required ? <span className="text-[#8B1E1E]"> *</span> : null}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

function formatStatus(status) {
  return status ? `${status.charAt(0)}${status.slice(1).toLowerCase()}` : "Unknown"
}

const fieldClassName = "w-full rounded-md border border-[#E4DAC9] bg-white px-3 py-2 text-sm text-[#2B2B2B] outline-none transition-colors placeholder:text-[#B4A99A] focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/10 disabled:bg-[#F6F1E8]"
