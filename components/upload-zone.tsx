'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onFileAccepted: (file: File) => void
  isProcessing?: boolean
}

const ACCEPTED_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/webm': ['.webm'],
  'audio/ogg': ['.ogg'],
}
const MAX_SIZE = 25 * 1024 * 1024 // 25MB (Groq limit)

export function UploadZone({ onFileAccepted, isProcessing = false }: UploadZoneProps) {
  const [fileName, setFileName] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        setFileName(acceptedFiles[0].name)
        onFileAccepted(acceptedFiles[0])
      }
    },
    [onFileAccepted]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    maxFiles: 1,
    disabled: isProcessing,
  })

  const rejection = fileRejections[0]?.errors[0]

  return (
    <div className="flex flex-col gap-2">
      <div
        {...getRootProps()}
        className={cn(
          'border border-dashed border-witness-border p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-witness-grey bg-white/[0.02]',
          isProcessing && 'opacity-50 cursor-not-allowed',
          fileName && !isProcessing && 'border-witness-red/60'
        )}
        aria-label="Audio file upload area"
      >
        <input {...getInputProps()} aria-label="Choose audio file" />
        <div className="font-serif text-2xl mb-3 text-witness-red">♪</div>
        {fileName ? (
          <>
            <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">AUDIO FILE LOADED</div>
            <div className="font-serif text-base">{fileName}</div>
          </>
        ) : (
          <>
            <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">
              {isDragActive ? 'DROP AUDIO FILE' : 'DRAG & DROP OR CLICK'}
            </div>
            <div className="text-xs text-witness-grey">MP3, WAV, M4A, WebM, OGG · Max 25MB</div>
          </>
        )}
      </div>
      {rejection && (
        <p className="text-xs text-red-400" role="alert">
          {rejection.code === 'file-too-large'
            ? 'File exceeds 25MB limit. Please compress the audio.'
            : rejection.code === 'file-invalid-type'
            ? 'Unsupported format. Please use MP3, WAV, M4A, WebM, or OGG.'
            : rejection.message}
        </p>
      )}
    </div>
  )
}
