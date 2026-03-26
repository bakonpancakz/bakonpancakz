package routes

import (
	"bakonpancakz/homepage/include"
	"bytes"
	"compress/gzip"
	"crypto/md5"
	"fmt"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"strings"
	"sync"
	"text/template"
)

type HttpHandler func(w http.ResponseWriter, r *http.Request)

var hashTable sync.Map

type ServeTemplateInfo struct {
	FileSystem  fs.FS
	FilePaths   []string
	Filename    string
	Literals    map[string]any
	StatusCode  int
	ContentType string
}

func prepareStaticTemplate(info *ServeTemplateInfo, ds *[]byte, dc *[]byte, dh *string) error {

	// Render Document
	tmpl, err := template.ParseFS(info.FileSystem, info.FilePaths...)
	if err != nil {
		return err
	}
	var b bytes.Buffer
	if err := tmpl.ExecuteTemplate(&b, info.Filename, info.Literals); err != nil {
		return err
	}

	// Compress Document
	var c bytes.Buffer
	g := gzip.NewWriter(&c)
	g.Write(b.Bytes())
	g.Close()

	// Store Document
	*ds = b.Bytes()
	*dc = c.Bytes()
	*dh = fmt.Sprintf("%X", md5.Sum(b.Bytes()))

	return nil
}

func ServeStaticTemplate(info *ServeTemplateInfo) func(w http.ResponseWriter, r *http.Request) {

	// Defaults
	if info.StatusCode == 0 {
		info.StatusCode = http.StatusOK
	}
	if info.ContentType == "" {
		info.ContentType = "text/html"
	}
	for i, p := range info.FilePaths {
		info.FilePaths[i] = include.PreparePath(info.FileSystem, p)
	}

	// Render Document
	var (
		documentStandard []byte
		documentCompress []byte
		documentHash     string
	)
	if err := prepareStaticTemplate(info, &documentStandard, &documentCompress, &documentHash); err != nil {
		log.Fatalln("[routes/template] Cannot Prepare Template:", err)
	}

	// Serve Function
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if !include.Embedded {
			if err := prepareStaticTemplate(info, &documentStandard, &documentCompress, &documentHash); err != nil {
				log.Println("[routes/template] Refresh Error:", err)
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
		}

		// Check Browser Cache
		if r.Header.Get("If-None-Match") == documentHash {
			w.WriteHeader(http.StatusNotModified)
			return
		}

		// Send Document
		w.Header().Set("ETag", documentHash)
		w.Header().Set("Content-Type", info.ContentType)
		w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")
		if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			w.Header().Set("Content-Encoding", "gzip")
			w.Write(documentCompress)
		} else {
			w.Write(documentStandard)
		}
	}
}

func ServeStaticFile(filepath string) HttpHandler {
	var (
		fileHash string
		fileData []byte
		fileMime string
	)

	// Prepare File
	b, err := include.ReadFile(include.Public, filepath)
	if err != nil {
		log.Fatalln("[routes/static] Cannot Prepare File:", filepath, err)
	}
	fileMime = mime.TypeByExtension(path.Ext(filepath))
	fileHash = fmt.Sprintf("%X", md5.Sum(b))
	fileData = b

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if r.Header.Get("If-None-Match") == fileHash {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Add("ETag", fileHash)
		w.Header().Add("X-Robots-Tag", "noindex")
		w.Header().Add("Content-Type", fileMime)
		w.Header().Add("Cache-Control", "public, max-age=604800, immutable")
		w.Write(fileData)
	}
}

func ServePublicFile(w http.ResponseWriter, r *http.Request, filepath string) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Check Cache Hash
	if hash, ok := hashTable.Load(filepath); ok {
		if r.Header.Get("If-None-Match") == hash.(string) {
			w.WriteHeader(http.StatusNotModified)
			return
		}
	}

	// Read File Contents
	filedata, err := include.ReadFile(include.Public, filepath)
	if err != nil {
		if os.IsNotExist(err) {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		log.Println("[http] Read Asset Error:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Generate Cache Hash
	filehash := fmt.Sprintf("%X", md5.Sum(filedata))
	hashTable.Store(filepath, filehash)
	fileMime := mime.TypeByExtension(path.Ext(filepath))

	// Send Contents
	w.Header().Add("ETag", filehash)
	w.Header().Add("X-Robots-Tag", "noindex")
	w.Header().Add("Content-Type", fileMime)
	w.Header().Add("Cache-Control", "public, max-age=604800, immutable")

	if len(filedata) < (1<<20) &&
		!strings.Contains(fileMime, "image") &&
		!strings.Contains(fileMime, "audio") &&
		!strings.Contains(fileMime, "video") &&
		strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		w.Header().Set("Content-Encoding", "gzip")
		g := gzip.NewWriter(w)
		g.Write(filedata)
		g.Close()
	} else {
		w.Write(filedata)
	}
}
