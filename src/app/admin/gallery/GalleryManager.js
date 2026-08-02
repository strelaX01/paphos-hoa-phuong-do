"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import AdminToast from "@/app/admin/_components/AdminToast"
import { CardGridSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { dedupeClientRequest } from "@/lib/dedupeClientRequest"
import { Button } from "@/components/ui/button"

const MAX_SOURCE_SIZE = 20 * 1024 * 1024
const MAX_UPLOAD_SIZE = 3 * 1024 * 1024
const COMPRESSION_THRESHOLD = 500 * 1024
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || "Request failed.")
  return payload
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Could not compress image.")),
      "image/webp",
      quality
    )
  })
}

async function compressImage(file) {
  if (file.size <= COMPRESSION_THRESHOLD && file.type === "image/webp") return file
  if (typeof createImageBitmap !== "function") {
    if (file.size <= MAX_UPLOAD_SIZE) return file
    throw new Error("This browser cannot compress images. Please use Chrome or Edge.")
  }

  const bitmap = await createImageBitmap(file)
  const attempts = [
    { maxDimension: 1920, quality: 0.82 },
    { maxDimension: 1600, quality: 0.74 },
    { maxDimension: 1280, quality: 0.68 },
  ]
  let smallestBlob = null

  try {
    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.maxDimension / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext("2d", { alpha: false })
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await canvasToBlob(canvas, attempt.quality)
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob
      if (blob.size <= MAX_UPLOAD_SIZE) break
    }
  } finally {
    bitmap.close()
  }

  if (!smallestBlob || smallestBlob.size > MAX_UPLOAD_SIZE) {
    throw new Error(`${file.name} is still larger than 3MB after compression.`)
  }

  if (smallestBlob.size >= file.size && file.size <= MAX_UPLOAD_SIZE) return file
  const baseName = file.name.replace(/\.[^.]+$/, "") || "gallery-photo"
  return new File([smallestBlob], `${baseName}.webp`, { type: "image/webp" })
}

export default function GalleryManager() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadLabel, setUploadLabel] = useState("")
  const [previews, setPreviews] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [photoToDelete, setPhotoToDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const inputRef = useRef(null)
  const toastIdRef = useRef(0)

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }

  useEffect(() => {
    let active = true
    dedupeClientRequest("/api/admin/gallery", () => {
      return fetch("/api/admin/gallery").then(readApi)
    })
      .then((payload) => {
        if (active) setPhotos(payload.data)
      })
      .catch((error) => {
        if (active) showToast(error.message || "Could not load gallery.", "error")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""
    if (!files.length) return

    const invalid = files.find((file) => !allowedTypes.has(file.type) || file.size > MAX_SOURCE_SIZE)
    if (invalid) {
      showToast("Use JPG, PNG, or WebP images up to 20MB each.", "error")
      return
    }

    const nextPreviews = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))
    setPreviews(nextPreviews)
    setUploading(true)
    const uploadedPhotos = []

    try {
      for (let index = 0; index < files.length; index += 1) {
        setUploadLabel(`Compressing ${index + 1}/${files.length}`)
        const compressed = await compressImage(files[index])
        setUploadLabel(`Uploading ${index + 1}/${files.length}`)
        const formData = new FormData()
        formData.append("file", compressed)
        const upload = await fetch("/api/admin/gallery/uploads", { method: "POST", body: formData })
          .then(readApi)
          .then((payload) => payload.data)

        try {
          const photo = await fetch("/api/admin/gallery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ src: upload.url, asset: upload }),
          }).then(readApi).then((payload) => payload.data)
          uploadedPhotos.push(photo)
        } catch (error) {
          await fetch("/api/admin/gallery/uploads", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: upload.url }),
          }).catch(() => null)
          throw error
        }
      }

      setPhotos((previous) => [...uploadedPhotos.reverse(), ...previous])
      showToast(`${uploadedPhotos.length} photo${uploadedPhotos.length === 1 ? "" : "s"} uploaded.`)
    } catch (error) {
      if (uploadedPhotos.length) setPhotos((previous) => [...uploadedPhotos.reverse(), ...previous])
      showToast(error.message || "Could not upload photos.", "error")
    } finally {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
      setPreviews([])
      setUploading(false)
      setUploadLabel("")
    }
  }

  const handleDelete = async (photo) => {
    setDeletingId(photo.id)
    try {
      await fetch(`/api/admin/gallery/${photo.id}`, { method: "DELETE" }).then(readApi)
      setPhotos((previous) => previous.filter((entry) => entry.id !== photo.id))
      setPhotoToDelete(null)
      showToast("Photo deleted.")
    } catch (error) {
      showToast(error.message || "Could not delete photo.", "error")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AdminShell
      active="gallery"
      eyebrow="Content studio"
      title="Gallery"
      description="Upload and manage restaurant photos."
      action={(
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          <ImagePlus className="size-4" />Upload photos
        </Button>
      )}
    >
      <AdminToast key={toast?.id} message={toast?.message} tone={toast?.tone} onDismiss={() => setToast(null)} />
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleFiles} />

      <div className="space-y-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex min-h-32 w-full items-center justify-center border border-dashed border-[#D4A017]/70 bg-[#FDFAF4] p-6 text-center transition-colors hover:bg-[#F8F1E5] disabled:cursor-wait"
        >
          <span className="flex flex-col items-center">
            {uploading ? <LoaderCircle className="size-7 animate-spin text-[#8B1E1E]" /> : <Upload className="size-7 text-[#8B1E1E]" />}
            <span className="mt-3 font-semibold text-[#2B2B2B]">{uploading ? uploadLabel : "Choose gallery photos"}</span>
            <span className="mt-1 text-xs text-[#756D62]">JPG, PNG, or WebP up to 20MB each</span>
          </span>
        </button>

        {previews.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {previews.map((preview) => (
              <div key={preview.url} className="relative aspect-square overflow-hidden bg-[#E8DFC8] opacity-70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt="Upload preview" className="size-full object-cover" />
                <LoaderCircle className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-white drop-shadow" />
              </div>
            ))}
          </div>
        ) : null}

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><h2 className="font-display text-xl font-semibold">Photos</h2><p className="text-sm text-[#756D62]">{photos.length} published photos</p></div>
          </div>

          {loading ? (
            <CardGridSkeleton count={6} />
          ) : photos.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => (
                <article key={photo.id} className="group relative aspect-square overflow-hidden bg-[#E8DFC8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} alt={photo.alt} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute right-2 top-2 shadow-lg"
                    onClick={() => setPhotoToDelete(photo)}
                    disabled={deletingId === photo.id}
                    aria-label="Delete photo"
                  >
                    {deletingId === photo.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-[#E4DAC9] bg-[#FDFAF4] p-6 text-center">
              <ImagePlus className="size-8 text-[#8B1E1E]" />
              <p className="mt-3 font-semibold">No gallery photos yet.</p>
            </div>
          )}
        </section>
      </div>

      {photoToDelete ? (
        <Modal title="Delete photo?" onClose={() => setPhotoToDelete(null)} locked={Boolean(deletingId)}>
          <div className="space-y-5 p-5">
            <p className="text-sm text-[#756D62]">This permanently removes the photo from the gallery and Storage.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPhotoToDelete(null)} disabled={Boolean(deletingId)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={() => handleDelete(photoToDelete)} disabled={Boolean(deletingId)}>
                {deletingId ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {deletingId ? "Deleting..." : "Delete photo"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </AdminShell>
  )
}

function Modal({ children, locked, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2B2B]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto border border-[#E4DAC9] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E4DAC9] px-5 py-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={locked} aria-label={`Close ${title}`}>
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
