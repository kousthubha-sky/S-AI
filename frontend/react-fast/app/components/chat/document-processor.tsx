import { useState } from "react"
import { Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"

interface DocumentProcessorProps {
  onDocumentProcessed: (documentId: string) => void;
}

export function DocumentProcessor({ onDocumentProcessed }: DocumentProcessorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [grade, setGrade] = useState("")
  const [subject, setSubject] = useState("")
  const [chapter, setChapter] = useState("")


  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || ''
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      if (!validTypes.includes(file.type)) {
        alert('Please upload only PDF or image files (JPG, PNG)')
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUploadDocument = async () => {
    if (!selectedFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    if (grade) formData.append('grade', grade)
    if (subject) formData.append('subject', subject)
    if (chapter) formData.append('chapter', chapter)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        onDocumentProcessed(data.document_id)
        setSelectedFile(null)
        setGrade("")
        setSubject("")
        setChapter("")
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.detail}`)
      }
    } catch (error) {
      alert('Upload failed. Please try again.')
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Document</CardTitle>
        <CardDescription>PDF or Image (Max 50MB)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,image/*"
            disabled={uploading}
          />
          {selectedFile && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              {selectedFile.type === 'application/pdf' ? (
                <FileText className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              <span className="truncate">{selectedFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="grade" className="text-xs">Grade/Class</Label>
            <Input
              id="grade"
              placeholder="e.g., 8"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={uploading}
            />
          </div>
          <div>
            <Label htmlFor="subject" className="text-xs">Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={uploading}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="chapter" className="text-xs">Chapter</Label>
          <Input
            id="chapter"
            placeholder="e.g., Chapter 3"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            disabled={uploading}
          />
        </div>

        <Button 
          onClick={handleUploadDocument} 
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Paperclip className="mr-2 h-4 w-4" />
              Upload & Process
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}